"""
Authentication and authorization module for Super Admin RBAC system.

This package contains modules for integrating the RBAC system with FastAPI authentication.
"""

from backend.app.services.admin.auth.middleware import (
    AdminPermissionVerifier,
    require_permission,
    require_role
)
from backend.app.services.admin.auth.dependencies import (
    get_current_admin_user,
    admin_user_from_token
)
