"""
Permission Service orchestration layer.

This module provides the main service interface for permission management.
"""

from typing import List, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.admin.permission import Permission, PermissionScope
from backend.app.services.admin.permission.crud import (
    create_permission,
    get_permission,
    get_permission_by_attributes,
    list_permissions,
    update_permission,
    delete_permission
)
from backend.app.services.admin.permission.system_permissions import create_system_permissions


class PermissionService:
    """Service orchestration for managing permissions in the RBAC system."""

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
        """Create a new permission."""
        return await create_permission(
            db, resource, action, scope, description, is_system, condition
        )

    async def get_permission(
        self,
        db: AsyncSession,
        permission_id: UUID
    ) -> Permission:
        """Get a permission by ID."""
        return await get_permission(db, permission_id)

    async def get_permission_by_attributes(
        self,
        db: AsyncSession,
        resource: str,
        action: str,
        scope: PermissionScope
    ) -> Optional[Permission]:
        """Get a permission by its resource, action, and scope."""
        return await get_permission_by_attributes(db, resource, action, scope)

    async def list_permissions(
        self,
        db: AsyncSession,
        resource: Optional[str] = None,
        scope: Optional[PermissionScope] = None,
        is_system: Optional[bool] = None
    ) -> List[Permission]:
        """List permissions with optional filtering."""
        return await list_permissions(db, resource, scope, is_system)

    async def update_permission(
        self,
        db: AsyncSession,
        permission_id: UUID,
        **update_data
    ) -> Permission:
        """Update a permission."""
        return await update_permission(db, permission_id, **update_data)

    async def delete_permission(
        self,
        db: AsyncSession,
        permission_id: UUID
    ) -> None:
        """Delete a permission."""
        return await delete_permission(db, permission_id)

    async def create_system_permissions(
        self,
        db: AsyncSession
    ) -> List[Permission]:
        """Create the default set of system permissions."""
        return await create_system_permissions(db)
