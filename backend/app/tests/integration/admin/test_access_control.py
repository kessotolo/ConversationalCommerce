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
from app.services.admin.admin_user.auth import create_admin_access_token
from app.services.admin.admin_user.models import AdminUser
from app.services.admin.admin_user.roles import AdminRole
from app.services.admin.defaults.rbac import ADMIN_PERMISSIONS, PERMISSION_SETS
from app.core.integration.context_switcher import get_current_context
from app.core.config import settings
from app.core.exceptions import PermissionDeniedError, InvalidContextError


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
        full_name="Super Admin",
        role=AdminRole.SUPER_ADMIN,
        is_active=True
    )
    return admin


@pytest.fixture
def mock_system_admin():
    """Create a mock System Admin user."""
    admin = AdminUser(
        id="00002",
        email="sysadmin@example.com",
        full_name="System Admin",
        role=AdminRole.SYSTEM_ADMIN,
        is_active=True
    )
    return admin


@pytest.fixture
def mock_support_admin():
    """Create a mock Support Admin user."""
    admin = AdminUser(
        id="00003",
        email="support@example.com",
        full_name="Support Admin",
        role=AdminRole.SUPPORT_ADMIN,
        is_active=True
    )
    return admin


@pytest.fixture
def mock_security_admin():
    """Create a mock Security Admin user."""
    admin = AdminUser(
        id="00004",
        email="security@example.com",
        full_name="Security Admin",
        role=AdminRole.SECURITY_ADMIN,
        is_active=True
    )
    return admin


@pytest.fixture
def mock_readonly_admin():
    """Create a mock Read-Only Admin user."""
    admin = AdminUser(
        id="00005",
        email="readonly@example.com",
        full_name="Read Only Admin",
        role=AdminRole.READ_ONLY_ADMIN,
        is_active=True
    )
    return admin


def create_token_headers(admin_user: AdminUser) -> Dict[str, str]:
    """Create authentication headers with token for the given admin user."""
    # Include additional claims required for proper context handling
    token = create_admin_access_token(data={
        "sub": admin_user.email,
        "role": admin_user.role,
        "user_id": admin_user.id,
        "context": "admin",
        "is_active": admin_user.is_active
    })
    return {"Authorization": f"Bearer {token}"}


class TestAdminAccessControl:
    """Test suite for admin access control verification."""
    
    # API endpoint path constants - centralized for consistency
    ENDPOINTS = {
        "tenant_list": "/api/v1/admin/tenants",
        "tenant_detail": "/api/v1/admin/tenants/{tenant_id}",
        "user_list": "/api/v1/admin/users",
        "audit_logs": "/api/v1/admin/audit-logs",
        "feature_flags": "/api/v1/admin/feature-flags",
        "system_health": "/api/v1/admin/system-health",
        "admin_settings": "/api/v1/admin/settings",
        "role_management": "/api/v1/admin/roles",
        "impersonation": "/api/v1/admin/context/impersonate",
    }

    @pytest.mark.asyncio
    @patch("app.dependencies.admin.get_current_admin_user")
    async def test_super_admin_full_access(self, mock_get_admin, async_client, mock_super_admin):
        """Test Super Admin has access to all endpoints."""
        mock_get_admin.return_value = mock_super_admin
        headers = create_token_headers(mock_super_admin)
        
        # Test system configuration access
        response = test_client.get("/admin/system/config", headers=headers)
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

    @patch("app.dependencies.admin.get_current_admin_user")
    def test_system_admin_permissions(self, mock_get_admin, test_client, mock_system_admin):
        """Test System Admin has appropriate access limitations."""
        mock_get_admin.return_value = mock_system_admin
        headers = create_token_headers(mock_system_admin)
        
        # Should have access to tenant management
        response = test_client.get("/admin/tenants", headers=headers)
        assert response.status_code == 200
        
        # Should have access to user management
        response = test_client.get("/admin/users", headers=headers)
        assert response.status_code == 200
        
        # Should NOT have access to security settings
        response = test_client.get("/admin/security/settings", headers=headers)
        assert response.status_code == 403

    @patch("app.dependencies.admin.get_current_admin_user")
    def test_support_admin_permissions(self, mock_get_admin, test_client, mock_support_admin):
        """Test Support Admin has appropriate access limitations."""
        mock_get_admin.return_value = mock_support_admin
        headers = create_token_headers(mock_support_admin)
        
        # Should have access to tenant data for support purposes
        response = test_client.get("/admin/tenants/support-view", headers=headers)
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

    @patch("app.dependencies.admin.get_current_admin_user")
    def test_security_admin_permissions(self, mock_get_admin, test_client, mock_security_admin):
        """Test Security Admin has appropriate access limitations."""
        mock_get_admin.return_value = mock_security_admin
        headers = create_token_headers(mock_security_admin)
        
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

    @patch("app.dependencies.admin.get_current_admin_user")
    def test_readonly_admin_permissions(self, mock_get_admin, test_client, mock_readonly_admin):
        """Test Read-Only Admin has appropriate access limitations."""
        mock_get_admin.return_value = mock_readonly_admin
        headers = create_token_headers(mock_readonly_admin)
        
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
        (AdminRole.SUPER_ADMIN, "/api/v1/admin/tenants", "GET", 200),
        (AdminRole.SUPER_ADMIN, "/api/v1/admin/users", "POST", 201),
        (AdminRole.SYSTEM_ADMIN, "/api/v1/admin/feature-flags", "PUT", 200),
        (AdminRole.SYSTEM_ADMIN, "/api/v1/admin/tenants", "DELETE", 403),
        (AdminRole.SUPPORT_ADMIN, "/api/v1/admin/tenants/123", "GET", 200),
        (AdminRole.SUPPORT_ADMIN, "/api/v1/admin/users", "POST", 403),
        (AdminRole.SECURITY_ADMIN, "/api/v1/admin/audit-logs", "GET", 200),
        (AdminRole.SECURITY_ADMIN, "/api/v1/admin/feature-flags", "POST", 403),
        (AdminRole.READ_ONLY_ADMIN, "/api/v1/admin/tenants", "GET", 200),
        (AdminRole.READ_ONLY_ADMIN, "/api/v1/admin/tenants", "POST", 403),
    ]
    
    @pytest.mark.parametrize("role,endpoint,method,expected_status", [
        (AdminRole.SUPER_ADMIN, "/admin/system/config", "GET", 200),
        (AdminRole.SUPER_ADMIN, "/admin/tenants", "POST", 200),
        (AdminRole.SYSTEM_ADMIN, "/admin/tenants", "GET", 200),
        (AdminRole.SYSTEM_ADMIN, "/admin/security/settings", "PUT", 403),
        (AdminRole.SUPPORT_ADMIN, "/admin/impersonate/start", "POST", 200),
        (AdminRole.SUPPORT_ADMIN, "/admin/users", "POST", 403),
        (AdminRole.SECURITY_ADMIN, "/admin/security/settings", "GET", 200),
        (AdminRole.SECURITY_ADMIN, "/admin/tenants", "POST", 403),
        (AdminRole.READ_ONLY_ADMIN, "/admin/system/metrics", "GET", 200),
        (AdminRole.READ_ONLY_ADMIN, "/admin/system/config", "PUT", 403),
    ])
    @pytest.mark.asyncio
    @pytest.mark.parametrize("role,endpoint,method,expected_status", PERMISSION_TEST_CASES)
    @patch("app.dependencies.admin.get_current_admin_user")
    async def test_permission_matrix(self, mock_get_admin, async_client, role, endpoint, method, expected_status):
        """Test various role and endpoint combinations against expected access levels."""
        # Create mock admin with the specified role
        admin = AdminUser(
            id="test-id",
            email=f"{role.lower()}@example.com",
            full_name=f"Test {role}",
            role=role,
            is_active=True
        )
        mock_get_admin.return_value = admin
        headers = create_token_headers(admin)
        
        # Make request based on method
        if method == "GET":
            response = test_client.get(endpoint, headers=headers)
        elif method == "POST":
            response = test_client.post(endpoint, json={"test": "data"}, headers=headers)
        elif method == "PUT":
            response = test_client.put(endpoint, json={"test": "data"}, headers=headers)
        elif method == "DELETE":
            response = test_client.delete(endpoint, headers=headers)
        
        assert response.status_code == expected_status


class TestContextAwarePermissions:
    """Test permission enforcement in different contexts."""
    
    # Mock JWT payload for different contexts
    ADMIN_CONTEXT = {"context": "admin", "tenant_id": None, "impersonating": False}
    TENANT_CONTEXT = {"context": "tenant", "tenant_id": "test_tenant_1", "impersonating": False}
    IMPERSONATION_CONTEXT = {
        "context": "tenant", 
        "tenant_id": "test_tenant_1", 
        "impersonating": True,
        "original_user_id": "admin_123"
    }
    
    @patch("app.dependencies.admin.get_current_admin_user")
    @patch("app.core.integration.context_switcher.get_current_context")
    def test_admin_context_permissions(self, mock_context, mock_get_admin, test_client, mock_super_admin):
        """Test permissions when in admin context."""
        mock_get_admin.return_value = mock_super_admin
        mock_context.return_value = {"type": "admin", "admin_id": mock_super_admin.id}
        headers = create_token_headers(mock_super_admin)
        
        # Should have full admin access in admin context
        response = test_client.get("/admin/system/config", headers=headers)
        assert response.status_code == 200

    @patch("app.dependencies.admin.get_current_admin_user")
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
        
        # Should NOT have admin access while impersonating
        response = test_client.get("/admin/system/config", headers=headers)
        assert response.status_code == 403
        
        # Should have tenant user access
        response = test_client.get("/api/tenants/test-tenant/dashboard", headers=headers)
        assert response.status_code == 200


class TestCustomRolePermissions:
    """Test custom role definitions and permission assignments."""
    
    # Custom role definition for testing
    CUSTOM_ROLE_DATA = {
        "name": "Tenant Manager",
        "description": "Can manage tenants but not admin users",
        "permission_sets": ["tenant:full", "audit:read"],
        "custom_permissions": ["system:metrics:view"],
        "parent_role": AdminRole.SUPPORT_ADMIN
    }
    
    @patch("app.dependencies.admin.get_current_admin_user")
    def test_custom_role_permissions(self, mock_get_admin, test_client):
        """Test a custom role with specific permission sets."""
        # Create custom role admin user
        custom_admin = AdminUser(
            id="custom-001",
            email="custom@example.com",
            full_name="Custom Role Admin",
            role=AdminRole.CUSTOM,
            is_active=True,
            custom_permissions=["tenant_read", "user_read", "audit_log_read"]
        )
        mock_get_admin.return_value = custom_admin
        headers = create_token_headers(custom_admin)
        
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
        ("tenant:create", [AdminRole.SUPER_ADMIN, AdminRole.SYSTEM_ADMIN]),
        ("admin:user:create", [AdminRole.SUPER_ADMIN]),
        ("audit:read", [AdminRole.SUPER_ADMIN, AdminRole.SYSTEM_ADMIN, AdminRole.SECURITY_ADMIN, AdminRole.READ_ONLY_ADMIN]),
        ("tenant:view", [AdminRole.SUPER_ADMIN, AdminRole.SYSTEM_ADMIN, AdminRole.SUPPORT_ADMIN, AdminRole.READ_ONLY_ADMIN]),
    ]
    
    @pytest.mark.parametrize("permission,roles_with_access", [
        ("tenant_read", [
            AdminRole.SUPER_ADMIN, 
            AdminRole.SYSTEM_ADMIN, 
            AdminRole.SUPPORT_ADMIN
        ]),
        ("security_write", [
            AdminRole.SUPER_ADMIN, 
            AdminRole.SECURITY_ADMIN
        ]),
        ("impersonation", [
            AdminRole.SUPER_ADMIN, 
            AdminRole.SYSTEM_ADMIN, 
            AdminRole.SUPPORT_ADMIN
        ]),
        ("system_config", [
            AdminRole.SUPER_ADMIN, 
            AdminRole.SYSTEM_ADMIN
        ]),
    ])
    def test_permission_inheritance(self, permission, roles_with_access):
        """Test which roles have access to specific permissions."""
        for role in AdminRole:
            # Check if this role should have the permission
            if role in roles_with_access:
                self.assertTrue(self._role_has_permission(role, permission))
            else:
                # Skip CUSTOM role as it's configurable
                if role != AdminRole.CUSTOM:
                    self.assertFalse(self._role_has_permission(role, permission))
        
        # Check roles that should NOT have this permission
        all_roles = [r for r in AdminRole if r != AdminRole.CUSTOM]
        for role in all_roles:
            if role not in roles_with_access:
                self.assertFalse(self._role_has_permission(role, permission))
    
    def _role_has_permission(self, role, permission):
        """Helper to check if a role has a specific permission."""
        role_permissions = []
        for permission_set in PERMISSION_SETS.get(role, []):
            role_permissions.extend(ADMIN_PERMISSIONS.get(permission_set, []))
        return permission in role_permissions
