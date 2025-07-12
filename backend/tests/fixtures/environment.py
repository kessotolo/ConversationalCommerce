"""
Environment and test data fixtures for tests.
"""
import logging
import os
import sys
import uuid
from datetime import datetime, timezone

import pytest

# Setup logging
logger = logging.getLogger(__name__)

# Debug fixture to run before any test to help diagnose issues


@pytest.fixture(scope="session", autouse=True)
def debug_test_environment():
    """Print debug information about the test environment"""
    logger.info("====== TEST ENVIRONMENT DEBUG INFO ======")
    logger.info(f"Python version: {sys.version}")
    logger.info(
        f"Test database: {os.environ.get('TEST_DATABASE_URL', 'Not set')}")
    logger.info(f"TESTING env var: {os.environ.get('TESTING', 'Not set')}")
    logger.info(f"Current working directory: {os.getcwd()}")
    logger.info(f"Path: {os.environ.get('PATH')}")

    # Checking for pytest deadlock culprits
    logger.info("==== Checking for potential deadlock sources =====")
    try:
        import psutil

        logger.info(
            "Memory usage: {:.2f}MB".format(
                psutil.Process(os.getpid()).memory_info().rss / 1024 / 1024
            )
        )
    except ImportError:
        logger.info("psutil not installed, skipping memory check")

    yield
    logger.info("====== TEST ENVIRONMENT DEBUG COMPLETE ======")


@pytest.fixture(scope="function", autouse=True)
def set_test_environment():
    """Set environment variables for testing and clean up afterwards."""
    logger.info("Setting test environment variables")

    # Store original environment variables to restore later
    old_env = {}
    for key in ["TESTING", "ENV", "DEBUG"]:
        old_env[key] = os.environ.get(key)

    # Set test environment
    os.environ["TESTING"] = "true"
    os.environ["ENV"] = "test"
    os.environ["DEBUG"] = "true"

    # Redis test config
    os.environ["REDIS_DISABLED"] = "false"
    os.environ["REDIS_URL"] = "redis://localhost:6379/1"  # Use DB 1 for tests
    os.environ["REDIS_MAX_CONNECTIONS"] = "10"
    os.environ["REDIS_SOCKET_TIMEOUT"] = "5"
    os.environ["REDIS_CONNECT_TIMEOUT"] = "2"

    # Security config for tests
    os.environ["SECRET_KEY"] = "test_secret_key_for_jwt_tokens_in_tests_only"
    os.environ["ALGORITHM"] = "HS256"
    os.environ["CLERK_SECRET_KEY"] = "test_clerk_secret_key"
    os.environ["ADMIN_ENFORCE_IP_RESTRICTIONS"] = "false"
    os.environ["ADMIN_REQUIRE_2FA"] = "false"
    os.environ["WEBHOOK_SECRET_KEY"] = "test_webhook_secret"

    yield

    # Restore original environment
    logger.info("Clearing test environment variables")
    for key, value in old_env.items():
        if value is None:
            os.environ.pop(key, None)
        else:
            os.environ[key] = value


@pytest.fixture(scope="function")
def test_tenant(db_session):
    """Create a test tenant in the database for testing."""
    logger.info("[DEBUG] Entering test_tenant fixture")

    from backend.app.models.tenant import Tenant

    # Create a new tenant with random name to ensure isolation
    tenant_uuid = uuid.uuid4()
    tenant_id = str(tenant_uuid)[:8]  # Short ID for naming only
    tenant = Tenant(
        id=str(tenant_uuid),  # Use full UUID string format
        name=f"Test Tenant {tenant_id}",
        subdomain=f"test-{tenant_id}",
        custom_domain=f"test-{tenant_id}.example.com",
        phone_number=f"+1555{tenant_id}",  # Required field per model
        is_verified=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(tenant)
    db_session.commit()
    db_session.refresh(tenant)

    logger.info(f"[DEBUG] Yielding test_tenant {tenant_id}")
    yield tenant


@pytest.fixture(scope="function")
def test_user(db_session, test_tenant):
    """Create a test user in the database for testing."""
    logger.info("[DEBUG] Entering test_user fixture")

    from backend.app.models.user import User

    # Create a new user with random email to ensure isolation
    user_uuid = uuid.uuid4()
    user_id = str(user_uuid)[:8]  # Short ID for naming only
    user = User(
        id=str(user_uuid),  # Use full UUID string format
        tenant_id=test_tenant.id,
        email=f"user-{user_id}@example.com",
        is_seller=True  # Set to True to allow product creation in tests
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    logger.info(f"[DEBUG] Yielding test_user {user_id}")
    yield user


@pytest.fixture(scope="function")
def test_admin_user(db_session, test_tenant):
    """Create a test admin user in the database for testing."""
    logger.info("[DEBUG] Entering test_admin_user fixture")

    from backend.app.models.user import User

    # Create a new admin user with random email to ensure isolation
    user_id = str(uuid.uuid4())[:8]
    user = User(
        id=user_id,
        tenant_id=test_tenant.id,
        email=f"admin-{user_id}@example.com",
        full_name=f"Admin User {user_id}",
        # Hashed "testpassword"
        password_hash="$2b$12$tVdm9Bq14UnmYIUK1Pi5a.C1nzBgeNG5AoPToVyMNqYB1.AOi/GKm",
        is_active=True,
        is_superuser=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    logger.info(f"[DEBUG] Yielding test_admin_user {user_id}")
    yield user
