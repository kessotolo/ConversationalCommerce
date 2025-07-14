"""
System permissions creation and management.

This module handles the creation and management of default system permissions.
"""

from typing import List
from sqlalchemy.ext.asyncio import AsyncSession

from app.app.models.admin.permission import Permission, PermissionScope
from app.app.core.errors.exceptions import ValidationError
from app.app.services.admin.permission.crud import (
    create_permission,
    get_permission_by_attributes
)


async def create_system_permissions(
    db: AsyncSession
) -> List[Permission]:
    """
    Create the default set of system permissions.

    This function should be called during system initialization to ensure
    all necessary permissions exist.

    Args:
        db: Database session

    Returns:
        List of created permissions
    """
    # Define core system resources
    resources = [
        "user", "tenant", "role", "permission", "admin_user",
        "product", "order", "storefront"
    ]

    # Define standard actions
    actions = ["create", "read", "update", "delete", "list"]

    # Create system permissions
    created_permissions = []

    # Global admin permissions (for Super Admin)
    for resource in resources:
        for action in actions:
            try:
                permission = await create_permission(
                    db=db,
                    resource=resource,
                    action=action,
                    scope=PermissionScope.GLOBAL,
                    description=f"Global permission to {action} {resource}s across all tenants",
                    is_system=True
                )
                created_permissions.append(permission)
            except ValidationError:
                # If permission already exists, get it instead
                permission = await get_permission_by_attributes(
                    db=db,
                    resource=resource,
                    action=action,
                    scope=PermissionScope.GLOBAL
                )
                if permission:
                    created_permissions.append(permission)

    # Tenant-scoped permissions (for Domain Admin)
    for resource in resources:
        for action in actions:
            try:
                permission = await create_permission(
                    db=db,
                    resource=resource,
                    action=action,
                    scope=PermissionScope.TENANT,
                    description=f"Permission to {action} {resource}s within a tenant",
                    is_system=True
                )
                created_permissions.append(permission)
            except ValidationError:
                # If permission already exists, get it instead
                permission = await get_permission_by_attributes(
                    db=db,
                    resource=resource,
                    action=action,
                    scope=PermissionScope.TENANT
                )
                if permission:
                    created_permissions.append(permission)

    # Add special permissions
    await _create_special_system_permissions(db, created_permissions)

    return created_permissions


async def _create_special_system_permissions(
    db: AsyncSession,
    created_permissions: List[Permission]
) -> None:
    """
    Create special system permissions that don't follow the standard resource-action pattern.

    Args:
        db: Database session
        created_permissions: List to append created permissions to
    """
    special_permissions = [
        {
            "resource": "system",
            "action": "manage_settings",
            "scope": PermissionScope.GLOBAL,
            "description": "Manage global system settings"
        },
        {
            "resource": "system",
            "action": "view_dashboard",
            "scope": PermissionScope.GLOBAL,
            "description": "View global system dashboard"
        },
        {
            "resource": "user",
            "action": "impersonate",
            "scope": PermissionScope.GLOBAL,
            "description": "Impersonate any user across the platform"
        },
        {
            "resource": "user",
            "action": "impersonate",
            "scope": PermissionScope.TENANT,
            "description": "Impersonate users within a tenant"
        },
        {
            "resource": "feature_flag",
            "action": "manage",
            "scope": PermissionScope.GLOBAL,
            "description": "Manage feature flags across the platform"
        },
        {
            "resource": "feature_flag",
            "action": "manage",
            "scope": PermissionScope.TENANT,
            "description": "Manage feature flags for a tenant"
        }
    ]

    for perm in special_permissions:
        try:
            permission = await create_permission(
                db=db,
                resource=perm["resource"],
                action=perm["action"],
                scope=perm["scope"],
                description=perm["description"],
                is_system=True
            )
            created_permissions.append(permission)
        except ValidationError:
            # If permission already exists, get it instead
            permission = await get_permission_by_attributes(
                db=db,
                resource=perm["resource"],
                action=perm["action"],
                scope=perm["scope"]
            )
            if permission:
                created_permissions.append(permission)
