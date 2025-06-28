#!/usr/bin/env python
"""Manual test script for dashboard stats endpoint
This script allows us to test the dashboard stats endpoint without running pytest
"""
import asyncio
import sys
import os
from uuid import uuid4
import json

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import base models first to configure registry
from app.db.base_class import Base

# Import all models to ensure relationships are correctly registered
from app.models.tenant import Tenant
from app.models.user import User
from app.models.order import Order
from app.models.complaint import Complaint  # Import Complaint to resolve relationship
from app.models.product import Product  # Import Product as it's referenced by Order
from app.models.order_channel_meta import OrderChannelMeta  # Referenced by Order
from app.models.order_item import OrderItem  # Referenced by Order
from app.models.storefront import StorefrontConfig  # Import StorefrontConfig for Tenant relationship

# Import other required dependencies
from app.db.session import get_db
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import configure_mappers
from app.schemas.dashboard import DashboardStatsResponse

# Configure SQLAlchemy mappers to resolve any pending relationships
configure_mappers()


async def create_test_tenant(db: AsyncSession):
    """Create a test tenant for testing"""
    tenant = Tenant(
        id=uuid4(),
        name=f"Test Tenant {uuid4()}",
        subdomain=f"test-{uuid4()}",
        is_active=True
    )
    db.add(tenant)
    await db.commit()
    return tenant


async def create_test_user(db: AsyncSession, tenant_id: str):
    """Create a test user for testing"""
    user = User(
        id=uuid4(),
        email=f"test-{uuid4()}@example.com",
        tenant_id=tenant_id,
        is_active=True
    )
    db.add(user)
    await db.commit()
    return user


async def test_empty_tenant_stats():
    """Test that a new tenant with no data gets zero stats"""
    print("\n----- Testing Empty Tenant Stats -----")
    
    # Setup: Get DB and create a tenant with no data
    db = await anext(get_db())
    tenant = await create_test_tenant(db)
    tenant_id = str(tenant.id)
    print(f"Created test tenant: {tenant.name} (ID: {tenant_id})")
    
    # Test the stats endpoint logic directly
    from app.api.v1.endpoints.dashboard import get_dashboard_stats
    
    # Call the function directly
    stats = await get_dashboard_stats(tenant_id=tenant_id, db=db)
    
    # Verify stats are all zero
    print("Stats for empty tenant:")
    print(f"  Total Users: {stats.totalUsers}")
    print(f"  Total Orders: {stats.totalOrders}")
    print(f"  Total Revenue: {stats.totalRevenue}")
    
    assert stats.totalUsers == 0, "Expected 0 users for empty tenant"
    assert stats.totalOrders == 0, "Expected 0 orders for empty tenant"
    assert stats.totalRevenue == 0.0, "Expected 0.0 revenue for empty tenant"
    print("✅ All stats are zero for empty tenant as expected")


async def test_tenant_with_data():
    """Test that a tenant with data gets correct stats"""
    print("\n----- Testing Tenant With Data -----")
    
    # Setup: Get DB and create a tenant with data
    db = await anext(get_db())
    tenant = await create_test_tenant(db)
    tenant_id = str(tenant.id)
    print(f"Created test tenant: {tenant.name} (ID: {tenant_id})")
    
    # Create users
    user1 = await create_test_user(db, tenant_id)
    user2 = await create_test_user(db, tenant_id)
    print(f"Created users: {user1.email}, {user2.email}")
    
    # Create orders
    orders = [
        Order(
            tenant_id=tenant_id,
            user_id=str(user1.id),
            total_amount=100.50,
            status="completed"
        ),
        Order(
            tenant_id=tenant_id,
            user_id=str(user2.id),
            total_amount=200.25,
            status="completed"
        ),
        Order(
            tenant_id=tenant_id,
            user_id=str(user1.id),
            total_amount=50.00,
            status="cancelled"  # This should be excluded from revenue
        )
    ]
    db.add_all(orders)
    await db.commit()
    print("Created test orders")
    
    # Test the stats endpoint logic directly
    from app.api.v1.endpoints.dashboard import get_dashboard_stats
    
    # Call the function directly
    stats = await get_dashboard_stats(tenant_id=tenant_id, db=db)
    
    # Verify stats match expected values
    print("Stats for tenant with data:")
    print(f"  Total Users: {stats.totalUsers}")
    print(f"  Total Orders: {stats.totalOrders}")
    print(f"  Total Revenue: {stats.totalRevenue}")
    
    assert stats.totalUsers == 2, f"Expected 2 users, got {stats.totalUsers}"
    assert stats.totalOrders == 3, f"Expected 3 orders, got {stats.totalOrders}"
    assert stats.totalRevenue == 300.75, f"Expected 300.75 revenue, got {stats.totalRevenue}"
    print("✅ All stats match expected values")


async def test_tenant_isolation():
    """Test that tenants only see their own stats"""
    print("\n----- Testing Tenant Isolation -----")
    
    # Setup: Get DB and create two tenants
    db = await anext(get_db())
    tenant1 = await create_test_tenant(db)
    tenant2 = await create_test_tenant(db)
    tenant1_id = str(tenant1.id)
    tenant2_id = str(tenant2.id)
    print(f"Created test tenants: {tenant1.name}, {tenant2.name}")
    
    # Create user and order for tenant1
    user1 = await create_test_user(db, tenant1_id)
    order1 = Order(
        tenant_id=tenant1_id,
        user_id=str(user1.id),
        total_amount=100.00,
        status="completed"
    )
    db.add(order1)
    
    # Create user and order for tenant2
    user2 = await create_test_user(db, tenant2_id)
    order2 = Order(
        tenant_id=tenant2_id,
        user_id=str(user2.id),
        total_amount=200.00,
        status="completed"
    )
    db.add(order2)
    
    await db.commit()
    print("Created test users and orders for both tenants")
    
    # Test the stats endpoint logic directly
    from app.api.v1.endpoints.dashboard import get_dashboard_stats
    
    # Get stats for tenant1
    stats1 = await get_dashboard_stats(tenant_id=tenant1_id, db=db)
    print(f"Tenant 1 stats: Users={stats1.totalUsers}, Orders={stats1.totalOrders}, Revenue={stats1.totalRevenue}")
    
    # Get stats for tenant2
    stats2 = await get_dashboard_stats(tenant_id=tenant2_id, db=db)
    print(f"Tenant 2 stats: Users={stats2.totalUsers}, Orders={stats2.totalOrders}, Revenue={stats2.totalRevenue}")
    
    # Verify tenant isolation
    assert stats1.totalUsers == 1, f"Expected 1 user for tenant1, got {stats1.totalUsers}"
    assert stats1.totalOrders == 1, f"Expected 1 order for tenant1, got {stats1.totalOrders}"
    assert stats1.totalRevenue == 100.00, f"Expected 100.00 revenue for tenant1, got {stats1.totalRevenue}"
    
    assert stats2.totalUsers == 1, f"Expected 1 user for tenant2, got {stats2.totalUsers}"
    assert stats2.totalOrders == 1, f"Expected 1 order for tenant2, got {stats2.totalOrders}"
    assert stats2.totalRevenue == 200.00, f"Expected 200.00 revenue for tenant2, got {stats2.totalRevenue}"
    
    print("✅ Tenant isolation verified - each tenant only sees their own stats")


async def cleanup(db: AsyncSession, tenant_id: str):
    """Clean up test data"""
    # This is a helper method to clean up our test data if needed
    # In practice, this wouldn't be needed since PostgreSQL cascade deletes would handle it
    await db.execute(text(f"DELETE FROM orders WHERE tenant_id = '{tenant_id}'"))
    await db.execute(text(f"DELETE FROM users WHERE tenant_id = '{tenant_id}'"))
    await db.execute(text(f"DELETE FROM tenants WHERE id = '{tenant_id}'"))
    await db.commit()


async def main():
    """Run all tests"""
    print("=== Testing Dashboard Stats Endpoint ===")
    
    try:
        # Run tests
        await test_empty_tenant_stats()
        await test_tenant_with_data()
        await test_tenant_isolation()
        
        print("\n✅ All tests passed!")
        return 0
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
