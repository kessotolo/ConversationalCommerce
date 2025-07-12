"""
Storefront Role Service

This module contains functions for managing storefront user roles and permissions
at the global level, including role assignment and validation.
"""

import uuid
import datetime
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.models.storefront_permission import (
    StorefrontPermission,
    StorefrontRole,
)
from backend.app.models.tenant import Tenant
from backend.app.models.user import User

# Define permission levels with corresponding actions
PERMISSION_LEVELS = {
    StorefrontRole.VIEWER: ["view"],
    StorefrontRole.EDITOR: ["view", "edit"],
    StorefrontRole.PUBLISHER: ["view", "edit", "publish"],
    StorefrontRole.ADMIN: ["view", "edit", "publish", "delete", "manage_permissions"],
}


async def assign_role(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    role: StorefrontRole,
    assigned_by: uuid.UUID,
) -> StorefrontPermission:
    """
    Assign a storefront role to a user.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        user_id: UUID of the user to assign role to
        role: StorefrontRole to assign
        assigned_by: UUID of the user performing the assignment

    Returns:
        Updated or created StorefrontPermission

    Raises:
        HTTPException: 404 if tenant or user not found
        HTTPException: 403 if assigner doesn't have permission
    """
    # Check if tenant exists
    result = await db.execute(select(Tenant).filter(Tenant.id == tenant_id))
    tenant = result.scalars().first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found"
        )

    # Check if user exists
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Check if assigner has permission to manage roles
    if not await has_permission(db, tenant_id, assigned_by, "manage_permissions"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to manage roles",
        )

    # Check if assigner is a super admin
    result = await db.execute(select(User).filter(User.id == assigned_by))
    assigner = result.scalars().first()
    is_super_admin = assigner.is_superadmin

    # Check if assigner already has permission for this tenant
    result = await db.execute(
        select(StorefrontPermission).filter(
            StorefrontPermission.tenant_id == tenant_id,
            StorefrontPermission.user_id == assigned_by,
            StorefrontPermission.role == StorefrontRole.ADMIN
        )
    )
    existing_assigner_perm = result.scalars().first()

    # Check if user already has a role
    result = await db.execute(
        select(StorefrontPermission).filter(
            StorefrontPermission.tenant_id == tenant_id,
            StorefrontPermission.user_id == user_id,
        )
    )
    permission = result.scalars().first()

    if permission:
        # Update existing permission
        permission.role = role
        permission.assigned_by = assigned_by
        permission.updated_at = datetime.datetime.utcnow()
    else:
        # Create new permission
        permission = StorefrontPermission(
            tenant_id=tenant_id, user_id=user_id, role=role, assigned_by=assigned_by
        )
        db.add(permission)

    # Log the action in audit log
    from .storefront_permissions_utils import log_permission_change
    await log_permission_change(
        db=db,
        tenant_id=tenant_id,
        user_id=user_id,
        performed_by=assigned_by,
        action="role_assigned",
        details={"role": role.value},
    )

    await db.commit()
    await db.refresh(permission)

    return permission


async def get_user_permissions(
    db: AsyncSession, tenant_id: uuid.UUID, user_id: uuid.UUID
) -> Dict[str, Any]:
    """
    Get all permissions for a user.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        user_id: UUID of the user

    Returns:
        Dictionary of user permissions

    Raises:
        HTTPException: 404 if tenant or user not found
    """
    # Check if tenant exists
    result = await db.execute(select(Tenant).filter(Tenant.id == tenant_id))
    tenant = result.scalars().first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found"
        )

    # Check if user exists
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Get user's permission record
    result = await db.execute(
        select(StorefrontPermission).filter(
            StorefrontPermission.tenant_id == tenant_id,
            StorefrontPermission.user_id == user_id
        )
    )
    permission = result.scalars().first()

    if not permission:
        # Return default permissions (none)
        return {
            "role": None,
            "global_permissions": [],
            "section_permissions": {},
            "component_permissions": {},
        }

    # Get permissions based on role
    global_permissions = PERMISSION_LEVELS.get(permission.role, [])

    return {
        "role": permission.role.value,
        "global_permissions": global_permissions,
        "section_permissions": permission.section_permissions,
        "component_permissions": permission.component_permissions,
    }


async def list_users_with_permissions(
    db: AsyncSession, tenant_id: uuid.UUID
) -> List[Dict[str, Any]]:
    """
    List all users with their permissions for a tenant.

    Args:
        db: Database session
        tenant_id: UUID of the tenant

    Returns:
        List of users with their permissions

    Raises:
        HTTPException: 404 if tenant not found
    """
    # Check if tenant exists
    result = await db.execute(select(Tenant).filter(Tenant.id == tenant_id))
    tenant = result.scalars().first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found"
        )

    # Get all permissions for this tenant
    result = await db.execute(
        select(StorefrontPermission).filter(StorefrontPermission.tenant_id == tenant_id)
    )
    permissions = result.scalars().all()

    # Get user details and their permissions
    users_result = []
    for permission in permissions:
        result = await db.execute(select(User).filter(User.id == permission.user_id))
        user = result.scalars().first()
        if user:
            global_permissions = PERMISSION_LEVELS.get(permission.role, [])
            users_result.append(
                {
                    "user_id": str(user.id),
                    "email": user.email,
                    "name": f"{user.first_name} {user.last_name}",
                    "role": permission.role.value,
                    "global_permissions": global_permissions,
                    "section_permissions": permission.section_permissions or {},
                    "component_permissions": permission.component_permissions or {},
                }
            )

    return users_result


async def remove_user_permission(
    db: AsyncSession, tenant_id: uuid.UUID, user_id: uuid.UUID, removed_by: uuid.UUID
) -> bool:
    """
    Remove all permissions for a user.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        user_id: UUID of the user
        removed_by: UUID of the user performing the removal

    Returns:
        True if permissions were removed, False if no permissions existed

    Raises:
        HTTPException: 404 if tenant or user not found
        HTTPException: 403 if remover doesn't have permission
    """
    # Check if tenant exists
    result = await db.execute(select(Tenant).filter(Tenant.id == tenant_id))
    tenant = result.scalars().first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found"
        )

    # Check if user exists
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Check if remover has permission to manage roles
    if not await has_permission(db, tenant_id, removed_by, "manage_permissions"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to manage permissions",
        )

    # Delete user's permission record
    result = await db.execute(
        select(StorefrontPermission).filter(
            StorefrontPermission.tenant_id == tenant_id,
            StorefrontPermission.user_id == user_id
        )
    )
    permission = result.scalars().first()

    if not permission:
        return False

    from .storefront_permissions_utils import log_permission_change
    await log_permission_change(
        db=db,
        tenant_id=tenant_id,
        user_id=user_id,
        performed_by=removed_by,
        action="permissions_removed",
        details={},
    )

    await db.delete(permission)
    await db.commit()

    return True


async def has_permission(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    required_permission: str,
    section: Optional[str] = None,
    component_id: Optional[uuid.UUID] = None,
) -> bool:
    """
    Check if a user has a specific permission.

    This function implements the permission checking logic with the following hierarchy:
    1. Component-specific permissions (most specific)
    2. Section-specific permissions
    3. Global role-based permissions (most general)

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        user_id: UUID of the user
        required_permission: Permission to check for
        section: Optional section to check permissions for
        component_id: Optional component ID to check permissions for

    Returns:
        True if user has permission, False otherwise
    """
    # Get user's permission record
    result = await db.execute(
        select(StorefrontPermission).filter(
            StorefrontPermission.tenant_id == tenant_id,
            StorefrontPermission.user_id == user_id
        )
    )
    permission = result.scalars().first()

    if not permission:
        return False

    # Check component-specific permissions (highest priority)
    if component_id:
        component_permissions = permission.component_permissions or {}
        if str(component_id) in component_permissions:
            return required_permission in component_permissions[str(component_id)]

    # Check section-specific permissions
    if section:
        section_permissions = permission.section_permissions or {}
        if section in section_permissions:
            return required_permission in section_permissions[section]

    # Fall back to global permissions based on role
    global_permissions = PERMISSION_LEVELS.get(permission.role, [])
    return required_permission in global_permissions
