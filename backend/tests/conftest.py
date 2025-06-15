# Configure logging first
import os
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import create_engine
import sys
import unittest.mock
from app.db.session import get_db
from app.core.security.clerk import ClerkTokenData
from app.core.security.dependencies import require_auth
from app.db.base_class import Base
import pytest_asyncio
import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from uuid import uuid4, UUID
import uuid
import logging
from fastapi import Request
from tests.mocks.mock_content_analysis import mock_content_analysis_service, mock_analyze_content_async

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# PATCH TEST SESSION GLOBALLY BEFORE ANY APP IMPORTS
# Import our test middlewares instead of the regular ones

# Import settings here to ensure environment variables are properly loaded

# For sync operations (testing only)
TEST_DATABASE_URL_SYNC = os.environ.get(
    "TEST_DATABASE_URL_SYNC",
    "postgresql://postgres:postgres@127.0.0.1/conversational_commerce_test"
)

# For async operations
TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@127.0.0.1/conversational_commerce_test"
)

# Print debug information
logger.info(f"Using sync DB URL: {TEST_DATABASE_URL_SYNC}")
logger.info(f"Using async DB URL: {TEST_DATABASE_URL}")

# Force use of 127.0.0.1 explicitly
FORCED_SYNC_URL = "postgresql://postgres:postgres@127.0.0.1/conversational_commerce_test"
FORCED_ASYNC_URL = "postgresql+asyncpg://postgres:postgres@127.0.0.1/conversational_commerce_test"

# Create both sync and async engines
try:
    logger.info("Attempting to create engines with configured URLs")
    logger.info(f"Sync URL: {TEST_DATABASE_URL_SYNC}")
    logger.info(f"Async URL: {TEST_DATABASE_URL}")

    sync_engine = create_engine(
        TEST_DATABASE_URL_SYNC,
        pool_size=5,
        max_overflow=10,
        pool_timeout=30,
        pool_recycle=1800
    )
    logger.info("Sync engine created successfully")

    async_engine = create_async_engine(
        TEST_DATABASE_URL,
        pool_size=5,
        max_overflow=10,
        pool_timeout=30,
        pool_recycle=1800
    )
    logger.info("Async engine created successfully")
except Exception as e:
    logger.error(f"Error creating engines with configured URLs: {e}")
    logger.info("Falling back to hardcoded 127.0.0.1 URLs")
    sync_engine = create_engine(
        FORCED_SYNC_URL,
        pool_size=5,
        max_overflow=10,
        pool_timeout=30,
        pool_recycle=1800
    )
    async_engine = create_async_engine(
        FORCED_ASYNC_URL,
        pool_size=5,
        max_overflow=10,
        pool_timeout=30,
        pool_recycle=1800
    )
    logger.info("Fallback engines created successfully")

# Set environment variable to indicate we're testing
os.environ['TESTING'] = 'true'

# Create session factories
TestingSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=sync_engine)
AsyncTestingSessionLocal = async_sessionmaker(
    async_engine, class_=AsyncSession, expire_on_commit=False)

# Override the session modules for testing
sys.modules['app.db.session'].SessionLocal = TestingSessionLocal
sys.modules['app.db.session'].engine = sync_engine

# Set environment variables for all tests
@pytest.fixture(scope="session", autouse=True)
def set_test_env_vars():
    """Set additional environment variables for tests"""
    logger.info("Setting test environment variables")
    os.environ["PYTEST_RUNNING"] = "1"
    yield
    logger.info("Clearing test environment variables")
    os.environ.pop("PYTEST_RUNNING", None)

# Debug fixture to run before any test to help diagnose issues
@pytest.fixture(scope="session", autouse=True)
def debug_test_environment():
    """Print debug information about the test environment"""
    logger.info("====== TEST ENVIRONMENT DEBUG INFO ======")
    logger.info(f"Python version: {sys.version}")
    logger.info(f"Test database: {TEST_DATABASE_URL}")
    logger.info(f"TESTING env var: {os.environ.get('TESTING')}")
    logger.info(f"Current working directory: {os.getcwd()}")
    logger.info(f"Path: {os.environ.get('PATH')}")
    
    # Checking for pytest deadlock culprits
    logger.info("==== Checking for potential deadlock sources =====")
    try:
        import psutil
        logger.info("Memory usage: {:.2f}MB".format(psutil.Process(os.getpid()).memory_info().rss / 1024 / 1024))
    except ImportError:
        logger.info("psutil not installed, skipping memory check")
        
    yield
    logger.info("====== TEST ENVIRONMENT DEBUG COMPLETE ======")

# Apply patches to avoid heavy model loading during tests
@pytest.fixture(scope="session", autouse=True)
def patch_content_analysis():
    """Patch content_analysis_service and analyze_content_async to use mocks.
    This prevents downloading heavy models during tests."""
    logger.info("Applying content analysis patches for tests")
    
    # Patch the content analysis service
    with unittest.mock.patch('app.core.content.content_analysis.content_analysis_service', 
                           mock_content_analysis_service):
        # Patch analyze_content_async
        with unittest.mock.patch('app.core.content.content_analysis.analyze_content_async', 
                               mock_analyze_content_async):
            # Patch nlp initialization
            with unittest.mock.patch('app.core.content.content_analysis.initialize_spacy', 
                                  return_value=unittest.mock.MagicMock()):
                # Patch any direct Detoxify imports
                with unittest.mock.patch('app.core.content.content_analysis.Detoxify', 
                                      unittest.mock.MagicMock()):
                    logger.info("Content analysis patches applied successfully")
                    yield
                    
    logger.info("Content analysis patches removed")


# Add the backend directory to Python path
backend_dir = str(Path(__file__).parent.parent)
sys.path.insert(0, backend_dir)

# Set testing environment variable
os.environ['TESTING'] = 'True'

# Test data


@pytest_asyncio.fixture(scope="function")
async def test_product(async_db_session, test_tenant, test_user):
    from app.models.product import Product
    from sqlalchemy import text, select
    # Remove any existing test products for idempotency
    await async_db_session.execute(text("DELETE FROM products WHERE name = 'Test Product'"))
    await async_db_session.commit()

    # Set the tenant context for this session if the GUC is available
    try:
        await async_db_session.execute(text(f"SET LOCAL my.tenant_id = '{test_tenant.id}'"))
    except Exception:
        pass  # Ignore if GUC not present in test DB

    product = Product(
        id=uuid4(),
        name="Test Product",
        description="A product for testing order creation.",
        price=1000,
        seller_id=test_user.id,
        tenant_id=test_tenant.id
    )
    async_db_session.add(product)
    await async_db_session.commit()

    # Use select to refresh the product
    stmt = select(Product).where(Product.id == product.id)
    result = await async_db_session.execute(stmt)
    product = result.scalar_one_or_none()

    return product

# Use a fixed UUID for consistent testing
# Consistent test UUID
TEST_USER_ID = UUID("00000000-0000-0000-0000-000000000001")
TEST_USER_EMAIL = "test@example.com"
# Consistent test tenant UUID
TEST_TENANT_ID = UUID("00000000-0000-0000-0000-000000000010")


@pytest.fixture(scope="session")
def db_engine():
    # Create test database tables
    Base.metadata.create_all(bind=sync_engine)
    yield sync_engine
    # Drop test database tables
    Base.metadata.drop_all(bind=sync_engine)


@pytest_asyncio.fixture(scope="session")
async def async_db_engine():
    # Create test database tables using sync engine (async engine can't create tables)
    Base.metadata.create_all(bind=sync_engine)
    yield async_engine
    # Tables are dropped by the sync fixture


@pytest.fixture(scope="function")
def db_session(db_engine):
    # Create a new database session for each test
    connection = db_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    # Clean up
    session.close()
    transaction.rollback()
    connection.close()


@pytest_asyncio.fixture(scope="function")
async def async_db_session(async_db_engine):
    logger.info("Creating async_db_session with simplified transaction management")
    
    # Create a connection and begin a transaction
    async with async_db_engine.connect() as conn:
        logger.info("DB Connection established")
        
        # Start a transaction that we control explicitly
        async with conn.begin() as trans:
            logger.info("Transaction started")
            
            # Create session with our connection
            session = AsyncTestingSessionLocal(bind=conn)
            logger.info("Session created with connection binding")
            
            try:
                # Configure session timezone
                from sqlalchemy import text
                await session.execute(text("SET TIME ZONE 'UTC'"))
                logger.info("Database timezone set to UTC")
                
                # Yield session for test use
                yield session
                
                # If test completes normally, flush changes before the transaction ends
                await session.flush()
                logger.info("Session flushed successfully after test completion")
                
            except Exception as e:
                logger.error(f"Error during test execution: {e}")
                import traceback
                logger.error(f"Error traceback: {traceback.format_exc()}")
                # Transaction will be rolled back by context manager
                raise
            finally:
                # Always close session explicitly
                await session.close()
                logger.info("Session closed properly")
    
    # Connection and transaction are automatically closed by context managers
    logger.info("async_db_session fixture completed successfully")


@pytest.fixture
def client() -> TestClient:
    """Create a test client for the app"""
    # Force test environment for safety
    os.environ['TESTING'] = 'true'
    os.environ['ENVIRONMENT'] = 'test'

    # Override database settings using environment variables for tests
    os.environ['POSTGRES_SERVER'] = '127.0.0.1'
    os.environ['POSTGRES_USER'] = 'postgres'
    os.environ['POSTGRES_PASSWORD'] = 'postgres'
    os.environ['POSTGRES_DB'] = 'conversational_commerce_test'

    # Create a clean app without problematic middlewares
    from fastapi import FastAPI
    from app.main import register_exception_handlers, StorefrontError, handle_storefront_error

    app = FastAPI()
    register_exception_handlers(app)
    app.add_exception_handler(StorefrontError, handle_storefront_error)

    # Override the get_db dependency to use our test session
    async def override_get_db():
        async with AsyncTestingSessionLocal() as session:
            try:
                yield session
            finally:
                await session.close()

    # Override the auth dependency for testing
    async def override_require_auth(request: Request):
        return ClerkTokenData(
            sub=str(TEST_USER_ID),
            email=TEST_USER_EMAIL,
            role="seller"
        )

    # Override dependencies
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[require_auth] = override_require_auth

    # Include API router
    from app.api.v1.api import api_router
    app.include_router(api_router, prefix="/api/v1")

    return TestClient(app)


@pytest.fixture(scope="function")
def auth_headers():
    # Create auth headers with test token and tenant ID
    return {
        "Authorization": "Bearer test_token",
        "X-Tenant-ID": str(TEST_TENANT_ID)
    }


@pytest.fixture(scope="function")
def test_tenant(db_session):
    """Create a test tenant for use throughout tests."""
    from app.models.tenant import Tenant

    # Check if the test tenant already exists
    test_tenant = db_session.query(Tenant).filter(
        Tenant.id == TEST_TENANT_ID).first()

    if not test_tenant:
        # Create a test tenant
        test_tenant = Tenant(
            id=TEST_TENANT_ID,
            name="Test Tenant",
            subdomain=f"test-{uuid.uuid4()}",
            is_active=True
        )
        db_session.add(test_tenant)
        db_session.commit()

    return test_tenant


@pytest_asyncio.fixture(scope="function")
async def test_user(async_db_session, test_tenant):
    """Create test users in the async database and ensure they exist throughout tests.

    This fixture creates two users with consistent UUIDs:
    1. Main test user: 00000000-0000-0000-0000-000000000001
    2. Other test user: 00000000-0000-0000-0000-000000000002

    The main test user is returned, but both are available in the database.
    """
    from app.models.user import User
    from app.models.tenant import Tenant
    from sqlalchemy import text
    # Remove all users for idempotency
    await async_db_session.execute(text("DELETE FROM users"))
    await async_db_session.commit()

    # Ensure tenant exists in async DB session
    tenant = await async_db_session.get(Tenant, test_tenant.id)
    if not tenant:
        # Create a new Tenant instance for this session with all required fields
        subdomain = getattr(test_tenant, 'subdomain', None) or 'testtenant'
        tenant = Tenant(id=test_tenant.id,
                        name=test_tenant.name, subdomain=subdomain)
        async_db_session.add(tenant)
        await async_db_session.commit()
        await async_db_session.refresh(tenant)

    test_user = User(
        id=UUID("00000000-0000-0000-0000-000000000001"),
        email=TEST_USER_EMAIL,
        is_seller=True,
        tenant_id=test_tenant.id
    )
    async_db_session.add(test_user)

    other_user = User(
        id=UUID("00000000-0000-0000-0000-000000000002"),
        email="other@example.com",
        is_seller=True,
        tenant_id=test_tenant.id
    )
    async_db_session.add(other_user)

    await async_db_session.commit()
    await async_db_session.refresh(test_user)
    await async_db_session.refresh(other_user)

    return test_user


@pytest.fixture
def other_auth_headers():
    return {"Authorization": "Bearer other_token"}
