"""
Access Control Verification Tests for Super Admin Implementation.

This test suite provides comprehensive verification of the Role-Based Access Control
system implemented for the Super Admin functionality. It tests various admin roles
against different operations to ensure proper permission enforcement.
"""
import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import AsyncClient
from unittest.mock import patch, MagicMock, AsyncMock
from typing import Dict, Any, List

from app.main import app
from app.services.admin.auth.session import create_admin_access_token
from app.models.admin.admin_user import AdminUser
from app.models.admin.role_names import SUPER_ADMIN, SYSTEM_ADMIN, SUPPORT_ADMIN, SECURITY_ADMIN, READ_ONLY_ADMIN, CUSTOM
from app.services.admin.defaults.rbac import ADMIN_PERMISSIONS, PERMISSION_SETS
from app.core.integration.context_switcher import get_current_context
from app.core.config.settings import get_settings
from app.core.exceptions import PermissionDeniedError, InvalidContextError
from app.api.deps import get_db


@pytest.fixture
def test_client():
    return TestClient(app)


@pytest_asyncio.fixture
async def async_client():
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client


@pytest.fixture
def mock_super_admin():
    """Create a mock Super Admin user."""
    admin = AdminUser(
        id="00001",
        email="superadmin@example.com",
        is_active=True
    )
    admin.mock_role = SUPER_ADMIN
    return admin


@pytest.fixture
def mock_system_admin():
    """Create a mock System Admin user."""
    admin = AdminUser(
        id="00002",
        email="sysadmin@example.com",
        is_active=True
    )
    admin.mock_role = SYSTEM_ADMIN
    return admin


@pytest.fixture
def mock_support_admin():
    """Create a mock Support Admin user."""
    admin = AdminUser(
        id="00003",
        email="support@example.com",
        is_active=True
    )
    admin.mock_role = SUPPORT_ADMIN
    return admin


@pytest.fixture
def mock_security_admin():
    """Create a mock Security Admin user."""
    admin = AdminUser(
        id="00004",
        email="security@example.com",
        is_active=True
    )
    admin.mock_role = SECURITY_ADMIN
    return admin


@pytest.fixture
def mock_readonly_admin():
    """Create a mock Read-Only Admin user."""
    admin = AdminUser(
        id="00005",
        email="readonly@example.com",
        is_active=True
    )
    admin.mock_role = READ_ONLY_ADMIN
    return admin


@pytest.fixture(autouse=True)
def patch_super_admin_checks():
    from types import SimpleNamespace
    valid_session = SimpleNamespace(
        session_id="test-session-id",
        expires_at=None,
        security_level="elevated"
    )
    from app.models.admin.admin_user import AdminUser
    mock_admin = AdminUser(
        id="user_2zWGCeV8c2H56B4ZcK5QmDOv9vL",
        email="superadmin@enwhe.com",
        is_active=True,
        is_super_admin=True,
        clerk_organization_id="org_2zWGCeV8c2H56B4ZcK5QmDOv9vL",
        clerk_organization_role="admin"
    )
    with patch("app.core.security.dependencies.clerk_organizations_service.is_super_admin", new=AsyncMock(return_value=True)), \
            patch("app.core.security.dependencies.clerk_organizations_service.get_super_admin_role", new=AsyncMock(return_value="admin")), \
            patch("app.core.security.dependencies.clerk_organizations_service.validate_domain_access", new=AsyncMock(return_value=True)), \
            patch("app.core.security.dependencies.super_admin_session_manager.validate_session", new=AsyncMock(return_value=valid_session)), \
            patch("app.core.security.dependencies.super_admin_session_manager.create_session", new=AsyncMock(return_value=valid_session)), \
            patch("app.core.security.dependencies.get_current_admin_user", new=AsyncMock(return_value=mock_admin)), \
            patch("app.api.deps.get_current_admin_user_with_permissions", new=AsyncMock(return_value=mock_admin)):
        yield


@pytest.mark.asyncio
@pytest.fixture(autouse=True)
async def ensure_super_admin_in_db():
    async for db in get_db():
        user = await db.get(AdminUser, "user_2zWGCeV8c2H56B4ZcK5QmDOv9vL")
        if not user:
            db.add(AdminUser(
                id="user_2zWGCeV8c2H56B4ZcK5QmDOv9vL",
                email="superadmin@enwhe.com",
                is_active=True,
                is_super_admin=True,
                clerk_organization_id="org_2zWGCeV8c2H56B4ZcK5QmDOv9vL",
                clerk_organization_role="admin"
            ))
            await db.commit()
        break


def create_token_headers(admin_user: AdminUser) -> Dict[str, str]:
    token = "super_admin_token"
    return {"Authorization": f"Bearer {token}", "Origin": "http://localhost:3000", "Host": "localhost:3000"}


@patch("app.core.security.dependencies.get_current_admin_user")
async def test_super_admin_full_access(mock_get_admin, test_client, mock_super_admin):
    """Test Super Admin has access to all endpoints."""
    mock_get_admin.return_value = mock_super_admin
    headers = create_token_headers(mock_super_admin)
    headers["Origin"] = "http://localhost:3000"
    headers["Host"] = "localhost:3000"

    # Test system configuration access
    response = test_client.get("/admin/system-info", headers=headers)
    assert response.status_code == 200

    # Test tenant management access
    response = test_client.get("/admin/tenants", headers=headers)
    assert response.status_code == 200

    # Test user management access
    response = test_client.get("/admin/users", headers=headers)
    assert response.status_code == 200

    # Test security settings access
    response = test_client.get("/admin/security/settings", headers=headers)
    assert response.status_code == 200

    # Test audit logs access
    response = test_client.get("/admin/audit-logs", headers=headers)
    assert response.status_code == 200


@patch("app.core.security.dependencies.get_current_admin_user")
def test_system_admin_permissions(mock_get_admin, test_client, mock_system_admin):
    """Test System Admin has appropriate access limitations."""
    mock_get_admin.return_value = mock_system_admin
    headers = create_token_headers(mock_system_admin)
    headers["Origin"] = "http://localhost:3000"
    headers["Host"] = "localhost:3000"

    # Should have access to tenant management
    response = test_client.get("/admin/tenants", headers=headers)
    assert response.status_code == 200

    # Should have access to user management
    response = test_client.get("/admin/users", headers=headers)
    assert response.status_code == 200

    # Should NOT have access to security settings
    response = test_client.get("/admin/security/settings", headers=headers)
    assert response.status_code == 403


@patch("app.core.security.dependencies.get_current_admin_user")
def test_support_admin_permissions(mock_get_admin, test_client, mock_support_admin):
    """Test Support Admin has appropriate access limitations."""
    mock_get_admin.return_value = mock_support_admin
    headers = create_token_headers(mock_support_admin)
    headers["Origin"] = "http://localhost:3000"
    headers["Host"] = "localhost:3000"

    # Should have access to tenant data for support purposes
    response = test_client.get(
        "/admin/tenants/support-view", headers=headers)
    assert response.status_code == 200

    # Should have access to impersonation
    response = test_client.post(
        "/admin/impersonate/start",
        json={"tenant_id": "test-tenant", "user_id": "user-123"},
        headers=headers
    )
    assert response.status_code == 200

    # Should NOT have access to system configuration
    response = test_client.get("/admin/system/config", headers=headers)
    assert response.status_code == 403

    # Should NOT have access to user management
    response = test_client.get("/admin/users", headers=headers)
    assert response.status_code == 403


@patch("app.core.security.dependencies.get_current_admin_user")
def test_security_admin_permissions(mock_get_admin, test_client, mock_security_admin):
    """Test Security Admin has appropriate access limitations."""
    mock_get_admin.return_value = mock_security_admin
    headers = create_token_headers(mock_security_admin)
    headers["Origin"] = "http://localhost:3000"
    headers["Host"] = "localhost:3000"

    # Should have access to security settings
    response = test_client.get("/admin/security/settings", headers=headers)
    assert response.status_code == 200

    # Should have access to audit logs
    response = test_client.get("/admin/audit-logs", headers=headers)
    assert response.status_code == 200

    # Should NOT have access to tenant management
    response = test_client.get("/admin/tenants", headers=headers)
    assert response.status_code == 403

    # Should NOT have access to impersonation
    response = test_client.post(
        "/admin/impersonate/start",
        json={"tenant_id": "test-tenant", "user_id": "user-123"},
        headers=headers
    )
    assert response.status_code == 403


@patch("app.core.security.dependencies.get_current_admin_user")
def test_readonly_admin_permissions(mock_get_admin, test_client, mock_readonly_admin):
    """Test Read-Only Admin has appropriate access limitations."""
    mock_get_admin.return_value = mock_readonly_admin
    headers = create_token_headers(mock_readonly_admin)
    headers["Origin"] = "http://localhost:3000"
    headers["Host"] = "localhost:3000"

    # Should have read access to system metrics
    response = test_client.get("/admin/system/metrics", headers=headers)
    assert response.status_code == 200

    # Should have read access to audit logs
    response = test_client.get("/admin/audit-logs", headers=headers)
    assert response.status_code == 200

    # Should NOT have write access to any resources
    response = test_client.post(
        "/admin/tenants",
        json={"name": "New Tenant"},
        headers=headers
    )
    assert response.status_code == 403

    # Should NOT have access to security settings
    response = test_client.get("/admin/security/settings", headers=headers)
    assert response.status_code == 403


class TestPermissionMatrix:
    """Test specific permission combinations using the permission matrix."""

    # Test data for permission matrix validation
    PERMISSION_TEST_CASES = [
        # Format: (role, endpoint, method, expected_status)
        (SUPER_ADMIN, "/api/v1/admin/tenants", "GET", 200),
        (SUPER_ADMIN, "/api/v1/admin/users", "POST", 201),
        (SYSTEM_ADMIN, "/api/v1/admin/feature-flags", "PUT", 200),
        (SYSTEM_ADMIN, "/api/v1/admin/tenants", "DELETE", 403),
        (SUPPORT_ADMIN, "/api/v1/admin/tenants/123", "GET", 200),
        (SUPPORT_ADMIN, "/api/v1/admin/users", "POST", 403),
        (SECURITY_ADMIN, "/api/v1/admin/audit-logs", "GET", 200),
        (SECURITY_ADMIN, "/api/v1/admin/feature-flags", "POST", 403),
        (READ_ONLY_ADMIN, "/api/v1/admin/tenants", "GET", 200),
        (READ_ONLY_ADMIN, "/api/v1/admin/tenants", "POST", 403),
    ]

    @pytest.mark.asyncio
    @pytest.mark.parametrize("role,endpoint,method,expected_status", PERMISSION_TEST_CASES)
    @patch("app.core.security.dependencies.get_current_admin_user")
    async def test_permission_matrix(self, mock_get_admin, test_client, role, endpoint, method, expected_status):
        """Test various role and endpoint combinations against expected access levels."""
        # Create mock admin with the specified role
        admin = AdminUser(
            id="test-id",
            email=f"{role.lower()}@example.com",
            is_active=True
        )
        admin.mock_role = role
        mock_get_admin.return_value = admin
        headers = create_token_headers(admin)
        headers["Origin"] = "http://localhost:3000"
        headers["Host"] = "localhost:3000"

        # Make request based on method
        if method == "GET":
            response = test_client.get(endpoint, headers=headers)
        elif method == "POST":
            response = test_client.post(
                endpoint, json={"test": "data"}, headers=headers)
        elif method == "PUT":
            response = test_client.put(
                endpoint, json={"test": "data"}, headers=headers)
        elif method == "DELETE":
            response = test_client.delete(endpoint, headers=headers)

        assert response.status_code == expected_status


class TestContextAwarePermissions:
    """Test permission enforcement in different contexts."""

    # Mock JWT payload for different contexts
    ADMIN_CONTEXT = {"context": "admin",
                     "tenant_id": None, "impersonating": False}
    TENANT_CONTEXT = {"context": "tenant",
                      "tenant_id": "test_tenant_1", "impersonating": False}
    IMPERSONATION_CONTEXT = {
        "context": "tenant",
        "tenant_id": "test_tenant_1",
        "impersonating": True,
        "original_user_id": "admin_123"
    }

    @patch("app.core.security.dependencies.get_current_admin_user")
    @patch("app.core.integration.context_switcher.get_current_context")
    def test_admin_context_permissions(self, mock_context, mock_get_admin, test_client, mock_super_admin):
        """Test permissions when in admin context."""
        mock_get_admin.return_value = mock_super_admin
        mock_context.return_value = {
            "type": "admin", "admin_id": mock_super_admin.id}
        headers = create_token_headers(mock_super_admin)
        headers["Origin"] = "http://localhost:3000"
        headers["Host"] = "localhost:3000"

        # Should have full admin access in admin context
        response = test_client.get("/admin/system-info", headers=headers)
        assert response.status_code == 200

    @patch("app.core.security.dependencies.get_current_admin_user")
    @patch("app.core.integration.context_switcher.get_current_context")
    def test_impersonation_context_permissions(self, mock_context, mock_get_admin, test_client, mock_super_admin):
        """Test permissions when in impersonation context."""
        mock_get_admin.return_value = mock_super_admin
        mock_context.return_value = {
            "type": "impersonation",
            "admin_id": mock_super_admin.id,
            "tenant_id": "test-tenant",
            "user_id": "user-123"
        }
        headers = create_token_headers(mock_super_admin)
        headers["Origin"] = "http://localhost:3000"
        headers["Host"] = "localhost:3000"

        # Should NOT have admin access while impersonating
        response = test_client.get("/admin/system-info", headers=headers)
        assert response.status_code == 403

        # Should have tenant user access
        response = test_client.get(
            "/api/tenants/test-tenant/dashboard", headers=headers)
        assert response.status_code == 200


class TestCustomRolePermissions:
    """Test custom role definitions and permission assignments."""

    # Custom role definition for testing
    CUSTOM_ROLE_DATA = {
        "name": "Tenant Manager",
        "description": "Can manage tenants but not admin users",
        "permission_sets": ["tenant:full", "audit:read"],
        "custom_permissions": ["system:metrics:view"],
        "parent_role": SUPPORT_ADMIN
    }

    @patch("app.core.security.dependencies.get_current_admin_user")
    def test_custom_role_permissions(self, mock_get_admin, test_client):
        """Test a custom role with specific permission sets."""
        # Create custom role admin user
        custom_admin = AdminUser(
            id="custom-001",
            email="custom@example.com",
            is_active=True
        )
        custom_admin.mock_role = CUSTOM
        custom_admin.custom_permissions = [
            "tenant_read", "user_read", "audit_log_read"]
        mock_get_admin.return_value = custom_admin
        headers = create_token_headers(custom_admin)
        headers["Origin"] = "http://localhost:3000"
        headers["Host"] = "localhost:3000"

        # Should have read access to tenants
        response = test_client.get("/admin/tenants", headers=headers)
        assert response.status_code == 200

        # Should have read access to users
        response = test_client.get("/admin/users", headers=headers)
        assert response.status_code == 200

        # Should have read access to audit logs
        response = test_client.get("/admin/audit-logs", headers=headers)
        assert response.status_code == 200

        # Should NOT have write access to tenants
        response = test_client.post(
            "/admin/tenants",
            json={"name": "New Tenant"},
            headers=headers
        )
        assert response.status_code == 403

        # Should NOT have access to security settings
        response = test_client.get("/admin/security/settings", headers=headers)
        assert response.status_code == 403


class TestPermissionInheritance:
    """Test permission inheritance and hierarchical role structures."""

    # Permission inheritance test cases
    INHERITANCE_TEST_CASES = [
        ("tenant:create", [SUPER_ADMIN, SYSTEM_ADMIN]),
        ("admin:user:create", [SUPER_ADMIN]),
        ("audit:read", [SUPER_ADMIN, SYSTEM_ADMIN,
         SECURITY_ADMIN, READ_ONLY_ADMIN]),
        ("tenant:view", [SUPER_ADMIN, SYSTEM_ADMIN,
         SUPPORT_ADMIN, READ_ONLY_ADMIN]),
    ]

    @pytest.mark.parametrize("permission,roles_with_access", [
        ("tenant_read", [
            SUPER_ADMIN,
            SYSTEM_ADMIN,
            SUPPORT_ADMIN
        ]),
        ("security_write", [
            SUPER_ADMIN,
            SECURITY_ADMIN
        ]),
        ("impersonation", [
            SUPER_ADMIN,
            SYSTEM_ADMIN,
            SUPPORT_ADMIN
        ]),
        ("system_config", [
            SUPER_ADMIN,
            SYSTEM_ADMIN
        ]),
    ])
    def test_permission_inheritance(self, permission, roles_with_access):
        """Test which roles have access to specific permissions."""
        for role in PERMISSION_SETS.keys():  # Iterate through all defined roles
            # Check if this role should have the permission
            if role in roles_with_access:
                assert self._role_has_permission(
                    role, permission), f"Role {role} should have permission {permission}"
            else:
                # Skip CUSTOM role as it's configurable
                if role != CUSTOM:
                    assert not self._role_has_permission(
                        role, permission), f"Role {role} should not have permission {permission}"

        # Check roles that should NOT have this permission
        all_roles = [r for r in PERMISSION_SETS.keys() if r != CUSTOM]
        for role in all_roles:
            if role not in roles_with_access:
                assert not self._role_has_permission(
                    role, permission), f"Role {role} should not have permission {permission}"

    def _role_has_permission(self, role, permission):
        """Helper to check if a role has a specific permission."""
        role_permissions = []
        for permission_set in PERMISSION_SETS.get(role, []):
            role_permissions.extend(ADMIN_PERMISSIONS.get(permission_set, []))
        return permission in role_permissions
