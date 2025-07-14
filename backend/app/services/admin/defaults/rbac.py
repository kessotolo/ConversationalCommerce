"""
RBAC system initialization module.

This module provides functions to initialize the entire RBAC system with default
roles, permissions, and their associations.
"""

from typing import Dict, List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession

from app.app.models.admin.role import Role
from app.app.models.admin.permission import Permission
from app.app.services.admin.role.service import RoleService
from app.app.services.admin.permission.service import PermissionService
from app.app.services.admin.defaults.roles import initialize_default_roles
from app.app.services.admin.defaults.permissions import initialize_default_permissions
from app.app.models.admin.role_names import SUPER_ADMIN, SYSTEM_ADMIN, SUPPORT_ADMIN, SECURITY_ADMIN, READ_ONLY_ADMIN, CUSTOM


# Permission sets that define common groups of permissions
ADMIN_PERMISSIONS = {
    "tenant:full": [
        "tenant_read", "tenant_create", "tenant_update", "tenant_delete"
    ],
    "tenant:read": [
        "tenant_read"
    ],
    "user:full": [
        "user_read", "user_create", "user_update", "user_delete", "user_data_view", "user_data_export"
    ],
    "user:read": [
        "user_read", "user_data_view"
    ],
    "admin:full": [
        "admin_users_view", "admin_users_create", "admin_users_update", "admin_users_delete"
    ],
    "admin:read": [
        "admin_users_view"
    ],
    "role:full": [
        "roles_view", "roles_create", "roles_update", "roles_delete"
    ],
    "role:read": [
        "roles_view"
    ],
    "permission:full": [
        "permissions_view", "permissions_assign", "permissions_revoke"
    ],
    "permission:read": [
        "permissions_view"
    ],
    "security:full": [
        "security_write", "settings_view", "settings_update"
    ],
    "security:read": [
        "settings_view"
    ],
    "audit:read": [
        "audit_logs_view"
    ],
    "content:full": [
        "content_view", "content_create", "content_update", "content_delete"
    ],
    "content:read": [
        "content_view"
    ],
    "system:full": [
        "system_config", "system_health"
    ],
    "system:read": [
        "system_health"
    ],
    "impersonation": [
        "impersonation"
    ]
}

# Role to permission set mappings
PERMISSION_SETS = {
    SUPER_ADMIN: [
        "admin:full", "role:full", "permission:full", "tenant:full",
        "user:full", "security:full", "audit:read", "content:full",
        "system:full", "impersonation"
    ],
    SYSTEM_ADMIN: [
        "admin:read", "role:read", "permission:read", "tenant:full",
        "user:full", "audit:read", "content:full", "system:full",
        "impersonation"
    ],
    SUPPORT_ADMIN: [
        "admin:read", "role:read", "permission:read", "tenant:read",
        "user:read", "content:read", "impersonation"
    ],
    SECURITY_ADMIN: [
        "admin:read", "role:read", "permission:read", "security:full",
        "audit:read"
    ],
    READ_ONLY_ADMIN: [
        "admin:read", "role:read", "permission:read",
        "user:read", "security:read", "audit:read", "content:read",
        "system:read"
    ],
    CUSTOM: []  # Custom roles have configurable permissions
}


async def initialize_rbac_system(
    db: AsyncSession,
    role_service: Optional[RoleService] = None,
    permission_service: Optional[PermissionService] = None
) -> Tuple[Dict[str, Role], Dict[str, Permission]]:
    """
    Initialize the entire RBAC system with default roles and permissions.

    Args:
        db: Database session
        role_service: Optional role service instance
        permission_service: Optional permission service instance

    Returns:
        Tuple of (roles, permissions) dictionaries
    """
    # Initialize services
    role_svc = role_service or RoleService()
    perm_svc = permission_service or PermissionService()

    # Initialize permissions first
    permissions = await initialize_default_permissions(db, perm_svc)

    # Initialize roles
    roles = await initialize_default_roles(db, role_svc)

    # Set up role-permission associations
    await _setup_role_permission_associations(db, roles, permissions, role_svc)

    return roles, permissions


async def _setup_role_permission_associations(
    db: AsyncSession,
    roles: Dict[str, Role],
    permissions: Dict[str, Permission],
    role_service: RoleService
) -> None:
    """
    Set up associations between roles and permissions.

    Args:
        db: Database session
        roles: Dictionary of roles by key
        permissions: Dictionary of permissions by key
        role_service: Role service instance
    """
    # Define role-permission associations
    # Format: (role_key, [permission_keys])
    role_permissions = {
        "super_admin": [
            # Super admin has all permissions
            "admin_users_view", "admin_users_create", "admin_users_update", "admin_users_delete",
            "roles_view", "roles_create", "roles_update", "roles_delete",
            "permissions_view", "permissions_assign", "permissions_revoke",
            "tenants_view", "tenants_create", "tenants_update", "tenants_delete",
            "settings_view", "settings_update",
            "audit_logs_view",
            "user_data_view", "user_data_export",
            "content_view", "content_create", "content_update", "content_delete",
            "profile_view", "profile_update"
        ],
        "domain_admin": [
            # Domain admin has tenant-scoped permissions plus some global
            "admin_users_view",
            "roles_view",
            "permissions_view",
            "user_data_view", "user_data_export",
            "content_view", "content_create", "content_update", "content_delete",
            "profile_view", "profile_update"
        ],
        "support_admin": [
            # Support admin has limited permissions
            "admin_users_view",
            "roles_view",
            "permissions_view",
            "tenants_view",
            "user_data_view",
            "content_view",
            "profile_view", "profile_update"
        ],
        "read_only_admin": [
            # Read-only admin can only view
            "admin_users_view",
            "roles_view",
            "permissions_view",
            "tenants_view",
            "settings_view",
            "user_data_view",
            "content_view",
            "profile_view"
        ],
        "content_manager": [
            # Content manager manages content
            "content_view", "content_create", "content_update", "content_delete",
            "profile_view", "profile_update"
        ],
        "user_manager": [
            # User manager manages users
            "user_data_view", "user_data_export",
            "profile_view", "profile_update"
        ],
        "analytics_viewer": [
            # Analytics viewer views analytics
            "user_data_view",
            "content_view",
            "profile_view", "profile_update"
        ],
        "security_admin": [
            # Security admin manages security
            "admin_users_view", "admin_users_update",
            "roles_view",
            "permissions_view",
            "settings_view", "settings_update",
            "audit_logs_view",
            "profile_view", "profile_update"
        ]
    }

    # Assign permissions to roles
    for role_key, permission_keys in role_permissions.items():
        if role_key in roles:
            role = roles[role_key]

            for perm_key in permission_keys:
                if perm_key in permissions:
                    perm = permissions[perm_key]

                    try:
                        await role_service.assign_permission_to_role(
                            db=db,
                            role_id=role.id,
                            permission_id=perm.id
                        )
                    except Exception:
                        # Skip if permission is already assigned
                        pass
