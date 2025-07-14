"""
Role hierarchy management operations.
"""

from typing import List, Set
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.app.models.admin.role import Role, RoleHierarchy
from app.app.core.exceptions import ResourceNotFoundError, ValidationError
from app.app.services.admin.role.crud import get_role


async def add_role_parent(
    db: AsyncSession,
    child_role_id: UUID,
    parent_role_id: UUID
) -> RoleHierarchy:
    """
    Add a parent role to a child role, establishing a hierarchy.
    
    Args:
        db: Database session
        child_role_id: ID of the child role
        parent_role_id: ID of the parent role
        
    Returns:
        The created role hierarchy relationship
        
    Raises:
        ResourceNotFoundError: If either role does not exist
        ValidationError: If the hierarchy relationship already exists
        ValueError: If creating a circular dependency
    """
    # Verify both roles exist
    child_role = await get_role(db, child_role_id)
    parent_role = await get_role(db, parent_role_id)
    
    # Check for circular dependency
    if await is_role_ancestor(db, child_role_id, parent_role_id):
        raise ValueError(
            "Cannot add parent role: would create circular dependency"
        )
    
    # Create hierarchy relationship
    try:
        hierarchy = RoleHierarchy(
            parent_role_id=parent_role_id,
            child_role_id=child_role_id
        )
        db.add(hierarchy)
        await db.flush()
        return hierarchy
    except IntegrityError:
        await db.rollback()
        raise ValidationError(
            f"Role hierarchy from {parent_role.name} to {child_role.name} already exists"
        )


async def remove_role_parent(
    db: AsyncSession,
    child_role_id: UUID,
    parent_role_id: UUID
) -> None:
    """
    Remove a parent role from a child role.
    
    Args:
        db: Database session
        child_role_id: ID of the child role
        parent_role_id: ID of the parent role
        
    Returns:
        None
    """
    result = await db.execute(
        select(RoleHierarchy).where(
            RoleHierarchy.child_role_id == child_role_id,
            RoleHierarchy.parent_role_id == parent_role_id
        )
    )
    hierarchy = result.scalars().first()
    if hierarchy:
        await db.delete(hierarchy)
        await db.flush()


async def get_parent_roles(
    db: AsyncSession,
    role_id: UUID
) -> List[Role]:
    """
    Get all immediate parent roles of a role.
    
    Args:
        db: Database session
        role_id: ID of the role
        
    Returns:
        List of parent roles
    """
    result = await db.execute(
        select(Role)
        .join(
            RoleHierarchy,
            RoleHierarchy.parent_role_id == Role.id
        )
        .where(RoleHierarchy.child_role_id == role_id)
    )
    return list(result.scalars().all())


async def get_child_roles(
    db: AsyncSession,
    role_id: UUID
) -> List[Role]:
    """
    Get all immediate child roles of a role.
    
    Args:
        db: Database session
        role_id: ID of the role
        
    Returns:
        List of child roles
    """
    result = await db.execute(
        select(Role)
        .join(
            RoleHierarchy,
            RoleHierarchy.child_role_id == Role.id
        )
        .where(RoleHierarchy.parent_role_id == role_id)
    )
    return list(result.scalars().all())


async def get_all_ancestor_roles(
    db: AsyncSession,
    role_id: UUID,
    include_self: bool = False
) -> Set[UUID]:
    """
    Get all ancestor roles (parents, grandparents, etc.) of a role.
    
    Args:
        db: Database session
        role_id: ID of the role
        include_self: Whether to include the role itself
        
    Returns:
        Set of ancestor role IDs
    """
    # Use recursive approach to find all ancestors
    ancestors = set()
    if include_self:
        ancestors.add(role_id)
        
    async def collect_ancestors(current_role_id: UUID) -> None:
        parents = await get_parent_roles(db, current_role_id)
        for parent in parents:
            if parent.id not in ancestors:
                ancestors.add(parent.id)
                await collect_ancestors(parent.id)
                
    await collect_ancestors(role_id)
    return ancestors


async def get_all_descendant_roles(
    db: AsyncSession,
    role_id: UUID,
    include_self: bool = False
) -> Set[UUID]:
    """
    Get all descendant roles (children, grandchildren, etc.) of a role.
    
    Args:
        db: Database session
        role_id: ID of the role
        include_self: Whether to include the role itself
        
    Returns:
        Set of descendant role IDs
    """
    # Use recursive approach to find all descendants
    descendants = set()
    if include_self:
        descendants.add(role_id)
        
    async def collect_descendants(current_role_id: UUID) -> None:
        children = await get_child_roles(db, current_role_id)
        for child in children:
            if child.id not in descendants:
                descendants.add(child.id)
                await collect_descendants(child.id)
                
    await collect_descendants(role_id)
    return descendants


async def is_role_ancestor(
    db: AsyncSession,
    role_id: UUID,
    potential_ancestor_id: UUID
) -> bool:
    """
    Check if a role is an ancestor of another role.
    
    Args:
        db: Database session
        role_id: ID of the role
        potential_ancestor_id: ID of the potential ancestor role
        
    Returns:
        True if the potential ancestor is an ancestor, False otherwise
    """
    ancestors = await get_all_ancestor_roles(db, role_id)
    return potential_ancestor_id in ancestors
