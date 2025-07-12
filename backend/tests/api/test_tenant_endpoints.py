"""
Test tenant and user endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.main import create_app
from backend.app.models.user import User
from backend.app.models.tenant import Tenant


@pytest.fixture
def client():
    """Create test client."""
    app = create_app()
    return TestClient(app)


@pytest.mark.asyncio
async def test_create_tenant_endpoint(client, db_session: AsyncSession):
    """Test tenant creation endpoint."""
    # Create a test user first
    user = User(
        id="550e8400-e29b-41d4-a716-446655440000",
        email="test@example.com",
        is_seller=False
    )
    db_session.add(user)
    await db_session.commit()

    # Test data
    tenant_data = {
        "storeName": "Test Store",
        "businessName": "Test Business",
        "phoneNumber": "+254700123456",
        "whatsappNumber": "+254700123456",
        "storeEmail": "store@example.com",
        "category": "retail",
        "description": "A test store",
        "subdomain": "test-store",
        "userId": "550e8400-e29b-41d4-a716-446655440000"
    }

    # Make request
    response = client.post("/api/v1/tenants/", json=tenant_data)

    # Assert response
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Business"
    assert data["subdomain"] == "test-store"
    assert data["phone_number"] == "+254700123456"


@pytest.mark.asyncio
async def test_has_tenant_endpoint(client, db_session: AsyncSession):
    """Test has-tenant endpoint."""
    # Create a test user with tenant
    tenant = Tenant(
        id="550e8400-e29b-41d4-a716-446655440001",
        name="Test Business",
        subdomain="test-store",
        phone_number="+254700123456",
        email="store@example.com",
        is_active=True
    )
    db_session.add(tenant)
    await db_session.commit()

    user = User(
        id="550e8400-e29b-41d4-a716-446655440000",
        email="test@example.com",
        is_seller=True,
        tenant_id=tenant.id
    )
    db_session.add(user)
    await db_session.commit()

    # Test has tenant
    response = client.get(
        "/api/v1/users/has-tenant?user_id=550e8400-e29b-41d4-a716-446655440000")
    assert response.status_code == 200
    data = response.json()
    assert data["has_tenant"] is True
    assert data["tenant_id"] == str(tenant.id)
    assert data["tenant_name"] == "Test Business"

    # Test user without tenant
    user_no_tenant = User(
        id="550e8400-e29b-41d4-a716-446655440002",
        email="test2@example.com",
        is_seller=False
    )
    db_session.add(user_no_tenant)
    await db_session.commit()

    response = client.get(
        "/api/v1/users/has-tenant?user_id=550e8400-e29b-41d4-a716-446655440002")
    assert response.status_code == 200
    data = response.json()
    assert data["has_tenant"] is False
    assert data["tenant_id"] is None
    assert data["tenant_name"] is None
