"""
Role Service orchestration layer.

This module provides the main service interface for role management.
"""

from typing import List, Optional, Dict, Tuple, Set
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.admin.role import Role, RoleHierarchy
from backend.app.models.admin.role_permission import RolePermission
from backend.app.models.admin.permission import Permission

from backend.app.services.admin.role.crud import (
    create_role,
    get_role,
    get_role_by_name,
    list_roles,
    update_role,
    delete_role
)
from backend.app.services.admin.role.hierarchy import (
    add_role_parent,
    remove_role_parent,
    get_parent_roles,
    get_child_roles,
    get_all_ancestor_roles,
    get_all_descendant_roles,
    is_role_ancestor
)
from backend.app.services.admin.role.permissions import (
    assign_permission_to_role,
    remove_permission_from_role,
    get_role_permissions
)
from backend.app.services.admin.role.system_roles import create_system_roles


class RoleService:
    """Service orchestration for managing roles in the RBAC system."""

    # Basic CRUD operations
    
    async def create_role(
        self,
        db: AsyncSession,
        name: str,
        description: str,
        is_system: bool = False,
        is_tenant_scoped: bool = False
    ) -> Role:
        """Create a new role."""
        return await create_role(db, name, description, is_system, is_tenant_scoped)

    async def get_role(
        self,
        db: AsyncSession,
        role_id: UUID
    ) -> Role:
        """Get a role by ID."""
        return await get_role(db, role_id)

    async def get_role_by_name(
        self,
        db: AsyncSession,
        name: str
    ) -> Optional[Role]:
        """Get a role by name."""
        return await get_role_by_name(db, name)

    async def list_roles(
        self,
        db: AsyncSession,
        is_system: Optional[bool] = None,
        is_tenant_scoped: Optional[bool] = None,
    ) -> List[Role]:
        """List roles with optional filtering."""
        return await list_roles(db, is_system, is_tenant_scoped)

    async def update_role(
        self,
        db: AsyncSession,
        role_id: UUID,
        **update_data
    ) -> Role:
        """Update a role."""
        return await update_role(db, role_id, **update_data)

    async def delete_role(
        self,
        db: AsyncSession,
        role_id: UUID
    ) -> None:
        """Delete a role."""
        return await delete_role(db, role_id)

    # Role hierarchy management
    
    async def add_role_parent(
        self,
        db: AsyncSession,
        child_role_id: UUID,
        parent_role_id: UUID
    ) -> RoleHierarchy:
        """Add a parent role to a child role."""
        return await add_role_parent(db, child_role_id, parent_role_id)

    async def remove_role_parent(
        self,
        db: AsyncSession,
        child_role_id: UUID,
        parent_role_id: UUID
    ) -> None:
        """Remove a parent role from a child role."""
        return await remove_role_parent(db, child_role_id, parent_role_id)

    async def get_parent_roles(
        self,
        db: AsyncSession,
        role_id: UUID
    ) -> List[Role]:
        """Get all immediate parent roles of a role."""
        return await get_parent_roles(db, role_id)

    async def get_child_roles(
        self,
        db: AsyncSession,
        role_id: UUID
    ) -> List[Role]:
        """Get all immediate child roles of a role."""
        return await get_child_roles(db, role_id)

    async def get_all_ancestor_roles(
        self,
        db: AsyncSession,
        role_id: UUID,
        include_self: bool = False
    ) -> Set[UUID]:
        """Get all ancestor role IDs of a role."""
        return await get_all_ancestor_roles(db, role_id, include_self)

    async def get_all_descendant_roles(
        self,
        db: AsyncSession,
        role_id: UUID,
        include_self: bool = False
    ) -> Set[UUID]:
        """Get all descendant role IDs of a role."""
        return await get_all_descendant_roles(db, role_id, include_self)

    async def is_role_ancestor(
        self,
        db: AsyncSession,
        role_id: UUID,
        potential_ancestor_id: UUID
    ) -> bool:
        """Check if a role is an ancestor of another role."""
        return await is_role_ancestor(db, role_id, potential_ancestor_id)

    # Role permission management
    
    async def assign_permission_to_role(
        self,
        db: AsyncSession,
        role_id: UUID,
        permission_id: UUID,
        condition: Optional[str] = None
    ) -> RolePermission:
        """Assign a permission to a role."""
        return await assign_permission_to_role(db, role_id, permission_id, condition)

    async def remove_permission_from_role(
        self,
        db: AsyncSession,
        role_id: UUID,
        permission_id: UUID
    ) -> None:
        """Remove a permission from a role."""
        return await remove_permission_from_role(db, role_id, permission_id)

    async def get_role_permissions(
        self,
        db: AsyncSession,
        role_id: UUID,
        include_ancestors: bool = False
    ) -> List[Tuple[Permission, Optional[str]]]:
        """Get all permissions assigned to a role."""
        return await get_role_permissions(db, role_id, include_ancestors)
    
    # System role management
    
    async def create_system_roles(
        self,
        db: AsyncSession
    ) -> Dict[str, Role]:
        """Create the default set of system roles."""
        return await create_system_roles(db)
