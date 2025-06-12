# PATCH TEST SESSION GLOBALLY BEFORE ANY APP IMPORTS
import uuid
from typing import Any, Generator
from uuid import uuid4, UUID
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient
from pathlib import Path
import pytest
import pytest_asyncio
from app.db import session as db_session_module
from app.core.config.settings import Settings
# Import our test middlewares instead of the regular ones
from tests.test_middleware import TestRateLimitMiddleware, TestTenantMiddleware
from app.db.base_class import Base
from app.main import create_app
from app.core.security.dependencies import require_auth
from app.core.security.clerk import ClerkTokenData
from app.db.session import get_db, SessionLocal as AppSessionLocal
import sys
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import sessionmaker
import os

# Import settings here to ensure environment variables are properly loaded
from app.core.config.settings import get_settings

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
print(f"Using sync DB URL: {TEST_DATABASE_URL_SYNC}")
print(f"Using async DB URL: {TEST_DATABASE_URL}")

# Force use of 127.0.0.1 explicitly
FORCED_SYNC_URL = "postgresql://postgres:postgres@127.0.0.1/conversational_commerce_test"
FORCED_ASYNC_URL = "postgresql+asyncpg://postgres:postgres@127.0.0.1/conversational_commerce_test"

# Create both sync and async engines
try:
    print("Attempting to create engines with configured URLs")
    sync_engine = create_engine(TEST_DATABASE_URL_SYNC, pool_size=5, max_overflow=10)
    async_engine = create_async_engine(TEST_DATABASE_URL)
    print("Engines created successfully")
except Exception as e:
    print(f"Error creating engines with configured URLs: {e}")
    print("Falling back to hardcoded 127.0.0.1 URLs")
    sync_engine = create_engine(FORCED_SYNC_URL, pool_size=5, max_overflow=10)
    async_engine = create_async_engine(FORCED_ASYNC_URL)
    print("Fallback engines created successfully")

# Create session factories
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)
AsyncTestingSessionLocal = async_sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)

# Override the session modules for testing
sys.modules['app.db.session'].SessionLocal = TestingSessionLocal
sys.modules['app.db.session'].engine = sync_engine


# Add the backend directory to Python path
backend_dir = str(Path(__file__).parent.parent)
sys.path.insert(0, backend_dir)

# Set testing environment variable
os.environ['TESTING'] = 'True'

# Test data
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
    # Create a new async database session for each test
    async with async_db_engine.begin() as connection:
        session = AsyncTestingSessionLocal(bind=connection)
        yield session
        await session.close()


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

    # Print debug info to diagnose db connection issues
    print(f"TEST_DATABASE_URL_SYNC = {TEST_DATABASE_URL_SYNC}")
    print(f"TEST_DATABASE_URL = {TEST_DATABASE_URL}")
    print(f"POSTGRES_SERVER = {os.environ.get('POSTGRES_SERVER')}")
    # Print the actual DB URL being used by settings
    from app.core.config.settings import get_settings
    settings = get_settings()
    print(f"Database URL from settings: {settings.DATABASE_URL}")

    # Use test settings
    from app.core.config.test_settings import TestSettings
    test_settings = TestSettings()
    print(f"Test settings DB URL: {test_settings.DATABASE_URL}")
    
    # Create a clean app without problematic middlewares
    from fastapi import FastAPI
    from app.main import register_exception_handlers, StorefrontError, handle_storefront_error
    
    app = FastAPI(
        title="Test API",
        description="Test version of API",
        debug=True
    )
    
    # Register exception handlers
    register_exception_handlers(app)
    app.add_exception_handler(StorefrontError, handle_storefront_error)
    
    # Add CORS middleware
    from fastapi.middleware.cors import CORSMiddleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Add only test middlewares
    app.add_middleware(TestRateLimitMiddleware)
    app.add_middleware(TestTenantMiddleware)
    
    # Import API router
    from app.api.v1.api import api_router
    app.include_router(api_router, prefix="/api/v1")

    # Override the get_db dependency
    async def override_get_db():
        try:
            db = AsyncTestingSessionLocal()
            yield db
        finally:
            await db.close()

    # Override the require_auth dependency to handle different tokens
    from fastapi import Request
    from app.core.security.clerk import verify_clerk_token

    async def override_require_auth(request: Request):
        # Extract the token from the Authorization header
        auth_header = request.headers.get("Authorization", "")
        if not auth_header or not auth_header.startswith("Bearer "):
            # Use the default test user if no token provided
            return ClerkTokenData(sub=str(TEST_USER_ID), email=TEST_USER_EMAIL)

        # Extract the token
        token = auth_header.replace("Bearer ", "")

        # Use the real verification function to determine which user to return
        # This will correctly handle test_token and other_token
        return verify_clerk_token(token)

    app.dependency_overrides[require_auth] = override_require_auth
    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    # Clean up
    app.dependency_overrides.clear()


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


@pytest.fixture(scope="function")
def test_user(db_session, test_tenant):
    """Create test users in the database and ensure they exist throughout tests.

    This fixture creates two users with consistent UUIDs:
    1. Main test user: 00000000-0000-0000-0000-000000000001
    2. Other test user: 00000000-0000-0000-0000-000000000002

    The main test user is returned, but both are available in the database.
    """
    from app.models.user import User
    from app.core.security.password import get_password_hash

    # Force-delete any existing users first to avoid conflicts
    db_session.query(User).filter(User.id.in_([TEST_USER_ID, UUID(
        "00000000-0000-0000-0000-000000000002")])).delete(synchronize_session=False)
    db_session.commit()

    # Create the primary test user
    test_user = User(
        id=TEST_USER_ID,
        email=TEST_USER_EMAIL,
        is_seller=True
    )
    db_session.add(test_user)

    # Create the secondary test user
    other_user = User(
        id=UUID("00000000-0000-0000-0000-000000000002"),
        email="other@example.com",
        is_seller=True
    )
    db_session.add(other_user)

    # Commit to ensure they're in the database
    db_session.commit()
    db_session.refresh(test_user)
    db_session.refresh(other_user)

    return test_user


@pytest.fixture
def other_auth_headers():
    return {"Authorization": "Bearer other_token"}
