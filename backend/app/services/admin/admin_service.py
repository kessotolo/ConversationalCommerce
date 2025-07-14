"""
Admin Service orchestration layer.

This service coordinates admin operations across the platform,
providing a unified interface for admin functionality.
"""

from typing import List, Optional, Dict, Any, Tuple
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.app.models.admin.admin_user import AdminUser
from app.app.models.admin.role import Role
from app.app.models.admin.permission import Permission
from app.app.services.admin.admin_user.service import AdminUserService
from app.app.services.admin.role_service import RoleService
from app.app.services.admin.permission_service import PermissionService
from app.app.core.exceptions import ResourceNotFoundError, ValidationError


class AdminService:
    """
    High-level orchestration service for admin operations.

    This service coordinates admin user management, role assignments,
    and permission checks across the platform.
    """

    def __init__(self):
        """Initialize the admin service with required sub-services."""
        self.admin_user_service = AdminUserService()
        self.role_service = RoleService()
        self.permission_service = PermissionService()

    # Admin User Management

    async def get_admin_user_by_clerk_id(
        self,
        db: AsyncSession,
        clerk_user_id: str
    ) -> Optional[AdminUser]:
        """
        Get admin user by Clerk user ID.

        Args:
            db: Database session
            clerk_user_id: Clerk user ID

        Returns:
            AdminUser if found, None otherwise
        """
        return await self.admin_user_service.get_admin_user_by_clerk_id(
            db, clerk_user_id
        )

    async def get_super_admin_user_by_clerk_id(
        self,
        db: AsyncSession,
        clerk_user_id: str
    ) -> Optional[AdminUser]:
        """
        Get super admin user by Clerk user ID.

        Args:
            db: Database session
            clerk_user_id: Clerk user ID

        Returns:
            AdminUser if found and is super admin, None otherwise
        """
        admin_user = await self.admin_user_service.get_admin_user_by_clerk_id(
            db, clerk_user_id
        )

        if admin_user and admin_user.is_super_admin:
            return admin_user

        return None

    async def create_admin_user_from_clerk(
        self,
        db: AsyncSession,
        clerk_user_id: str,
        email: str,
        is_super_admin: bool = False,
        clerk_organization_id: Optional[str] = None,
        clerk_organization_role: Optional[str] = None
    ) -> AdminUser:
        """
        Create admin user from Clerk authentication data.

        Args:
            db: Database session
            clerk_user_id: Clerk user ID
            email: User email
            is_super_admin: Whether user is a super admin
            clerk_organization_id: Clerk organization ID
            clerk_organization_role: Role within Clerk organization

        Returns:
            Created AdminUser
        """
        return await self.admin_user_service.create_admin_user_from_clerk(
            db=db,
            clerk_user_id=clerk_user_id,
            email=email,
            is_super_admin=is_super_admin,
            clerk_organization_id=clerk_organization_id,
            clerk_organization_role=clerk_organization_role
        )

    async def update_admin_user_from_clerk(
        self,
        db: AsyncSession,
        clerk_user_id: str,
        **update_data
    ) -> AdminUser:
        """
        Update admin user with Clerk data.

        Args:
            db: Database session
            clerk_user_id: Clerk user ID
            **update_data: Data to update

        Returns:
            Updated AdminUser
        """
        return await self.admin_user_service.update_admin_user_from_clerk(
            db=db,
            clerk_user_id=clerk_user_id,
            **update_data
        )

    # Role Management

    async def assign_role_to_admin_user(
        self,
        db: AsyncSession,
        clerk_user_id: str,
        role_name: str,
        tenant_id: Optional[UUID] = None
    ) -> bool:
        """
        Assign a role to an admin user.

        Args:
            db: Database session
            clerk_user_id: Clerk user ID
            role_name: Name of the role to assign
            tenant_id: Optional tenant ID for tenant-scoped roles

        Returns:
            True if role was assigned successfully
        """
        # Get the role by name
        role = await self.role_service.get_role_by_name(db, role_name)
        if not role:
            raise ResourceNotFoundError("Role", role_name)

        # Get the admin user
        admin_user = await self.get_admin_user_by_clerk_id(db, clerk_user_id)
        if not admin_user:
            raise ResourceNotFoundError("AdminUser", clerk_user_id)

        # Assign the role
        await self.admin_user_service.assign_role_to_admin_user(
            db=db,
            admin_user_id=admin_user.id,
            role_id=role.id,
            tenant_id=tenant_id
        )

        return True

    async def get_admin_user_roles(
        self,
        db: AsyncSession,
        clerk_user_id: str,
        tenant_id: Optional[UUID] = None
    ) -> List[Tuple[Role, Optional[UUID]]]:
        """
        Get all roles assigned to an admin user.

        Args:
            db: Database session
            clerk_user_id: Clerk user ID
            tenant_id: Optional tenant ID to filter roles

        Returns:
            List of (Role, tenant_id) tuples
        """
        admin_user = await self.get_admin_user_by_clerk_id(db, clerk_user_id)
        if not admin_user:
            return []

        return await self.admin_user_service.get_admin_user_roles(
            db=db,
            admin_user_id=admin_user.id,
            tenant_id=tenant_id
        )

    async def has_role(
        self,
        db: AsyncSession,
        clerk_user_id: str,
        role_name: str,
        tenant_id: Optional[UUID] = None
    ) -> bool:
        """
        Check if admin user has a specific role.

        Args:
            db: Database session
            clerk_user_id: Clerk user ID
            role_name: Name of the role to check
            tenant_id: Optional tenant ID for tenant-scoped roles

        Returns:
            True if user has the role, False otherwise
        """
        admin_user = await self.get_admin_user_by_clerk_id(db, clerk_user_id)
        if not admin_user:
            return False

        return await self.admin_user_service.has_role(
            db=db,
            admin_user_id=admin_user.id,
            role_name=role_name,
            tenant_id=tenant_id
        )

    # Permission Management

    async def get_admin_user_permissions(
        self,
        db: AsyncSession,
        clerk_user_id: str,
        tenant_id: Optional[UUID] = None
    ) -> List[Dict[str, Any]]:
        """
        Get all permissions for an admin user.

        Args:
            db: Database session
            clerk_user_id: Clerk user ID
            tenant_id: Optional tenant ID for tenant-scoped permissions

        Returns:
            List of permission dictionaries
        """
        admin_user = await self.get_admin_user_by_clerk_id(db, clerk_user_id)
        if not admin_user:
            return []

        return await self.admin_user_service.get_admin_user_permissions(
            db=db,
            admin_user_id=admin_user.id,
            tenant_id=tenant_id
        )

    async def has_permission(
        self,
        db: AsyncSession,
        clerk_user_id: str,
        resource: str,
        action: str,
        tenant_id: Optional[UUID] = None
    ) -> bool:
        """
        Check if admin user has a specific permission.

        Args:
            db: Database session
            clerk_user_id: Clerk user ID
            resource: Resource to check permission for
            action: Action to check permission for
            tenant_id: Optional tenant ID for tenant-scoped permissions

        Returns:
            True if user has the permission, False otherwise
        """
        permissions = await self.get_admin_user_permissions(
            db, clerk_user_id, tenant_id
        )

        for permission in permissions:
            if (permission["resource"] == resource and
                    permission["action"] == action):
                return True

        return False

    # System Management

    async def get_system_stats(
        self,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """
        Get system statistics for admin dashboard.

        Args:
            db: Database session

        Returns:
            Dictionary with system statistics
        """
        # Get counts
        admin_users_count = await self.admin_user_service.count_admin_users(db)
        roles_count = await self.role_service.count_roles(db)
        permissions_count = await self.permission_service.count_permissions(db)

        return {
            "admin_users_count": admin_users_count,
            "roles_count": roles_count,
            "permissions_count": permissions_count,
            "system_status": "healthy"  # Add more status checks as needed
        }

    async def validate_admin_access(
        self,
        db: AsyncSession,
        clerk_user_id: str,
        required_role: Optional[str] = None,
        required_permission: Optional[Tuple[str, str]] = None,
        tenant_id: Optional[UUID] = None
    ) -> bool:
        """
        Validate admin access with optional role and permission requirements.

        Args:
            db: Database session
            clerk_user_id: Clerk user ID
            required_role: Optional required role name
            required_permission: Optional (resource, action) tuple
            tenant_id: Optional tenant ID for scoped checks

        Returns:
            True if access is granted, False otherwise
        """
        # Check if user is an admin
        admin_user = await self.get_admin_user_by_clerk_id(db, clerk_user_id)
        if not admin_user or not admin_user.is_active:
            return False

        # Check role requirement
        if required_role:
            if not await self.has_role(db, clerk_user_id, required_role, tenant_id):
                return False

        # Check permission requirement
        if required_permission:
            resource, action = required_permission
            if not await self.has_permission(db, clerk_user_id, resource, action, tenant_id):
                return False

        return True
