"""
API testing fixtures for tests.
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, Generator, Optional, Callable, AsyncGenerator
from unittest import mock

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession
import httpx

from app.core.config.settings import get_settings
from app.main import app
from app.db.async_session import get_async_session_local

# Setup logging
logger = logging.getLogger(__name__)

# Global variable to store test session for middleware access
_test_db_session = None

# Test session provider for middleware


async def get_test_async_session() -> AsyncGenerator[AsyncSession, None]:
    """Provide the test DB session to middleware during tests"""
    global _test_db_session
    if _test_db_session is not None:
        try:
            yield _test_db_session
        except Exception as e:
            logger.error(f"Error in get_test_async_session: {e}")
            raise
    else:
        # Fallback to regular session if not in test context
        logger.warning(
            "No test session available, falling back to regular session")
        session_factory = get_async_session_local()
        async with session_factory() as session:
            yield session


@pytest.fixture(scope="function", autouse=True)
def patch_settings():
    """
    Patch settings module with required test values.
    This ensures that settings.SECRET_KEY and other required attributes
    are available during tests.
    """
    test_settings = {
        "SECRET_KEY": "test_secret_key_for_jwt_tokens_in_tests_only",
        "ALGORITHM": "HS256",
    }

    # Apply patches to settings module
    with mock.patch.multiple(settings, **test_settings):
        yield


@pytest.fixture(scope="function")
def client(async_db_session) -> Generator:
    """
    Create a FastAPI test client for API testing.
    Override the get_db dependency to use our test session to ensure
    middleware can see rows created in test fixtures.
    Also patch get_async_session_local to ensure middleware uses the same session.
    """
    from app.api.deps import get_db
    from app.main import app as fastapi_app
    from app.db.async_session import get_async_session_local

    # In case app is wrapped with middleware, access the original FastAPI instance
    # This handles cases where app might be wrapped with SentryAsgiMiddleware
    original_app = getattr(fastapi_app, "app", fastapi_app)

    # Create dependency override to use our test session
    async def override_get_db():
        try:
            yield async_db_session
        except Exception as e:
            logger.error(f"Error in override_get_db: {e}")
            raise

    # Store the test session globally for middleware access
    global _test_db_session
    _test_db_session = async_db_session

    # Create a patched version of get_async_session_local that returns a factory yielding our test session
    original_get_async_session_local = get_async_session_local

    def patched_get_async_session_local():
        # Return a factory that will yield our test session
        async def factory():
            try:
                yield async_db_session
            except Exception as e:
                logger.error(f"Error in patched session factory: {e}")
                raise
        return factory

    # Apply the overrides
    original_app.dependency_overrides[get_db] = override_get_db

    # Patch the session factory used by middleware
    with mock.patch('app.db.async_session.get_async_session_local', patched_get_async_session_local):
        try:
            # Create and yield the client
            with TestClient(fastapi_app) as test_client:
                yield test_client
        finally:
            # Clean up the override after the test
            if get_db in original_app.dependency_overrides:
                del original_app.dependency_overrides[get_db]

    # Reset the global test session
    _test_db_session = None


@pytest.fixture(scope="function")
async def async_client(async_db_session) -> AsyncGenerator:
    """
    Create an async FastAPI test client for API testing.
    This is for tests that need to use await with the client.
    """
    from app.api.deps import get_db
    from app.main import app as fastapi_app
    from app.db.async_session import get_async_session_local
    import httpx

    # In case app is wrapped with middleware, access the original FastAPI instance
    original_app = getattr(fastapi_app, "app", fastapi_app)

    # Create dependency override to use our test session
    async def override_get_db():
        try:
            yield async_db_session
        except Exception as e:
            logger.error(f"Error in override_get_db: {e}")
            raise

    # Store the test session globally for middleware access
    global _test_db_session
    _test_db_session = async_db_session

    # Create a patched version of get_async_session_local that returns a factory yielding our test session
    original_get_async_session_local = get_async_session_local

    def patched_get_async_session_local():
        # Return a factory that will yield our test session
        async def factory():
            try:
                yield async_db_session
            except Exception as e:
                logger.error(f"Error in patched session factory: {e}")
                raise
        return factory

    # Apply the overrides
    original_app.dependency_overrides[get_db] = override_get_db

    # Patch the session factory used by middleware
    with mock.patch('app.db.async_session.get_async_session_local', patched_get_async_session_local):
        try:
            # Create and yield the async client
            async with httpx.AsyncClient(app=original_app, base_url="http://testserver") as test_client:
                yield test_client
        finally:
            # Clean up the override after the test
            if get_db in original_app.dependency_overrides:
                del original_app.dependency_overrides[get_db]

    # Reset the global test session
    _test_db_session = None


def create_test_token(
    subject: str,
    tenant_id: str,
    scopes: list = [],
    is_superuser: bool = False,
    expiration_minutes: int = 60,
) -> str:
    """
    Create a test JWT token with the specified subject and claims.

    Args:
        subject: User ID or subject for the token
        tenant_id: Tenant ID for the token
        scopes: List of permission scopes
        is_superuser: Whether the user is a superuser
        expiration_minutes: Expiration time in minutes

    Returns:
        JWT token string
    """
    expire = datetime.now(timezone.utc) + timedelta(minutes=expiration_minutes)

    # Convert any UUIDs to strings to ensure JSON serialization works
    def serialize_value(value):
        import uuid
        if isinstance(value, uuid.UUID):
            return str(value)
        return value

    # Ensure subject and tenant_id are strings
    subject_str = serialize_value(subject)
    tenant_id_str = serialize_value(tenant_id)

    to_encode = {
        "sub": subject_str,
        "tenant_id": tenant_id_str,
        "exp": expire,
        "scopes": scopes,
        "is_superuser": is_superuser,
        "type": "access",
    }

    # Use hardcoded test values instead of settings for tests
    test_secret_key = "test_secret_key_for_jwt_tokens_in_tests_only"
    test_algorithm = "HS256"

    encoded_jwt = jwt.encode(
        to_encode,
        test_secret_key,
        algorithm=test_algorithm
    )

    return encoded_jwt


@pytest.fixture(scope="function")
def auth_headers(test_user) -> Dict[str, str]:
    """
    Generate authentication headers for a regular user.

    Returns:
        A dict with the Authorization header and X-Tenant-ID header
    """
    token = create_test_token(
        subject=test_user.id,
        tenant_id=test_user.tenant_id,
        is_superuser=False,
    )

    # Convert any UUID to string to ensure it works correctly
    tenant_id_str = str(test_user.tenant_id) if test_user.tenant_id else ""

    return {
        "Authorization": f"Bearer {token}",
        "X-Tenant-ID": tenant_id_str
    }


@pytest.fixture(scope="function")
def admin_auth_headers(test_admin_user) -> Dict[str, str]:
    """
    Generate authentication headers for an admin user.

    Returns:
        A dict with the Authorization header containing a valid admin JWT
    """
    token = create_test_token(
        subject=test_admin_user.id,
        tenant_id=test_admin_user.tenant_id,
        is_superuser=True,
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def webhook_auth_headers() -> Dict[str, str]:
    """
    Generate authentication headers for webhook testing.

    Returns:
        A dict with the webhook authorization header
    """
    return {"X-Webhook-Auth": settings.WEBHOOK_SECRET_KEY}


@pytest.fixture(scope="function")
def test_idempotency_key() -> str:
    """
    Generate a unique idempotency key for testing idempotent endpoints.

    Returns:
        A unique idempotency key string
    """
    import uuid
    return f"test-idempotency-{uuid.uuid4()}"
