"""
Role Service for the Super Admin RBAC system.

This service handles operations related to roles, including:
- Creating and managing roles
- Role hierarchy management
- Role permission assignments
"""

from typing import List, Optional, Dict, Any, Set, Tuple
from uuid import UUID

from sqlalchemy import select, and_, or_, not_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from sqlalchemy.exc import IntegrityError

from backend.app.models.admin.role import Role, RoleHierarchy
from backend.app.models.admin.role_permission import RolePermission
from backend.app.models.admin.permission import Permission
from backend.app.core.exceptions import ResourceNotFoundError, ValidationError


class RoleService:
    """Service for managing roles in the RBAC system."""

    async def create_role(
        self,
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
            ValidationError: If a role with the same name exists
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
            raise ValidationError(
                f"Role with name '{name}' already exists")

    async def get_role(
        self,
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
            ResourceNotFoundError: If the role does not exist
        """
        result = await db.execute(
            select(Role).where(Role.id == role_id)
        )
        role = result.scalars().first()
        if not role:
            raise ResourceNotFoundError("Role", role_id)
        return role

    async def get_role_by_name(
        self,
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
        self,
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
        self,
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
            ResourceNotFoundError: If the role does not exist
        """
        # Get the role to update
        role = await self.get_role(db, role_id)

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
        self,
        db: AsyncSession,
        role_id: UUID
    ) -> None:
        """
        Delete a role.

        Args:
            db: Database session
            role_id: ID of the role to delete

        Raises:
            ResourceNotFoundError: If the role does not exist
            ValueError: If attempting to delete a system role
        """
        # Check if role exists and is not a system role
        role = await self.get_role(db, role_id)
        if role.is_system:
            raise ValueError("System roles cannot be deleted")

        await db.delete(role)
        await db.flush()

    # Role Hierarchy Methods

    async def add_role_parent(
        self,
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
        child_role = await self.get_role(db, child_role_id)
        parent_role = await self.get_role(db, parent_role_id)

        # Check for circular dependency
        if await self.is_role_ancestor(db, child_role_id, parent_role_id):
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
        self,
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
        self,
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
        self,
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
        self,
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
            parents = await self.get_parent_roles(db, current_role_id)
            for parent in parents:
                if parent.id not in ancestors:
                    ancestors.add(parent.id)
                    await collect_ancestors(parent.id)

        await collect_ancestors(role_id)
        return ancestors

    async def get_all_descendant_roles(
        self,
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
            children = await self.get_child_roles(db, current_role_id)
            for child in children:
                if child.id not in descendants:
                    descendants.add(child.id)
                    await collect_descendants(child.id)

        await collect_descendants(role_id)
        return descendants

    async def is_role_ancestor(
        self,
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
        ancestors = await self.get_all_ancestor_roles(db, role_id)
        return potential_ancestor_id in ancestors

    # Role Permission Methods

    async def assign_permission_to_role(
        self,
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
            ResourceNotFoundError: If either role or permission does not exist
            ValidationError: If the permission is already assigned to the role
        """
        # Verify role and permission exist
        role = await self.get_role(db, role_id)

        # Check if the permission exists (will raise ResourceNotFoundError if not)
        from backend.app.services.admin.permission_service import PermissionService
        permission_service = PermissionService()
        permission = await permission_service.get_permission(db, permission_id)

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
            raise ValidationError(
                f"Permission {permission.resource}:{permission.action} is already assigned to role {role.name}"
            )

    async def remove_permission_from_role(
        self,
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
        self,
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
            ancestor_ids = await self.get_all_ancestor_roles(db, role_id)
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

    async def create_system_roles(
        self,
        db: AsyncSession
    ) -> Dict[str, Role]:
        """
        Create the default set of system roles.

        This method should be called during system initialization to ensure
        all necessary roles exist and have the appropriate hierarchy.

        Args:
            db: Database session

        Returns:
            Dictionary mapping role names to role objects
        """
        # Define core system roles
        system_roles = {
            "super_admin": {
                "name": "Super Admin",
                "description": "Full access to all resources across all tenants",
                "is_system": True,
                "is_tenant_scoped": False
            },
            "domain_admin": {
                "name": "Domain Admin",
                "description": "Administrative access within specific domains/tenants",
                "is_system": True,
                "is_tenant_scoped": True
            },
            "support_admin": {
                "name": "Support Admin",
                "description": "Limited administrative access for support tasks",
                "is_system": True,
                "is_tenant_scoped": False
            },
            "read_only_admin": {
                "name": "Read Only Admin",
                "description": "Read-only access to administrative resources",
                "is_system": True,
                "is_tenant_scoped": False
            }
        }

        # Create roles or get existing ones
        created_roles = {}
        for role_key, role_data in system_roles.items():
            try:
                role = await self.create_role(
                    db=db,
                    name=role_data["name"],
                    description=role_data["description"],
                    is_system=role_data["is_system"],
                    is_tenant_scoped=role_data["is_tenant_scoped"]
                )
                created_roles[role_key] = role
            except ValidationError:
                # If role already exists, get it instead
                role = await self.get_role_by_name(db, role_data["name"])
                if role:
                    created_roles[role_key] = role

        # Set up role hierarchy
        # Super Admin > Domain Admin > Support Admin > Read Only Admin
        hierarchy = [
            ("super_admin", "domain_admin"),
            ("domain_admin", "support_admin"),
            ("support_admin", "read_only_admin")
        ]

        for parent_key, child_key in hierarchy:
            if parent_key in created_roles and child_key in created_roles:
                parent_role = created_roles[parent_key]
                child_role = created_roles[child_key]
                try:
                    await self.add_role_parent(
                        db=db,
                        child_role_id=child_role.id,
                        parent_role_id=parent_role.id
                    )
                except (ValidationError, ValueError):
                    # Skip if hierarchy already exists or would create circular dependency
                    pass

        return created_roles
