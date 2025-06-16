import pytest
from httpx import AsyncClient
from uuid import uuid4


@pytest.mark.asyncio
async def test_onboarding_start_endpoint(async_client: AsyncClient):
    tenant_id = str(uuid4())
    payload = {
        "business_name": "Test Merchant",
        "subdomain": f"test{tenant_id[:6]}",
        "phone": "+1234567890"
    }
    response = await async_client.post("/api/v1/onboarding/start", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "tenant_id" in data


@pytest.mark.asyncio
async def test_onboarding_start_domain_conflict(async_client: AsyncClient):
    tenant_id1 = str(uuid4())
    tenant_id2 = str(uuid4())
    subdomain = f"conflict{tenant_id1[:6]}"
    payload1 = {"business_name": "Merchant1",
                "subdomain": subdomain, "phone": "+123"}
    payload2 = {"business_name": "Merchant2",
                "subdomain": subdomain, "phone": "+456"}
    await async_client.post("/api/v1/onboarding/start", json=payload1)
    response = await async_client.post("/api/v1/onboarding/start", json=payload2)
    assert response.status_code == 409 or response.status_code == 400

# TODO: Add tests for event logging and tenant isolation
