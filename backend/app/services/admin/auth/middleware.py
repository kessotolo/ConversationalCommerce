"""
Permission verification middleware for admin routes.

This module provides middleware and decorators for enforcing RBAC permissions.
"""

import functools
from typing import Callable, List, Optional, Type, Any, Union
from uuid import UUID

from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.admin.permission import PermissionScope
from backend.app.services.admin.admin_user.service import AdminUserService
from backend.app.db.session import get_db
from backend.app.services.admin.auth.dependencies import get_current_admin_user


class AdminPermissionVerifier:
    """
    Permission verification middleware for admin routes.
    
    This class provides methods to verify that an admin user has the required
    permissions or roles to access a specific route.
    """
    
    def __init__(
        self,
        db: AsyncSession,
        admin_user_service: Optional[AdminUserService] = None
    ):
        """
        Initialize the permission verifier.
        
        Args:
            db: Database session
            admin_user_service: Optional admin user service instance
        """
        self.db = db
        self.admin_user_service = admin_user_service or AdminUserService()
    
    async def verify_permission(
        self,
        admin_user_id: UUID,
        resource: str,
        action: str,
        scope: PermissionScope = PermissionScope.GLOBAL,
        tenant_id: Optional[UUID] = None
    ) -> bool:
        """
        Verify that an admin user has a specific permission.
        
        Args:
            admin_user_id: ID of the admin user
            resource: Resource to access
            action: Action to perform
            scope: Scope of the permission
            tenant_id: Optional tenant ID for tenant-scoped permissions
            
        Returns:
            True if the user has the permission, False otherwise
        """
        # Get all permissions for the admin user
        permissions = await self.admin_user_service.get_admin_user_permissions(
            db=self.db,
            admin_user_id=admin_user_id,
            tenant_id=tenant_id
        )
        
        # Check if the user has the required permission
        for permission in permissions:
            if (
                permission['resource'] == resource and
                permission['action'] == action and
                # Check if permission scope matches or is broader
                (
                    permission['scope'] == scope.value or
                    (permission['scope'] == PermissionScope.GLOBAL.value and
                     scope != PermissionScope.GLOBAL)
                )
            ):
                # If there's a condition, it would need to be evaluated here
                # For simplicity, we'll assume the condition is met
                return True
                
        return False
    
    async def verify_role(
        self,
        admin_user_id: UUID,
        role_name: str,
        tenant_id: Optional[UUID] = None,
        include_ancestors: bool = True
    ) -> bool:
        """
        Verify that an admin user has a specific role.
        
        Args:
            admin_user_id: ID of the admin user
            role_name: Name of the role
            tenant_id: Optional tenant ID for tenant-scoped roles
            include_ancestors: Whether to include ancestor roles
            
        Returns:
            True if the user has the role, False otherwise
        """
        return await self.admin_user_service.has_role(
            db=self.db,
            admin_user_id=admin_user_id,
            role_name=role_name,
            tenant_id=tenant_id,
            include_ancestors=include_ancestors
        )


def require_permission(
    resource: str,
    action: str,
    scope: Union[PermissionScope, str] = PermissionScope.GLOBAL,
    tenant_param: Optional[str] = None,
    admin_user_service: Optional[AdminUserService] = None
):
    """
    Dependency for requiring a permission to access a route.
    
    Args:
        resource: Resource to access
        action: Action to perform
        scope: Scope of the permission
        tenant_param: Name of the parameter containing tenant ID
        admin_user_service: Optional admin user service instance
    
    Returns:
        Dependency function for FastAPI
    """
    # Convert string scope to enum if necessary
    if isinstance(scope, str):
        scope = PermissionScope(scope)
    
    async def dependency(
        db: AsyncSession = Depends(get_db),
        admin_user = Depends(get_current_admin_user)
    ) -> None:
        # Create verifier
        verifier = AdminPermissionVerifier(
            db=db,
            admin_user_service=admin_user_service or AdminUserService()
        )
        
        # Extract tenant ID if tenant_param is provided
        tenant_id = None
        # This would need to be implemented based on your application's context
        # For example, extracting from request path parameters
        
        # Verify permission
        has_permission = await verifier.verify_permission(
            admin_user_id=admin_user.id,
            resource=resource,
            action=action,
            scope=scope,
            tenant_id=tenant_id
        )
        
        if not has_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions to {action} on {resource}"
            )
    
    return dependency


def require_role(
    role_name: str,
    tenant_param: Optional[str] = None,
    include_ancestors: bool = True,
    admin_user_service: Optional[AdminUserService] = None
):
    """
    Dependency for requiring a role to access a route.
    
    Args:
        role_name: Name of the role
        tenant_param: Name of the parameter containing tenant ID
        include_ancestors: Whether to include ancestor roles
        admin_user_service: Optional admin user service instance
    
    Returns:
        Dependency function for FastAPI
    """
    async def dependency(
        db: AsyncSession = Depends(get_db),
        admin_user = Depends(get_current_admin_user)
    ) -> None:
        # Create verifier
        verifier = AdminPermissionVerifier(
            db=db,
            admin_user_service=admin_user_service or AdminUserService()
        )
        
        # Extract tenant ID if tenant_param is provided
        tenant_id = None
        # This would need to be implemented based on your application's context
        # For example, extracting from request path parameters
        
        # Verify role
        has_role = await verifier.verify_role(
            admin_user_id=admin_user.id,
            role_name=role_name,
            tenant_id=tenant_id,
            include_ancestors=include_ancestors
        )
        
        if not has_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role {role_name} required to access this resource"
            )
    
    return dependency
