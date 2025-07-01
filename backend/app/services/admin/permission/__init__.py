"""
Permission service module for Super Admin RBAC system.

This package contains focused modules for permission management.
"""

from app.services.admin.permission.service import PermissionService
from app.services.admin.permission.crud import (
    create_permission,
    get_permission,
    get_permission_by_attributes,
    list_permissions,
    update_permission,
    delete_permission
)
from app.services.admin.permission.system_permissions import create_system_permissions
