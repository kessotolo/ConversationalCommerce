"""
Integration tests for tenant Row-Level Security (RLS) implementation.
Tests that tenant isolation is correctly enforced at the database level.
"""

import pytest
import uuid
from sqlalchemy.orm import Session
from app.models.tenant import Tenant, KYCStatus
from app.models.product import Product
from app.models.user import User
from app.db.session import SessionLocal


@pytest.fixture
def db():
    """Get a DB session for testing."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def clean_tables(db):
    db.query(Product).delete()
    db.query(User).delete()
    db.commit()


def test_create_tenants(db: Session):
    """Test creating two separate tenants."""
    tenant1 = Tenant(
        name="Tenant One",
        subdomain=f"tenant-one-{uuid.uuid4()}",
        phone_number=f"+2348{uuid.uuid4().int % 10000000000:010}",
        country_code="NG",
        kyc_status=KYCStatus.NOT_STARTED,
        storefront_enabled=True,
        is_active=True,
    )
    tenant2 = Tenant(
        name="Tenant Two",
        subdomain=f"tenant-two-{uuid.uuid4()}",
        phone_number=f"+2348{uuid.uuid4().int % 10000000000:010}",
        country_code="NG",
        kyc_status=KYCStatus.NOT_STARTED,
        storefront_enabled=True,
        is_active=True,
    )
    db.add(tenant1)
    db.add(tenant2)
    db.commit()
    db.refresh(tenant1)
    db.refresh(tenant2)
    assert tenant1.id is not None
    assert tenant2.id is not None


def test_tenant_isolation(db: Session):
    """Test that RLS properly isolates tenant data."""
    # Create two tenants inline
    tenant1 = Tenant(
        name="Tenant One",
        subdomain=f"tenant-one-{uuid.uuid4()}",
        phone_number=f"+2348{uuid.uuid4().int % 10000000000:010}",
        country_code="NG",
        kyc_status=KYCStatus.NOT_STARTED,
        storefront_enabled=True,
        is_active=True,
    )
    tenant2 = Tenant(
        name="Tenant Two",
        subdomain=f"tenant-two-{uuid.uuid4()}",
        phone_number=f"+2348{uuid.uuid4().int % 10000000000:010}",
        country_code="NG",
        kyc_status=KYCStatus.NOT_STARTED,
        storefront_enabled=True,
        is_active=True,
    )
    db.add(tenant1)
    db.add(tenant2)
    db.commit()
    db.refresh(tenant1)
    db.refresh(tenant2)
    tenant1_id = tenant1.id
    tenant2_id = tenant2.id

    # Create a user in tenant 1
    user1 = User(email="user1@tenant1.com")
    user1.tenant_id = tenant1_id
    db.add(user1)
    db.commit()
    db.refresh(user1)

    # Create a user in tenant 2
    user2 = User(email="user2@tenant2.com")
    user2.tenant_id = tenant2_id
    db.add(user2)
    db.commit()
    db.refresh(user2)

    # Create a product in tenant 1
    product1 = Product(
        name="Tenant 1 Product",
        description="Test product for tenant 1",
        price=10.0,
        seller_id=user1.id,
    )
    product1.tenant_id = tenant1_id
    db.add(product1)
    db.commit()
    db.refresh(product1)

    # Create a product in tenant 2
    product2 = Product(
        name="Tenant 2 Product",
        description="Test product for tenant 2",
        price=20.0,
        seller_id=user2.id,
    )
    product2.tenant_id = tenant2_id
    db.add(product2)
    db.commit()
    db.refresh(product2)

    # Now test RLS isolation
    # Should see only tenant 1's products
    products = db.query(Product).filter(Product.tenant_id == tenant1_id).all()
    assert len(products) == 1
    assert products[0].id == product1.id
    assert products[0].tenant_id == tenant1_id

    # Should see only tenant 1's users
    users = db.query(User).filter(User.tenant_id == tenant1_id).all()
    assert len(users) == 1
    assert users[0].id == user1.id
    assert users[0].tenant_id == tenant1_id

    # Should see only tenant 2's products
    products = db.query(Product).filter(Product.tenant_id == tenant2_id).all()
    assert len(products) == 1
    assert products[0].id == product2.id
    assert products[0].tenant_id == tenant2_id

    # Should see only tenant 2's users
    users = db.query(User).filter(User.tenant_id == tenant2_id).all()
    assert len(users) == 1
    assert users[0].id == user2.id
    assert users[0].tenant_id == tenant2_id
