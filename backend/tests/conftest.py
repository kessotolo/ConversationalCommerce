from app.db.session import get_db, SessionLocal as AppSessionLocal
from app.core.security.clerk import ClerkTokenData
from app.core.security.dependencies import require_auth
from app.main import create_app
from app.db.base_class import Base
from app.core.middleware.rate_limit import RateLimitMiddleware
from app.core.config.settings import Settings
from app.db import session as db_session_module
import os
import sys
import pytest
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from uuid import uuid4, UUID

# Add the backend directory to Python path
backend_dir = str(Path(__file__).parent.parent)
sys.path.insert(0, backend_dir)

# Set testing environment variable
os.environ['TESTING'] = 'True'

# Test database URL - Use local PostgreSQL database for testing
TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql://postgres:postgres@localhost/conversational_commerce"
)

# Create test engine
engine = create_engine(
    TEST_DATABASE_URL,
    # Use a smaller pool size for tests
    pool_size=5,
    max_overflow=10
)

# Create test session
TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Test data
# Use a fixed UUID for consistent testing
TEST_USER_ID = UUID("00000000-0000-0000-0000-000000000001")  # Consistent test UUID
TEST_USER_EMAIL = "test@example.com"
TEST_TENANT_ID = UUID("00000000-0000-0000-0000-000000000010")  # Consistent test tenant UUID


@pytest.fixture(scope="session")
def db_engine():
    # Create test database tables
    Base.metadata.create_all(bind=engine)
    yield engine
    # Drop test database tables
    Base.metadata.drop_all(bind=engine)


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


@pytest.fixture(scope="function")
def client(db_session):
    # Create a new FastAPI application for each test
    app = create_app()
    
    # Patch the database session to use our test database
    original_session_local = db_session_module.SessionLocal
    original_engine = db_session_module.engine
    
    # Replace with our test versions
    db_session_module.SessionLocal = TestingSessionLocal
    db_session_module.engine = engine
    
    # Also force DATABASE_URL to use our test database in any new Settings instances
    os.environ['POSTGRES_SERVER'] = 'localhost'
    os.environ['POSTGRES_USER'] = 'postgres'
    os.environ['POSTGRES_PASSWORD'] = 'postgres'
    os.environ['POSTGRES_DB'] = 'conversational_commerce'

    # Add rate limiting middleware for tests
    app.add_middleware(RateLimitMiddleware)

    # Override the get_db dependency
    def override_get_db():
        try:
            yield db_session
        finally:
            db_session.close()

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
    
    # Restore original database connection
    db_session_module.SessionLocal = original_session_local
    db_session_module.engine = original_engine


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
    test_tenant = db_session.query(Tenant).filter(Tenant.id == TEST_TENANT_ID).first()
    
    if not test_tenant:
        # Create a test tenant
        test_tenant = Tenant(
            id=TEST_TENANT_ID,
            name="Test Tenant",
            subdomain="test",
            status="active"
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
    db_session.query(User).filter(User.id.in_([TEST_USER_ID, UUID("00000000-0000-0000-0000-000000000002")])).delete(synchronize_session=False)
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
