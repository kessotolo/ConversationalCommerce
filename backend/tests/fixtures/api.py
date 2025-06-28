"""
API testing fixtures for tests.
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, Generator, Optional, AsyncGenerator
from unittest import mock

import jwt
import pytest
from fastapi.testclient import TestClient
import httpx

from app.core.config import settings
from app.main import app

# Setup logging
logger = logging.getLogger(__name__)


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
def client() -> Generator:
    """
    Create a FastAPI test client for API testing.
    """
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="function")
async def async_client() -> AsyncGenerator:
    """Async HTTP client for endpoints that require async interaction."""
    async with httpx.AsyncClient(app=app, base_url="http://testserver") as ac:
        yield ac


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
