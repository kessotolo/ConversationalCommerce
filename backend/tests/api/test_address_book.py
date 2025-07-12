import uuid
import pytest
from httpx import AsyncClient

from backend.app.main import app
from backend.app.models.customer import Customer
from backend.app.models.tenant import Tenant
from tests.fixtures.api import create_test_token


@pytest.fixture
async def async_client():
    async with AsyncClient(app=app, base_url="http://testserver") as ac:
        yield ac


@pytest.fixture
def test_address_data():
    return {
        "street": "123 Test St",
        "city": "Testville",
        "state": "Test State",
        "postal_code": "12345",
        "country": "Kenya",
    }


@pytest.fixture
async def buyer_customer(async_db_session):
    customer = Customer(id=uuid.uuid4(), email="buyer@example.com")
    async_db_session.add(customer)
    await async_db_session.commit()
    await async_db_session.refresh(customer)
    return customer


@pytest.fixture
def buyer_auth_headers(buyer_customer, test_tenant):
    token = create_test_token(subject=str(buyer_customer.id), tenant_id=str(test_tenant.id))
    return {"Authorization": f"Bearer {token}", "X-Tenant-ID": str(test_tenant.id)}


@pytest.mark.asyncio
async def test_address_book_crud(async_client, buyer_auth_headers, test_address_data):
    # List addresses should be empty
    resp = await async_client.get("/api/v1/address-book/", headers=buyer_auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []

    # Create address
    resp = await async_client.post("/api/v1/address-book/", json=test_address_data, headers=buyer_auth_headers)
    assert resp.status_code == 201
    address = resp.json()
    address_id = address["id"]

    # Read address
    resp = await async_client.get(f"/api/v1/address-book/{address_id}", headers=buyer_auth_headers)
    assert resp.status_code == 200
    assert resp.json()["street"] == test_address_data["street"]

    # Update address
    resp = await async_client.patch(
        f"/api/v1/address-book/{address_id}",
        json={"city": "New City"},
        headers=buyer_auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["city"] == "New City"

    # Set default
    resp = await async_client.patch(f"/api/v1/address-book/{address_id}/default", headers=buyer_auth_headers)
    assert resp.status_code == 200
    assert resp.json()["is_default"] is True

    # Delete address
    resp = await async_client.delete(f"/api/v1/address-book/{address_id}", headers=buyer_auth_headers)
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_tenant_isolation(async_client, async_db_session, test_address_data, test_tenant):
    # Buyer from tenant1
    customer1 = Customer(id=uuid.uuid4(), email="buyer1@example.com")
    async_db_session.add(customer1)

    # Second tenant and buyer
    tenant2 = Tenant(id=uuid.uuid4(), name="Tenant 2", subdomain="tenant2")
    async_db_session.add(tenant2)
    await async_db_session.commit()
    await async_db_session.refresh(tenant2)

    customer2 = Customer(id=uuid.uuid4(), email="buyer2@example.com")
    async_db_session.add(customer2)
    await async_db_session.commit()

    token1 = create_test_token(subject=str(customer1.id), tenant_id=str(test_tenant.id))
    headers1 = {"Authorization": f"Bearer {token1}", "X-Tenant-ID": str(test_tenant.id)}

    token2 = create_test_token(subject=str(customer2.id), tenant_id=str(tenant2.id))
    headers2 = {"Authorization": f"Bearer {token2}", "X-Tenant-ID": str(tenant2.id)}

    # Buyer 1 creates address
    resp = await async_client.post("/api/v1/address-book/", json=test_address_data, headers=headers1)
    address_id = resp.json()["id"]

    # Buyer 2 attempts to access address from tenant1
    resp = await async_client.get(f"/api/v1/address-book/{address_id}", headers=headers2)
    assert resp.status_code in (403, 404)
