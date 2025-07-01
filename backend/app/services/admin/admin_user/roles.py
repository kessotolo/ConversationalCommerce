"""
Role management operations for admin users.
"""

from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.models.admin.admin_user import AdminUser, AdminUserRole
from app.models.admin.role import Role
from app.core.errors.exception import EntityNotFoundError, DuplicateEntityError
from app.services.admin.admin_user.crud import get_admin_user


async def assign_role_to_admin_user(
    db: AsyncSession,
    admin_user_id: UUID,
    role_id: UUID,
    tenant_id: Optional[UUID] = None,
    created_by_id: Optional[UUID] = None
) -> AdminUserRole:
    """
    Assign a role to an admin user.
    
    Args:
        db: Database session
        admin_user_id: ID of the admin user
        role_id: ID of the role
        tenant_id: Optional ID of the tenant (required for tenant-scoped roles)
        created_by_id: Optional ID of the admin user who assigned this role
        
    Returns:
        The created admin user role association
        
    Raises:
        EntityNotFoundError: If either admin user or role does not exist
        ValueError: If the role is tenant-scoped but no tenant_id is provided
        DuplicateEntityError: If the role is already assigned to the admin user
    """
    # Verify admin user exists
    admin_user = await get_admin_user(db, admin_user_id)
    
    # Check if the role exists and validate tenant_id if role is tenant-scoped
    from app.services.admin.role.crud import get_role
    role = await get_role(db, role_id)
    
    if role.is_tenant_scoped and tenant_id is None:
        raise ValueError("Tenant ID is required for tenant-scoped roles")
        
    # Create admin user role association
    try:
        admin_user_role = AdminUserRole(
            admin_user_id=admin_user_id,
            role_id=role_id,
            tenant_id=tenant_id,
            created_by_id=created_by_id
        )
        db.add(admin_user_role)
        await db.flush()
        return admin_user_role
    except IntegrityError:
        await db.rollback()
        tenant_str = f" for tenant {tenant_id}" if tenant_id else ""
        raise DuplicateEntityError(
            f"Role {role.name}{tenant_str} is already assigned to admin user {admin_user_id}"
        )


async def remove_role_from_admin_user(
    db: AsyncSession,
    admin_user_id: UUID,
    role_id: UUID,
    tenant_id: Optional[UUID] = None
) -> None:
    """
    Remove a role from an admin user.
    
    Args:
        db: Database session
        admin_user_id: ID of the admin user
        role_id: ID of the role
        tenant_id: Optional ID of the tenant (for tenant-scoped roles)
        
    Returns:
        None
    """
    query = select(AdminUserRole).where(
        AdminUserRole.admin_user_id == admin_user_id,
        AdminUserRole.role_id == role_id
    )
    
    if tenant_id is not None:
        query = query.where(AdminUserRole.tenant_id == tenant_id)
    else:
        query = query.where(AdminUserRole.tenant_id.is_(None))
        
    result = await db.execute(query)
    admin_user_role = result.scalars().first()
    if admin_user_role:
        await db.delete(admin_user_role)
        await db.flush()


async def get_admin_user_roles(
    db: AsyncSession,
    admin_user_id: UUID,
    tenant_id: Optional[UUID] = None
) -> List[Tuple[Role, Optional[UUID]]]:
    """
    Get all roles assigned to an admin user.
    
    Args:
        db: Database session
        admin_user_id: ID of the admin user
        tenant_id: Optional ID of the tenant to filter by
        
    Returns:
        List of (role, tenant_id) tuples
    """
    query = (
        select(Role, AdminUserRole.tenant_id)
        .join(
            AdminUserRole,
            Role.id == AdminUserRole.role_id
        )
        .where(AdminUserRole.admin_user_id == admin_user_id)
    )
    
    if tenant_id is not None:
        query = query.where(AdminUserRole.tenant_id == tenant_id)
        
    result = await db.execute(query)
    return [(role, tenant_id) for role, tenant_id in result.all()]


async def get_admin_users_by_role(
    db: AsyncSession,
    role_id: UUID,
    tenant_id: Optional[UUID] = None
) -> List[Tuple[AdminUser, Optional[UUID]]]:
    """
    Get all admin users assigned to a role.
    
    Args:
        db: Database session
        role_id: ID of the role
        tenant_id: Optional ID of the tenant to filter by
        
    Returns:
        List of (admin_user, tenant_id) tuples
    """
    query = (
        select(AdminUser, AdminUserRole.tenant_id)
        .join(
            AdminUserRole,
            AdminUser.id == AdminUserRole.admin_user_id
        )
        .where(AdminUserRole.role_id == role_id)
    )
    
    if tenant_id is not None:
        query = query.where(AdminUserRole.tenant_id == tenant_id)
        
    result = await db.execute(query)
    return [(admin_user, tenant_id) for admin_user, tenant_id in result.all()]


async def has_role(
    db: AsyncSession,
    admin_user_id: UUID,
    role_name: str,
    tenant_id: Optional[UUID] = None,
    include_ancestors: bool = True
) -> bool:
    """
    Check if an admin user has a specific role.
    
    Args:
        db: Database session
        admin_user_id: ID of the admin user
        role_name: Name of the role
        tenant_id: Optional ID of the tenant
        include_ancestors: Whether to include ancestor roles
        
    Returns:
        True if the admin user has the role, False otherwise
    """
    # Get the role by name
    from app.services.admin.role.crud import get_role_by_name
    role = await get_role_by_name(db, role_name)
    if not role:
        return False
        
    # Get all roles assigned to the admin user
    assigned_roles = await get_admin_user_roles(
        db=db,
        admin_user_id=admin_user_id,
        tenant_id=tenant_id
    )
    
    # Check if the role is directly assigned
    for assigned_role, assigned_tenant_id in assigned_roles:
        if assigned_role.id == role.id:
            return True
            
    # If include_ancestors is True, check if any ancestor of the role is assigned
    if include_ancestors:
        # Get all assigned role IDs
        assigned_role_ids = [r.id for r, _ in assigned_roles]
        
        # For each assigned role, check if it's an ancestor of the target role
        from app.services.admin.role.hierarchy import is_role_ancestor
        for assigned_role_id in assigned_role_ids:
            is_ancestor = await is_role_ancestor(
                db=db,
                role_id=role.id,
                potential_ancestor_id=assigned_role_id
            )
            if is_ancestor:
                return True
                
    return False
