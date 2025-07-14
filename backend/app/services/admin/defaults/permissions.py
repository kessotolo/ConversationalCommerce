"""
Default permission definitions for the Super Admin RBAC system.

This module defines and initializes default system permissions.
"""

from typing import Dict, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.admin.permission import Permission, PermissionScope
from app.services.admin.permission.service import PermissionService


async def initialize_default_permissions(
    db: AsyncSession,
    permission_service: PermissionService = None
) -> Dict[str, Permission]:
    """
    Initialize default system permissions.
    
    Args:
        db: Database session
        permission_service: Optional permission service instance
        
    Returns:
        Dictionary of created permissions by key
    """
    service = permission_service or PermissionService()
    
    # Define default permissions
    default_permissions = _get_default_permission_definitions()
    
    # Create permissions
    created_permissions = {}
    
    for key, (resource, action, scope, description) in default_permissions.items():
        try:
            # Check if permission already exists
            existing = await service.get_permission_by_attributes(db, resource, action, scope)
            if existing:
                created_permissions[key] = existing
            else:
                # Create permission if it doesn't exist
                permission = await service.create_permission(
                    db=db,
                    resource=resource,
                    action=action,
                    scope=scope,
                    description=description,
                    is_system=True
                )
                created_permissions[key] = permission
        except Exception as e:
            print(f"Error creating permission {key}: {str(e)}")
            
    return created_permissions


def _get_default_permission_definitions() -> Dict[str, Tuple[str, str, PermissionScope, str]]:
    """
    Get default permission definitions.
    
    Returns:
        Dictionary mapping permission keys to tuples of (resource, action, scope, description)
    """
    return {
        # User management permissions
        "admin_users_view": (
            "admin_users", "view", PermissionScope.GLOBAL,
            "View admin users"
        ),
        "admin_users_create": (
            "admin_users", "create", PermissionScope.GLOBAL,
            "Create admin users"
        ),
        "admin_users_update": (
            "admin_users", "update", PermissionScope.GLOBAL,
            "Update admin users"
        ),
        "admin_users_delete": (
            "admin_users", "delete", PermissionScope.GLOBAL,
            "Delete admin users"
        ),
        
        # Role management permissions
        "roles_view": (
            "roles", "view", PermissionScope.GLOBAL,
            "View roles"
        ),
        "roles_create": (
            "roles", "create", PermissionScope.GLOBAL,
            "Create roles"
        ),
        "roles_update": (
            "roles", "update", PermissionScope.GLOBAL,
            "Update roles"
        ),
        "roles_delete": (
            "roles", "delete", PermissionScope.GLOBAL,
            "Delete roles"
        ),
        
        # Permission management permissions
        "permissions_view": (
            "permissions", "view", PermissionScope.GLOBAL,
            "View permissions"
        ),
        "permissions_assign": (
            "permissions", "assign", PermissionScope.GLOBAL,
            "Assign permissions to roles"
        ),
        "permissions_revoke": (
            "permissions", "revoke", PermissionScope.GLOBAL,
            "Revoke permissions from roles"
        ),
        
        # Tenant management permissions
        "tenants_view": (
            "tenants", "view", PermissionScope.GLOBAL,
            "View tenants"
        ),
        "tenants_create": (
            "tenants", "create", PermissionScope.GLOBAL,
            "Create tenants"
        ),
        "tenants_update": (
            "tenants", "update", PermissionScope.GLOBAL,
            "Update tenants"
        ),
        "tenants_delete": (
            "tenants", "delete", PermissionScope.GLOBAL,
            "Delete tenants"
        ),
        
        # System settings permissions
        "settings_view": (
            "settings", "view", PermissionScope.GLOBAL,
            "View system settings"
        ),
        "settings_update": (
            "settings", "update", PermissionScope.GLOBAL,
            "Update system settings"
        ),
        
        # Audit log permissions
        "audit_logs_view": (
            "audit_logs", "view", PermissionScope.GLOBAL,
            "View audit logs"
        ),
        
        # User data permissions (tenant-scoped)
        "user_data_view": (
            "user_data", "view", PermissionScope.TENANT,
            "View user data within a tenant"
        ),
        "user_data_export": (
            "user_data", "export", PermissionScope.TENANT,
            "Export user data from a tenant"
        ),
        
        # Content management permissions (tenant-scoped)
        "content_view": (
            "content", "view", PermissionScope.TENANT,
            "View content within a tenant"
        ),
        "content_create": (
            "content", "create", PermissionScope.TENANT,
            "Create content within a tenant"
        ),
        "content_update": (
            "content", "update", PermissionScope.TENANT,
            "Update content within a tenant"
        ),
        "content_delete": (
            "content", "delete", PermissionScope.TENANT,
            "Delete content within a tenant"
        ),
        
        # Personal account permissions (self-scoped)
        "profile_view": (
            "profile", "view", PermissionScope.SELF,
            "View own admin profile"
        ),
        "profile_update": (
            "profile", "update", PermissionScope.SELF,
            "Update own admin profile"
        ),
    }
