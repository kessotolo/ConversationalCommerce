import pytest
from httpx import AsyncClient
from uuid import uuid4
from unittest.mock import patch


@pytest.mark.asyncio
async def test_onboarding_start_endpoint(async_client: AsyncClient):
    tenant_id = str(uuid4())
    payload = {
        "business_name": "Test Merchant",
        "subdomain": f"test{tenant_id[:6]}",
        "phone": "+1234567890"
    }
    headers = {"Authorization": "Bearer test_token"}
    response = await async_client.post("/api/v1/onboarding/start", json=payload, headers=headers)
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
    headers = {"Authorization": "Bearer test_token"}
    await async_client.post("/api/v1/onboarding/start", json=payload1, headers=headers)
    response = await async_client.post("/api/v1/onboarding/start", json=payload2, headers=headers)
    assert response.status_code == 409 or response.status_code == 400


@pytest.mark.asyncio
async def test_submit_kyc_endpoint(async_client: AsyncClient):
    headers = {"Authorization": "Bearer test_token"}
    # Start onboarding to get tenant_id
    payload = {"business_name": "KYC Merchant",
               "subdomain": f"kyc{uuid4().hex[:6]}", "phone": "+123"}
    start_resp = await async_client.post("/api/v1/onboarding/start", json=payload, headers=headers)
    tenant_id = start_resp.json()["tenant_id"]
    kyc_payload = {"business_name": "KYC Merchant",
                   "id_number": "A1234567", "id_type": "passport"}
    response = await async_client.post("/api/v1/onboarding/kyc", json=kyc_payload, headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "pending" or response.json()[
        "status"] == "success"


@pytest.mark.asyncio
async def test_team_invite_endpoint(async_client: AsyncClient):
    headers = {"Authorization": "Bearer test_token"}
    payload = {"business_name": "Invite Merchant",
               "subdomain": f"invite{uuid4().hex[:6]}", "phone": "+123"}
    start_resp = await async_client.post("/api/v1/onboarding/start", json=payload, headers=headers)
    tenant_id = start_resp.json()["tenant_id"]
    invite_payload = {"invitee_phone": "+2345678901", "role": "manager"}
    response = await async_client.post("/api/v1/onboarding/team-invite", json=invite_payload, headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "success"


@pytest.mark.asyncio
async def test_upload_kyc_document_endpoint(async_client: AsyncClient):
    headers = {"Authorization": "Bearer test_token"}
    payload = {"business_name": "Doc Merchant",
               "subdomain": f"doc{uuid4().hex[:6]}", "phone": "+123"}
    start_resp = await async_client.post("/api/v1/onboarding/start", json=payload, headers=headers)
    tenant_id = start_resp.json()["tenant_id"]
    kyc_payload = {"business_name": "Doc Merchant",
                   "id_number": "A1234567", "id_type": "passport"}
    kyc_resp = await async_client.post("/api/v1/onboarding/kyc", json=kyc_payload, headers=headers)
    kyc_id = kyc_resp.json().get("kyc_id") or "dummy-kyc-id"
    # Mock Cloudinary upload
    with patch("backend.app.core.cloudinary.client.CloudinaryClient.upload_file") as mock_upload:
        mock_upload.return_value = {
            "secure_url": "https://cloudinary.com/fake-url.jpg"}
        files = {"file": ("test.jpg", b"fake image data", "image/jpeg")}
        response = await async_client.post(f"/api/v1/onboarding/upload-doc?kyc_id={kyc_id}", files=files, headers=headers)
        assert response.status_code == 200
        assert response.json()["status"] == "success"
        assert "file_url" in response.json()

# FUTURE: Add tests for event logging and tenant isolation. See issue #135 for tracking.
