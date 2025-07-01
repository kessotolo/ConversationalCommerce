"""
Role permission management operations.
"""

from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.models.admin.role import Role
from app.models.admin.role_permission import RolePermission
from app.models.admin.permission import Permission
from app.core.errors.exception import EntityNotFoundError, DuplicateEntityError
from app.services.admin.role.crud import get_role
from app.services.admin.role.hierarchy import get_all_ancestor_roles
from app.services.admin.permission.crud import get_permission


async def assign_permission_to_role(
    db: AsyncSession,
    role_id: UUID,
    permission_id: UUID,
    condition: Optional[str] = None
) -> RolePermission:
    """
    Assign a permission to a role.
    
    Args:
        db: Database session
        role_id: ID of the role
        permission_id: ID of the permission
        condition: Optional condition expression
        
    Returns:
        The created role permission association
        
    Raises:
        EntityNotFoundError: If either role or permission does not exist
        DuplicateEntityError: If the permission is already assigned to the role
    """
    # Verify role and permission exist
    role = await get_role(db, role_id)
    permission = await get_permission(db, permission_id)
    
    # Create role permission association
    try:
        role_permission = RolePermission(
            role_id=role_id,
            permission_id=permission_id,
            condition=condition
        )
        db.add(role_permission)
        await db.flush()
        return role_permission
    except IntegrityError:
        await db.rollback()
        raise DuplicateEntityError(
            f"Permission {permission.resource}:{permission.action} is already assigned to role {role.name}"
        )


async def remove_permission_from_role(
    db: AsyncSession,
    role_id: UUID,
    permission_id: UUID
) -> None:
    """
    Remove a permission from a role.
    
    Args:
        db: Database session
        role_id: ID of the role
        permission_id: ID of the permission
        
    Returns:
        None
    """
    result = await db.execute(
        select(RolePermission).where(
            RolePermission.role_id == role_id,
            RolePermission.permission_id == permission_id
        )
    )
    role_permission = result.scalars().first()
    if role_permission:
        await db.delete(role_permission)
        await db.flush()


async def get_role_permissions(
    db: AsyncSession,
    role_id: UUID,
    include_ancestors: bool = False
) -> List[Tuple[Permission, Optional[str]]]:
    """
    Get all permissions assigned to a role.
    
    Args:
        db: Database session
        role_id: ID of the role
        include_ancestors: Whether to include permissions from ancestor roles
        
    Returns:
        List of (permission, condition) tuples
    """
    role_ids = [role_id]
    if include_ancestors:
        # Get all ancestor roles
        ancestor_ids = await get_all_ancestor_roles(db, role_id)
        role_ids.extend(ancestor_ids)
        
    # Query for permissions and their conditions
    result = await db.execute(
        select(Permission, RolePermission.condition)
        .join(
            RolePermission,
            Permission.id == RolePermission.permission_id
        )
        .where(RolePermission.role_id.in_(role_ids))
    )
    
    return [(permission, condition) for permission, condition in result.all()]
