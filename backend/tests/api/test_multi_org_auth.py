"""
Test multi-organization authentication functionality.

This test suite verifies that the backend can properly handle
authentication from both seller and admin Clerk organizations.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.security.clerk_multi_org import MultiOrgClerkTokenData
from backend.app.models.admin.admin_user import AdminUser


class TestMultiOrgAuthentication:
    """Test multi-organization authentication."""

    @pytest.fixture(autouse=True)
    async def setup_ip_allowlist(self, setup_test_ip_allowlist):
        """Set up IP allowlist for all tests in this class."""
        yield

    @pytest.fixture(autouse=True)
    async def setup_test_admin_users(self, async_db_session: AsyncSession):
        """Set up test admin users in the database."""
        from backend.app.services.admin.admin_user.service import AdminUserService

        admin_service = AdminUserService()

        # Create admin user for admin_token
        await admin_service.create_admin_user_from_clerk(
            db=async_db_session,
            clerk_user_id="00000000-0000-0000-0000-000000000002",  # admin_token user ID
            email="admin@example.com",
            is_super_admin=False,
            clerk_organization_id="org_admin_test",
            clerk_organization_role="admin"
        )

        # Create super admin user for super_admin_token
        await admin_service.create_admin_user_from_clerk(
            db=async_db_session,
            clerk_user_id="00000000-0000-0000-0000-000000000003",  # super_admin_token user ID
            email="superadmin@enwhe.com",
            is_super_admin=True,
            clerk_organization_id="org_2zWGCeV8c2H56B4ZcK5QmDOv9vL",
            clerk_organization_role="super_admin"
        )

        await async_db_session.commit()
        yield

    def test_seller_token_authentication(self, client: TestClient):
        """Test authentication with seller organization token."""
        headers = {"Authorization": "Bearer test_token"}
        response = client.get("/api/admin/me", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert data["organization_source"] == "seller"
        assert "seller" in data["roles"]

    @pytest.mark.asyncio
    async def test_admin_token_authentication(self, async_client):
        """Test authentication with admin organization token."""
        import httpx

        headers = {"Authorization": "Bearer admin_token"}
        response = await async_client.get("/api/admin/me", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert data["organization_source"] == "admin"
        assert "admin" in data["roles"]
        assert "super_admin" in data["roles"]

    @pytest.mark.asyncio
    async def test_super_admin_token_authentication(self, async_client):
        """Test authentication with super admin token."""
        import httpx

        headers = {"Authorization": "Bearer super_admin_token"}
        response = await async_client.get(
            "/api/admin/super-admin/me", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert data["organization_source"] == "admin"
        assert "super_admin" in data["roles"]

    @pytest.mark.asyncio
    async def test_seller_admin_endpoint(self, async_client):
        """Test seller admin specific endpoint."""
        headers = {"Authorization": "Bearer test_token"}
        response = await async_client.get("/api/admin/seller/me", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert data["organization_source"] == "seller"

    @pytest.mark.asyncio
    async def test_admin_only_endpoint_with_seller(self, async_client):
        """Test admin-only endpoint with seller token (should fail)."""
        headers = {"Authorization": "Bearer test_token"}
        response = await async_client.get("/api/admin/admin-only", headers=headers)

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_admin_only_endpoint_with_admin(self, async_client):
        """Test admin-only endpoint with admin token (should succeed)."""
        headers = {"Authorization": "Bearer admin_token"}
        response = await async_client.get("/api/admin/admin-only", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert data["organization_source"] == "admin"

    @pytest.mark.asyncio
    async def test_super_admin_only_endpoint_with_admin(self, async_client):
        """Test super-admin-only endpoint with admin token (should succeed)."""
        headers = {"Authorization": "Bearer admin_token"}
        response = await async_client.get(
            "/api/admin/super-admin-only", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert data["organization_source"] == "admin"

    @pytest.mark.asyncio
    async def test_super_admin_only_endpoint_with_seller(self, async_client):
        """Test super-admin-only endpoint with seller token (should fail)."""
        headers = {"Authorization": "Bearer test_token"}
        response = await async_client.get(
            "/api/admin/super-admin-only", headers=headers)

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_any_admin_endpoint_with_seller(self, async_client):
        """Test any-admin endpoint with seller token (should fail)."""
        headers = {"Authorization": "Bearer test_token"}
        response = await async_client.get("/api/admin/any-admin", headers=headers)

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_any_admin_endpoint_with_admin(self, async_client):
        """Test any-admin endpoint with admin token (should succeed)."""
        headers = {"Authorization": "Bearer admin_token"}
        response = await async_client.get("/api/admin/any-admin", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert data["organization_source"] == "admin"
        assert "admin" in data["roles"]

    @pytest.mark.asyncio
    async def test_seller_admin_endpoint_with_seller(self, async_client):
        """Test seller-admin endpoint with seller token (should succeed)."""
        headers = {"Authorization": "Bearer test_token"}
        response = await async_client.get("/api/admin/seller-admin", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert data["organization_source"] == "seller"

    @pytest.mark.asyncio
    async def test_seller_admin_endpoint_with_admin(self, async_client):
        """Test seller-admin endpoint with admin token (should fail)."""
        headers = {"Authorization": "Bearer admin_token"}
        response = await async_client.get("/api/admin/seller-admin", headers=headers)

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_logout_endpoint(self, async_client):
        """Test logout endpoint works for both organizations."""
        # Test with seller token
        headers = {"Authorization": "Bearer test_token"}
        response = await async_client.post("/api/admin/logout", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert data["organization_source"] == "seller"

        # Test with admin token
        headers = {"Authorization": "Bearer admin_token"}
        response = await async_client.post("/api/admin/logout", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert data["organization_source"] == "admin"

    @pytest.mark.asyncio
    async def test_no_token_authentication(self, async_client):
        """Test authentication without token (should fail)."""
        response = await async_client.get("/api/admin/me")

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_invalid_token_authentication(self, async_client):
        """Test authentication with invalid token (should fail)."""
        headers = {"Authorization": "Bearer invalid_token"}
        response = await async_client.get("/api/admin/me", headers=headers)

        assert response.status_code == 401


class TestMultiOrgClerkService:
    """Test the multi-organization Clerk service directly."""

    def test_verify_seller_token(self):
        """Test verifying seller token."""
        from backend.app.core.security.clerk_multi_org import multi_org_clerk_service

        token_data = multi_org_clerk_service.verify_token("test_token")

        assert isinstance(token_data, MultiOrgClerkTokenData)
        assert token_data.organization_source == "seller"
        assert "seller" in token_data.roles
        assert token_data.email == "test@example.com"

    def test_verify_admin_token(self):
        """Test verifying admin token."""
        from backend.app.core.security.clerk_multi_org import multi_org_clerk_service

        token_data = multi_org_clerk_service.verify_token("admin_token")

        assert isinstance(token_data, MultiOrgClerkTokenData)
        assert token_data.organization_source == "admin"
        assert "admin" in token_data.roles
        assert "super_admin" in token_data.roles
        assert token_data.email == "admin@example.com"

    def test_verify_super_admin_token(self):
        """Test verifying super admin token."""
        from backend.app.core.security.clerk_multi_org import multi_org_clerk_service

        token_data = multi_org_clerk_service.verify_token("super_admin_token")

        assert isinstance(token_data, MultiOrgClerkTokenData)
        assert token_data.organization_source == "admin"
        assert "super_admin" in token_data.roles
        assert "admin" in token_data.roles
        assert token_data.email == "superadmin@enwhe.com"
        assert token_data.organization_id == "org_2zWGCeV8c2H56B4ZcK5QmDOv9vL"

    def test_token_data_methods(self):
        """Test MultiOrgClerkTokenData methods."""
        from backend.app.core.security.clerk_multi_org import MultiOrgClerkTokenData

        # Test seller token data
        seller_data = MultiOrgClerkTokenData(
            user_id="user_123",
            email="seller@example.com",
            roles=["seller"],
            metadata={"store_id": "test-store", "name": "Test User"},
            organization_source="seller",
            exp=1234567890,
            iat=1234560000
        )

        assert seller_data.is_seller() is True
        assert seller_data.is_admin() is False
        assert seller_data.is_super_admin() is False
        assert seller_data.has_role("seller") is True
        assert seller_data.has_role("admin") is False

        # Test admin token data
        admin_data = MultiOrgClerkTokenData(
            user_id="user_456",
            email="admin@example.com",
            roles=["admin", "super_admin"],
            metadata={"store_id": "test-store", "name": "Admin User"},
            organization_source="admin",
            exp=1234567890,
            iat=1234560000
        )

        assert admin_data.is_seller() is False
        assert admin_data.is_admin() is True
        assert admin_data.is_super_admin() is True
        assert admin_data.has_role("admin") is True
        assert admin_data.has_role("super_admin") is True
        assert admin_data.has_any_role(["admin", "seller"]) is True
        assert admin_data.has_all_roles(["admin", "super_admin"]) is True
