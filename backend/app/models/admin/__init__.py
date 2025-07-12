"""
Admin Module Models.

This package contains SQLAlchemy models for the Super Admin RBAC system.
These models are designed to support cross-tenant operations and platform-wide administration.
"""

from backend.app.models.admin.role import Role, RoleHierarchy
from backend.app.models.admin.permission import Permission, PermissionScope
from backend.app.models.admin.role_permission import RolePermission
from backend.app.models.admin.admin_user import AdminUser, AdminUserRole
