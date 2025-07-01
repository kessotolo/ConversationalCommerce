"""
CRUD operations for the Role model.
"""

from typing import List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.models.admin.role import Role
from app.core.errors.exception import EntityNotFoundError, DuplicateEntityError


async def create_role(
    db: AsyncSession,
    name: str,
    description: str,
    is_system: bool = False,
    is_tenant_scoped: bool = False
) -> Role:
    """
    Create a new role.

    Args:
        db: Database session
        name: Name of the role
        description: Description of the role
        is_system: Whether this is a system role
        is_tenant_scoped: Whether this role is tenant-scoped

    Returns:
        The created role

    Raises:
        DuplicateEntityError: If a role with the same name exists
    """
    try:
        role = Role(
            name=name,
            description=description,
            is_system=is_system,
            is_tenant_scoped=is_tenant_scoped
        )
        db.add(role)
        await db.flush()
        return role
    except IntegrityError:
        await db.rollback()
        raise DuplicateEntityError(f"Role with name '{name}' already exists")


async def get_role(
    db: AsyncSession,
    role_id: UUID
) -> Role:
    """
    Get a role by ID.

    Args:
        db: Database session
        role_id: ID of the role to retrieve

    Returns:
        The role

    Raises:
        EntityNotFoundError: If the role does not exist
    """
    result = await db.execute(
        select(Role).where(Role.id == role_id)
    )
    role = result.scalars().first()
    if not role:
        raise EntityNotFoundError("Role", role_id)
    return role


async def get_role_by_name(
    db: AsyncSession,
    name: str
) -> Optional[Role]:
    """
    Get a role by name.

    Args:
        db: Database session
        name: Name of the role to retrieve

    Returns:
        The role if found, None otherwise
    """
    result = await db.execute(
        select(Role).where(Role.name == name)
    )
    return result.scalars().first()


async def list_roles(
    db: AsyncSession,
    is_system: Optional[bool] = None,
    is_tenant_scoped: Optional[bool] = None,
) -> List[Role]:
    """
    List roles with optional filtering.

    Args:
        db: Database session
        is_system: Filter by is_system flag
        is_tenant_scoped: Filter by is_tenant_scoped flag

    Returns:
        List of roles matching the criteria
    """
    query = select(Role)
    
    # Apply filters if provided
    if is_system is not None:
        query = query.where(Role.is_system == is_system)
    if is_tenant_scoped is not None:
        query = query.where(Role.is_tenant_scoped == is_tenant_scoped)
        
    result = await db.execute(query)
    return list(result.scalars().all())


async def update_role(
    db: AsyncSession,
    role_id: UUID,
    **update_data
) -> Role:
    """
    Update a role.

    Args:
        db: Database session
        role_id: ID of the role to update
        **update_data: Data to update on the role

    Returns:
        The updated role

    Raises:
        EntityNotFoundError: If the role does not exist
    """
    # Get the role to update
    role = await get_role(db, role_id)
    
    # Check if it's a system role that can't be modified
    if role.is_system and "is_system" not in update_data:
        raise ValueError("System roles cannot be modified")
        
    # Update attributes that are provided
    for key, value in update_data.items():
        if hasattr(role, key):
            setattr(role, key, value)
            
    await db.flush()
    return role


async def delete_role(
    db: AsyncSession,
    role_id: UUID
) -> None:
    """
    Delete a role.

    Args:
        db: Database session
        role_id: ID of the role to delete

    Raises:
        EntityNotFoundError: If the role does not exist
        ValueError: If attempting to delete a system role
    """
    # Check if role exists and is not a system role
    role = await get_role(db, role_id)
    if role.is_system:
        raise ValueError("System roles cannot be deleted")
        
    await db.delete(role)
    await db.flush()
