"""
Admin User service module for Super Admin RBAC system.

This package contains focused modules for admin user management.
"""

from app.services.admin.admin_user.service import AdminUserService
from app.services.admin.admin_user.crud import (
    create_admin_user,
    get_admin_user,
    get_admin_user_by_user_id,
    list_admin_users,
    update_admin_user,
    delete_admin_user,
    record_login
)
from app.services.admin.admin_user.roles import (
    assign_role_to_admin_user,
    remove_role_from_admin_user,
    get_admin_user_roles,
    get_admin_users_by_role,
    has_role
)
from app.services.admin.admin_user.auth import is_ip_allowed
