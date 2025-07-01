"""
Role service module for Super Admin RBAC system.

This package contains focused modules for role management.
"""

from app.services.admin.role.service import RoleService
from app.services.admin.role.crud import (
    create_role,
    get_role,
    get_role_by_name,
    list_roles,
    update_role,
    delete_role
)
from app.services.admin.role.hierarchy import (
    add_role_parent,
    remove_role_parent,
    get_parent_roles,
    get_child_roles,
    get_all_ancestor_roles,
    get_all_descendant_roles,
    is_role_ancestor
)
from app.services.admin.role.permissions import (
    assign_permission_to_role,
    remove_permission_from_role,
    get_role_permissions
)
from app.services.admin.role.system_roles import create_system_roles
