import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import uuid4

from app.models.order import Order
from app.models.user import User
from app.schemas.dashboard import DashboardStatsResponse


@pytest.mark.asyncio
async def test_get_stats_empty_tenant(client: AsyncClient, test_tenant, auth_headers):
    """Test that a new tenant with no data gets zero stats."""
    # We use the test_tenant fixture and auth_headers fixture from conftest.py
    
    # Call the stats endpoint
    response = await client.get("/api/v1/dashboard/stats", headers=auth_headers)
    
    # Verify response
    assert response.status_code == 200
    data = response.json()
    
    # Check that all stats are zero for a new tenant
    assert data["totalUsers"] == 0
    assert data["totalOrders"] == 0
    assert data["totalRevenue"] == 0.0
    
    # Validate against our schema
    stats = DashboardStatsResponse(**data)
    assert stats.totalUsers == 0
    assert stats.totalOrders == 0
    assert stats.totalRevenue == 0.0


@pytest.mark.asyncio
async def test_get_stats_with_data(client: AsyncClient, async_db_session: AsyncSession, test_tenant, test_user, auth_headers):
    """Test that a tenant with data gets correct stats."""
    # We use fixtures for tenant and user
    tenant_id = str(test_tenant.id)
    
    # Create a second test user for this tenant
    from app.models.user import User
    user2 = User(
        id=uuid4(),
        email="test2@example.com",
        tenant_id=tenant_id,
        is_active=True
    )
    async_db_session.add(user2)
    await async_db_session.commit()
    
    # Create test orders for this tenant
    order1 = Order(
        tenant_id=tenant_id,
        user_id=str(test_user.id),
        total_amount=100.50,
        status="completed"
    )
    order2 = Order(
        tenant_id=tenant_id,
        user_id=str(user2.id),
        total_amount=200.25,
        status="completed"
    )
    order3 = Order(
        tenant_id=tenant_id,
        user_id=str(test_user.id),
        total_amount=50.00,
        status="cancelled"  # This should be excluded from revenue
    )
    
    async_db_session.add_all([order1, order2, order3])
    await async_db_session.commit()
    
    # Call the stats endpoint
    response = await client.get("/api/v1/dashboard/stats", headers=auth_headers)
    
    # Verify response
    assert response.status_code == 200
    data = response.json()
    
    # Check that stats reflect the test data (2 users, 3 orders, but only 2 count for revenue)
    assert data["totalUsers"] == 2
    assert data["totalOrders"] == 3
    assert data["totalRevenue"] == 300.75  # Sum of non-cancelled orders
    
    # Validate against our schema
    stats = DashboardStatsResponse(**data)
    assert stats.totalUsers == 2
    assert stats.totalOrders == 3
    assert stats.totalRevenue == 300.75


@pytest.mark.asyncio
async def test_stats_tenant_isolation(client: AsyncClient, async_db_session: AsyncSession, test_tenant, test_user, auth_headers):
    """Test that tenants only see their own stats."""
    # Use the test_tenant fixture as tenant1
    tenant1 = test_tenant
    tenant1_id = str(tenant1.id)
    
    # Create a second test tenant
    from app.models.tenant import Tenant
    from uuid import uuid4
    tenant2 = Tenant(
        id=uuid4(),
        name="Test Tenant 2",
        subdomain=f"test-{uuid4()}",
        is_active=True
    )
    async_db_session.add(tenant2)
    await async_db_session.commit()
    tenant2_id = str(tenant2.id)
    
    # Create users and orders for tenant1 (use test_user fixture)
    order1 = Order(
        tenant_id=tenant1_id,
        user_id=str(test_user.id),
        total_amount=100.00,
        status="completed"
    )
    async_db_session.add(order1)
    
    # Create users and orders for tenant2
    user2 = User(
        id=uuid4(),
        email="tenant2user@example.com",
        tenant_id=tenant2_id,
        is_active=True
    )
    async_db_session.add(user2)
    await async_db_session.commit()
    
    order2 = Order(
        tenant_id=tenant2_id,
        user_id=str(user2.id),
        total_amount=200.00,
        status="completed"
    )
    async_db_session.add(order2)
    
    await async_db_session.commit()
    
    # Use existing tenant1 auth headers
    response1 = await client.get("/api/v1/dashboard/stats", headers=auth_headers)
    data1 = response1.json()
    
    # Create tenant2 auth headers
    auth_headers2 = {
        "Authorization": "Bearer test_token",
        "X-Tenant-ID": tenant2_id
    }
    response2 = await client.get("/api/v1/dashboard/stats", headers=auth_headers2)
    data2 = response2.json()
    
    # Verify tenant isolation
    assert data1["totalUsers"] == 1
    assert data1["totalOrders"] == 1
    assert data1["totalRevenue"] == 100.00
    
    assert data2["totalUsers"] == 1
    assert data2["totalOrders"] == 1
    assert data2["totalRevenue"] == 200.00
