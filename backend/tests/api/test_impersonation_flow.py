"""
End-to-end tests for the super admin impersonation flow.

This module provides test cases to validate the impersonation flow works correctly
from token generation to verification and session termination.
"""

import pytest
import uuid
from httpx import AsyncClient
from fastapi import status

from backend.app.core.config.settings import get_settings
from backend.app.services.admin.impersonation.service import ImpersonationService
from backend.app.models.tenant import Tenant


@pytest.mark.asyncio
async def test_impersonation_token_creation(
    client: AsyncClient,
    super_admin_token: str,
    test_tenant: Tenant,
    test_db
):
    """Test that a super admin can create an impersonation token."""
    # Arrange
    tenant_id = test_tenant.id
    headers = {"Authorization": f"Bearer {super_admin_token}"}

    # Act
    response = await client.post(
        f"/api/admin/impersonation/token/{tenant_id}",
        headers=headers
    )

    # Assert
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "token" in data
    assert "expires_in" in data
    assert "tenant" in data
    assert data["tenant"]["id"] == str(tenant_id)
    assert "impersonation_url" in data["tenant"]


@pytest.mark.asyncio
async def test_impersonation_token_verification(
    client: AsyncClient,
    super_admin_token: str,
    test_tenant: Tenant,
    test_db
):
    """Test that an impersonation token can be verified."""
    # Arrange
    tenant_id = test_tenant.id
    headers = {"Authorization": f"Bearer {super_admin_token}"}

    # Create token
    response = await client.post(
        f"/api/admin/impersonation/token/{tenant_id}",
        headers=headers
    )
    token = response.json()["token"]

    # Act - Verify token
    verify_response = await client.post(
        "/api/admin/impersonation/verify",
        json={"token": token}
    )

    # Assert
    assert verify_response.status_code == status.HTTP_200_OK
    data = verify_response.json()
    assert data["valid"] is True
    assert data["tenant_id"] == str(tenant_id)


@pytest.mark.asyncio
async def test_impersonation_token_end_session(
    client: AsyncClient,
    super_admin_token: str,
    test_tenant: Tenant,
    test_db
):
    """Test that an impersonation session can be ended."""
    # Arrange
    tenant_id = test_tenant.id
    headers = {"Authorization": f"Bearer {super_admin_token}"}

    # Create token
    response = await client.post(
        f"/api/admin/impersonation/token/{tenant_id}",
        headers=headers
    )
    token = response.json()["token"]

    # Act - End session
    end_response = await client.post(
        "/api/admin/impersonation/end",
        json={"token": token}
    )

    # Assert
    assert end_response.status_code == status.HTTP_200_OK
    data = end_response.json()
    assert "message" in data


@pytest.mark.asyncio
async def test_non_super_admin_cannot_impersonate(
    client: AsyncClient,
    admin_token: str,  # Regular admin, not super admin
    test_tenant: Tenant,
    test_db
):
    """Test that non-super admins cannot create impersonation tokens."""
    # Arrange
    tenant_id = test_tenant.id
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Act
    response = await client.post(
        f"/api/admin/impersonation/token/{tenant_id}",
        headers=headers
    )

    # Assert
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.asyncio
async def test_impersonation_token_invalid_tenant(
    client: AsyncClient,
    super_admin_token: str,
    test_db
):
    """Test that impersonation fails for non-existent tenants."""
    # Arrange
    non_existent_tenant_id = uuid.uuid4()
    headers = {"Authorization": f"Bearer {super_admin_token}"}

    # Act
    response = await client.post(
        f"/api/admin/impersonation/token/{non_existent_tenant_id}",
        headers=headers
    )

    # Assert
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.asyncio
async def test_impersonation_integration_flow(
    client: AsyncClient,
    super_admin_token: str,
    test_tenant: Tenant,
    test_db
):
    """Test the complete impersonation flow end-to-end."""
    # Arrange
    tenant_id = test_tenant.id
    headers = {"Authorization": f"Bearer {super_admin_token}"}
    settings = get_settings()

    # Step 1: Create impersonation token
    token_response = await client.post(
        f"/api/admin/impersonation/token/{tenant_id}",
        headers=headers
    )
    assert token_response.status_code == status.HTTP_200_OK
    token_data = token_response.json()
    token = token_data["token"]

    # Step 2: Verify the token
    verify_response = await client.post(
        "/api/admin/impersonation/verify",
        json={"token": token}
    )
    assert verify_response.status_code == status.HTTP_200_OK
    verify_data = verify_response.json()
    assert verify_data["valid"] is True

    # Step 3: Make a request as the impersonated tenant
    # This would typically be done via frontend with stored token
    # Here we're simulating the impersonation context

    # For the test, we manually create an impersonation service and verify the token
    impersonation_service = ImpersonationService(settings)
    payload = await impersonation_service.verify_impersonation_token(test_db, token=token)

    # Confirm token payload contains expected data
    assert payload["imp_admin"] is True
    assert payload["imp_tenant"] == str(tenant_id)

    # Step 4: End the impersonation session
    end_response = await client.post(
        "/api/admin/impersonation/end",
        json={"token": token}
    )
    assert end_response.status_code == status.HTTP_200_OK
