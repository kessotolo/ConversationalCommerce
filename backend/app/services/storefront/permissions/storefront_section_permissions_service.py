"""
Storefront Section Permissions Service

This module contains functions for managing section-level permissions
for storefront users, allowing fine-grained control over which sections
a user can access and what actions they can perform.
"""

import uuid
from typing import Any, Dict, List

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.storefront_permission import (
    StorefrontPermission,
    StorefrontSectionType,
)
from app.models.tenant import Tenant
from app.models.user import User
from .storefront_role_service import has_permission

# Define section-specific permissions
SECTION_PERMISSIONS = {
    StorefrontSectionType.THEME: ["view", "edit", "publish"],
    StorefrontSectionType.LAYOUT: ["view", "edit", "publish"],
    StorefrontSectionType.CONTENT: ["view", "edit", "publish"],
    StorefrontSectionType.PRODUCTS: ["view", "edit", "publish"],
    StorefrontSectionType.SETTINGS: ["view", "edit", "publish"],
    StorefrontSectionType.BANNERS: ["view", "edit", "publish"],
    StorefrontSectionType.ASSETS: ["view", "edit", "publish", "delete"],
    StorefrontSectionType.SEO: ["view", "edit", "publish"],
}


async def set_section_permission(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    section: StorefrontSectionType,
    permissions: List[str],
    assigned_by: uuid.UUID,
) -> StorefrontPermission:
    """
    Set section-specific permissions for a user.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        user_id: UUID of the user
        section: Section to set permissions for
        permissions: List of permissions to set for the section
        assigned_by: UUID of the user performing the assignment

    Returns:
        Updated StorefrontPermission

    Raises:
        HTTPException: 404 if tenant or user not found
        HTTPException: 403 if assigner doesn't have permission
        HTTPException: 400 if invalid permission requested
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

    # Validate section
    valid_sections = [s.value for s in StorefrontSectionType]
    if section.value not in valid_sections:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid section"
        )

    # Validate permissions
    valid_permissions = SECTION_PERMISSIONS.get(section, [])
    for perm in permissions:
        if perm not in valid_permissions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid permission '{perm}' for section '{section.value}'",
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

    # Update section permissions
    section_permissions = permission.section_permissions or {}
    section_permissions[section.value] = permissions
    permission.section_permissions = section_permissions

    # Log the action in audit log
    from .storefront_permissions_utils import log_permission_change
    await log_permission_change(
        db=db,
        tenant_id=tenant_id,
        user_id=user_id,
        performed_by=assigned_by,
        action="section_permission_assigned",
        details={"section": section.value, "permissions": permissions},
    )

    await db.commit()
    await db.refresh(permission)

    return permission


async def get_section_permissions(
    db: AsyncSession, 
    tenant_id: uuid.UUID, 
    user_id: uuid.UUID, 
    section: StorefrontSectionType
) -> List[str]:
    """
    Get section-specific permissions for a user.

    Args:
        db: Database session
        tenant_id: UUID of the tenant
        user_id: UUID of the user
        section: Section to get permissions for

    Returns:
        List of permissions for the specified section

    Raises:
        HTTPException: 404 if tenant, user, or permission record not found
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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User doesn't have a permission record",
        )

    # Get section permissions
    section_permissions = permission.section_permissions or {}
    return section_permissions.get(section.value, [])
