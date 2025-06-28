"""
Storefront Component Permissions Service

This module contains functions for managing component-specific permissions,
allowing fine-grained control over which components a user can access
and what actions they can perform on them.
"""

import uuid
from typing import Any, Dict, List

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.storefront_permission import StorefrontPermission
from app.models.tenant import Tenant
from app.models.user import User
from .storefront_role_service import has_permission


async def set_component_permission(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    component_id: uuid.UUID,
    permissions: List[str],
    assigned_by: uuid.UUID,
) -> StorefrontPermission:
    """
    Set component-specific permissions for a user.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        user_id: UUID of the user
        component_id: UUID of the component
        permissions: List of permissions to grant
        assigned_by: UUID of the user performing the assignment

    Returns:
        Updated StorefrontPermission

    Raises:
        HTTPException: 404 if tenant, user, or permission not found
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

    # Check if assigner has permission to manage permissions
    if not await has_permission(db, tenant_id, assigned_by, "manage_permissions"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to manage permissions",
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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User doesn't have permission record, assign a role first",
        )

    # Update component permissions
    component_permissions = permission.component_permissions or {}
    component_permissions[str(component_id)] = permissions
    permission.component_permissions = component_permissions

    # Log the action in audit log
    from .storefront_permissions_utils import log_permission_change
    await log_permission_change(
        db=db,
        tenant_id=tenant_id,
        user_id=user_id,
        performed_by=assigned_by,
        action="component_permission_assigned",
        details={"component_id": str(component_id), "permissions": permissions},
    )

    await db.commit()
    await db.refresh(permission)

    return permission


async def get_component_permissions(
    db: AsyncSession, 
    tenant_id: uuid.UUID, 
    user_id: uuid.UUID, 
    component_id: uuid.UUID
) -> List[str]:
    """
    Get component-specific permissions for a user.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        user_id: UUID of the user
        component_id: UUID of the component

    Returns:
        List of permissions for the specified component

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
        return []  # No permissions assigned

    # Get component permissions
    component_permissions = permission.component_permissions or {}
    return component_permissions.get(str(component_id), [])
