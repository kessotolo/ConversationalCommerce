"""
CRUD operations for the Permission model.
"""

from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.app.models.admin.permission import Permission, PermissionScope
from app.app.core.exceptions import ResourceNotFoundError, ValidationError


async def create_permission(
    db: AsyncSession,
    resource: str,
    action: str,
    scope: PermissionScope,
    description: str,
    is_system: bool = False,
    condition: Optional[str] = None
) -> Permission:
    """
    Create a new permission.

    Args:
        db: Database session
        resource: The resource this permission applies to
        action: The action this permission allows
        scope: The scope of the permission
        description: Description of what this permission allows
        is_system: Whether this is a system permission
        condition: Optional condition expression

    Returns:
        The created permission

    Raises:
        ValidationError: If a permission with the same resource, action, and scope exists
    """
    try:
        permission = Permission(
            resource=resource,
            action=action,
            scope=scope,
            description=description,
            is_system=is_system,
            condition=condition
        )
        db.add(permission)
        await db.flush()
        return permission
    except IntegrityError:
        await db.rollback()
        raise ValidationError(
            f"Permission for {resource}:{action}:{scope} already exists"
        )


async def get_permission(
    db: AsyncSession,
    permission_id: UUID
) -> Permission:
    """
    Get a permission by ID.

    Args:
        db: Database session
        permission_id: ID of the permission to retrieve

    Returns:
        The permission

    Raises:
        ResourceNotFoundError: If the permission does not exist
    """
    result = await db.execute(
        select(Permission).where(Permission.id == permission_id)
    )
    permission = result.scalars().first()
    if not permission:
        raise ResourceNotFoundError("Permission", permission_id)
    return permission


async def get_permission_by_attributes(
    db: AsyncSession,
    resource: str,
    action: str,
    scope: PermissionScope
) -> Optional[Permission]:
    """
    Get a permission by its resource, action, and scope.

    Args:
        db: Database session
        resource: The resource this permission applies to
        action: The action this permission allows
        scope: The scope of the permission

    Returns:
        The permission if found, None otherwise
    """
    result = await db.execute(
        select(Permission).where(
            Permission.resource == resource,
            Permission.action == action,
            Permission.scope == scope
        )
    )
    return result.scalars().first()


async def list_permissions(
    db: AsyncSession,
    resource: Optional[str] = None,
    scope: Optional[PermissionScope] = None,
    is_system: Optional[bool] = None
) -> List[Permission]:
    """
    List permissions with optional filtering.

    Args:
        db: Database session
        resource: Filter by resource
        scope: Filter by scope
        is_system: Filter by is_system flag

    Returns:
        List of permissions matching the criteria
    """
    query = select(Permission)
    
    # Apply filters if provided
    if resource:
        query = query.where(Permission.resource == resource)
    if scope:
        query = query.where(Permission.scope == scope)
    if is_system is not None:
        query = query.where(Permission.is_system == is_system)
        
    result = await db.execute(query)
    return list(result.scalars().all())


async def update_permission(
    db: AsyncSession,
    permission_id: UUID,
    **update_data
) -> Permission:
    """
    Update a permission.

    Args:
        db: Database session
        permission_id: ID of the permission to update
        **update_data: Data to update on the permission

    Returns:
        The updated permission

    Raises:
        ResourceNotFoundError: If the permission does not exist
    """
    # Get the permission to update
    permission = await get_permission(db, permission_id)
    
    # Check if it's a system permission that can't be modified
    if permission.is_system and "is_system" not in update_data:
        raise ValueError("System permissions cannot be modified")
        
    # Update attributes that are provided
    for key, value in update_data.items():
        if hasattr(permission, key):
            setattr(permission, key, value)
            
    await db.flush()
    return permission


async def delete_permission(
    db: AsyncSession,
    permission_id: UUID
) -> None:
    """
    Delete a permission.

    Args:
        db: Database session
        permission_id: ID of the permission to delete

    Raises:
        ResourceNotFoundError: If the permission does not exist
        ValueError: If attempting to delete a system permission
    """
    # Check if permission exists and is not a system permission
    permission = await get_permission(db, permission_id)
    if permission.is_system:
        raise ValueError("System permissions cannot be deleted")
        
    await db.delete(permission)
    await db.flush()
