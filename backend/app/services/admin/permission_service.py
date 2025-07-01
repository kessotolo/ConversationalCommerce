"""
Permission Service for the Super Admin RBAC system.

This service handles operations related to permissions, including:
- Creating and managing permissions
- Retrieving permissions
- Permission assignment validation
"""

from typing import List, Optional, Dict, Any
from uuid import UUID

from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.models.admin.permission import Permission, PermissionScope
from app.core.errors.exception import EntityNotFoundError, DuplicateEntityError


class PermissionService:
    """Service for managing permissions in the RBAC system."""

    async def create_permission(
        self,
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
            DuplicateEntityError: If a permission with the same resource, action, and scope exists
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
            raise DuplicateEntityError(
                f"Permission for {resource}:{action}:{scope} already exists"
            )

    async def get_permission(
        self,
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
            EntityNotFoundError: If the permission does not exist
        """
        result = await db.execute(
            select(Permission).where(Permission.id == permission_id)
        )
        permission = result.scalars().first()
        if not permission:
            raise EntityNotFoundError("Permission", permission_id)
        return permission

    async def get_permission_by_attributes(
        self,
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
        self,
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
        self,
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
            EntityNotFoundError: If the permission does not exist
        """
        # Get the permission to update
        permission = await self.get_permission(db, permission_id)
        
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
        self,
        db: AsyncSession,
        permission_id: UUID
    ) -> None:
        """
        Delete a permission.

        Args:
            db: Database session
            permission_id: ID of the permission to delete

        Raises:
            EntityNotFoundError: If the permission does not exist
            ValueError: If attempting to delete a system permission
        """
        # Check if permission exists and is not a system permission
        permission = await self.get_permission(db, permission_id)
        if permission.is_system:
            raise ValueError("System permissions cannot be deleted")
            
        await db.delete(permission)
        await db.flush()
        
    async def create_system_permissions(
        self,
        db: AsyncSession
    ) -> List[Permission]:
        """
        Create the default set of system permissions.
        
        This method should be called during system initialization to ensure
        all necessary permissions exist.

        Args:
            db: Database session

        Returns:
            List of created permissions
        """
        # Define core system resources
        resources = [
            "user", "tenant", "role", "permission", "admin_user",
            "product", "order", "storefront"
        ]
        
        # Define standard actions
        actions = ["create", "read", "update", "delete", "list"]
        
        # Create system permissions
        created_permissions = []
        
        # Global admin permissions (for Super Admin)
        for resource in resources:
            for action in actions:
                try:
                    permission = await self.create_permission(
                        db=db,
                        resource=resource,
                        action=action,
                        scope=PermissionScope.GLOBAL,
                        description=f"Global permission to {action} {resource}s across all tenants",
                        is_system=True
                    )
                    created_permissions.append(permission)
                except DuplicateEntityError:
                    # If permission already exists, get it instead
                    permission = await self.get_permission_by_attributes(
                        db=db,
                        resource=resource,
                        action=action,
                        scope=PermissionScope.GLOBAL
                    )
                    if permission:
                        created_permissions.append(permission)
        
        # Tenant-scoped permissions (for Domain Admin)
        for resource in resources:
            for action in actions:
                try:
                    permission = await self.create_permission(
                        db=db,
                        resource=resource,
                        action=action,
                        scope=PermissionScope.TENANT,
                        description=f"Permission to {action} {resource}s within a tenant",
                        is_system=True
                    )
                    created_permissions.append(permission)
                except DuplicateEntityError:
                    # If permission already exists, get it instead
                    permission = await self.get_permission_by_attributes(
                        db=db,
                        resource=resource,
                        action=action,
                        scope=PermissionScope.TENANT
                    )
                    if permission:
                        created_permissions.append(permission)
                        
        # Add special permissions
        special_permissions = [
            {
                "resource": "system",
                "action": "manage_settings",
                "scope": PermissionScope.GLOBAL,
                "description": "Manage global system settings"
            },
            {
                "resource": "system",
                "action": "view_dashboard",
                "scope": PermissionScope.GLOBAL,
                "description": "View global system dashboard"
            },
            {
                "resource": "user",
                "action": "impersonate",
                "scope": PermissionScope.GLOBAL,
                "description": "Impersonate any user across the platform"
            },
            {
                "resource": "user",
                "action": "impersonate",
                "scope": PermissionScope.TENANT,
                "description": "Impersonate users within a tenant"
            },
            {
                "resource": "feature_flag",
                "action": "manage",
                "scope": PermissionScope.GLOBAL,
                "description": "Manage feature flags across the platform"
            },
            {
                "resource": "feature_flag",
                "action": "manage",
                "scope": PermissionScope.TENANT,
                "description": "Manage feature flags for a tenant"
            }
        ]
        
        for perm in special_permissions:
            try:
                permission = await self.create_permission(
                    db=db,
                    resource=perm["resource"],
                    action=perm["action"],
                    scope=perm["scope"],
                    description=perm["description"],
                    is_system=True
                )
                created_permissions.append(permission)
            except DuplicateEntityError:
                # If permission already exists, get it instead
                permission = await self.get_permission_by_attributes(
                    db=db,
                    resource=perm["resource"],
                    action=perm["action"],
                    scope=perm["scope"]
                )
                if permission:
                    created_permissions.append(permission)
                    
        return created_permissions
