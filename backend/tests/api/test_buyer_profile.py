import uuid

from app.models.customer import Customer
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from tests.fixtures.api import create_test_token


def test_get_profile(client: TestClient, db_session: Session, test_tenant):
    customer = Customer(id=uuid.uuid4(), name="Alice", email="alice@example.com")
    db_session.add(customer)
    db_session.commit()
    db_session.refresh(customer)

    token = create_test_token(subject=customer.id, tenant_id=test_tenant.id)
    headers = {"Authorization": f"Bearer {token}", "X-Tenant-ID": str(test_tenant.id)}

    resp = client.get("/api/v1/profile", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == str(customer.id)
    assert data["name"] == "Alice"


def test_update_profile(client: TestClient, db_session: Session, test_tenant):
    customer = Customer(id=uuid.uuid4(), name="Alice", email="alice@example.com")
    db_session.add(customer)
    db_session.commit()
    db_session.refresh(customer)

    token = create_test_token(subject=customer.id, tenant_id=test_tenant.id)
    headers = {"Authorization": f"Bearer {token}", "X-Tenant-ID": str(test_tenant.id)}

    resp = client.patch("/api/v1/profile", json={"name": "Bob"}, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Bob"
    db_session.refresh(customer)
    assert customer.name == "Bob"
