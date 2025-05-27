"""
Integration tests for tenant Row-Level Security (RLS) implementation.
Tests that tenant isolation is correctly enforced at the database level.
"""
import pytest
import uuid
from sqlalchemy.orm import Session
from app.models.tenant import Tenant
from app.models.product import Product
from app.models.user import User
from app.db.session import SessionLocal, set_tenant_id

@pytest.fixture
def db():
    """Get a DB session for testing."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_create_tenants(db: Session):
    """Test creating two separate tenants."""
    tenant1 = Tenant(name="Tenant One")
    tenant2 = Tenant(name="Tenant Two")
    
    db.add(tenant1)
    db.add(tenant2)
    db.commit()
    
    db.refresh(tenant1)
    db.refresh(tenant2)
    
    assert tenant1.id is not None
    assert tenant2.id is not None
    
    return tenant1.id, tenant2.id

def test_tenant_isolation(db: Session):
    """Test that RLS properly isolates tenant data."""
    # Create two tenants
    tenant1_id, tenant2_id = test_create_tenants(db)
    
    # Create a user in tenant 1
    user1 = User(
        email="user1@tenant1.com",
        is_active=True,
        tenant_id=tenant1_id
    )
    db.add(user1)
    db.commit()
    db.refresh(user1)
    
    # Create a user in tenant 2
    user2 = User(
        email="user2@tenant2.com",
        is_active=True,
        tenant_id=tenant2_id
    )
    db.add(user2)
    db.commit()
    db.refresh(user2)
    
    # Create a product in tenant 1
    product1 = Product(
        name="Product in Tenant 1",
        description="This product belongs to tenant 1",
        price=100.0,
        seller_id=user1.id,
        tenant_id=tenant1_id,
        is_active=True,
        inventory_count=10
    )
    db.add(product1)
    db.commit()
    db.refresh(product1)
    
    # Create a product in tenant 2
    product2 = Product(
        name="Product in Tenant 2",
        description="This product belongs to tenant 2",
        price=200.0,
        seller_id=user2.id,
        tenant_id=tenant2_id,
        is_active=True,
        inventory_count=20
    )
    db.add(product2)
    db.commit()
    db.refresh(product2)
    
    # Now test RLS isolation
    
    # Set tenant context to tenant 1
    set_tenant_id(db, str(tenant1_id))
    
    # Should see only tenant 1's products
    products = db.query(Product).all()
    assert len(products) == 1
    assert products[0].id == product1.id
    assert products[0].tenant_id == tenant1_id
    
    # Should see only tenant 1's users
    users = db.query(User).all()
    assert len(users) == 1
    assert users[0].id == user1.id
    assert users[0].tenant_id == tenant1_id
    
    # Switch to tenant 2 context
    set_tenant_id(db, str(tenant2_id))
    
    # Should see only tenant 2's products
    products = db.query(Product).all()
    assert len(products) == 1
    assert products[0].id == product2.id
    assert products[0].tenant_id == tenant2_id
    
    # Should see only tenant 2's users
    users = db.query(User).all()
    assert len(users) == 1
    assert users[0].id == user2.id
    assert users[0].tenant_id == tenant2_id
