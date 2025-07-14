"""
AdminUser Service orchestration layer.

This module provides the main service interface for admin user management.
"""

from typing import List, Optional, Dict, Any, Tuple
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.admin.admin_user import AdminUser, AdminUserRole
from app.models.admin.role import Role

from app.services.admin.admin_user.crud import (
    create_admin_user,
    get_admin_user,
    get_admin_user_by_user_id,
    list_admin_users,
    update_admin_user,
    delete_admin_user,
    record_login
)
from app.services.admin.admin_user.roles import (
    assign_role_to_admin_user,
    remove_role_from_admin_user,
    get_admin_user_roles,
    get_admin_users_by_role,
    has_role
)
from app.services.admin.admin_user.auth import (
    is_ip_allowed,
    verify_admin_access,
    get_admin_user_permissions
)


class AdminUserService:
    """Service orchestration for managing admin users in the RBAC system."""

    # Basic CRUD operations

    async def create_admin_user(
        self,
        db: AsyncSession,
        user_id: UUID,
        is_super_admin: bool = False,
        require_2fa: bool = True,
        allowed_ip_ranges: Optional[List[str]] = None,
        preferences: Optional[Dict[str, Any]] = None
    ) -> AdminUser:
        """Create a new admin user."""
        return await create_admin_user(
            db, user_id, is_super_admin, require_2fa, allowed_ip_ranges, preferences
        )

    async def get_admin_user(
        self,
        db: AsyncSession,
        admin_user_id: UUID
    ) -> AdminUser:
        """Get an admin user by ID."""
        return await get_admin_user(db, admin_user_id)

    async def get_admin_user_by_user_id(
        self,
        db: AsyncSession,
        user_id: UUID
    ) -> Optional[AdminUser]:
        """Get an admin user by user ID."""
        return await get_admin_user_by_user_id(db, user_id)

    async def list_admin_users(
        self,
        db: AsyncSession,
        is_active: Optional[bool] = None,
        is_super_admin: Optional[bool] = None
    ) -> List[AdminUser]:
        """List admin users with optional filtering."""
        return await list_admin_users(db, is_active, is_super_admin)

    async def update_admin_user(
        self,
        db: AsyncSession,
        admin_user_id: UUID,
        **update_data
    ) -> AdminUser:
        """Update an admin user."""
        return await update_admin_user(db, admin_user_id, **update_data)

    async def delete_admin_user(
        self,
        db: AsyncSession,
        admin_user_id: UUID
    ) -> None:
        """Delete an admin user."""
        return await delete_admin_user(db, admin_user_id)

    async def record_login(
        self,
        db: AsyncSession,
        admin_user_id: UUID,
        login_ip: str
    ) -> AdminUser:
        """Record a successful login for an admin user."""
        return await record_login(db, admin_user_id, login_ip)

    # Clerk-specific operations

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
        from sqlalchemy import select

        result = await db.execute(
            select(AdminUser).where(AdminUser.id == clerk_user_id)
        )
        return result.scalars().first()

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
        admin_user = AdminUser(
            id=clerk_user_id,
            email=email,
            is_super_admin=is_super_admin,
            clerk_organization_id=clerk_organization_id,
            clerk_organization_role=clerk_organization_role,
            is_active=True,
            require_2fa=True,
            allowed_ip_ranges=[],
            preferences={}
        )

        db.add(admin_user)
        await db.flush()
        return admin_user

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
        admin_user = await self.get_admin_user_by_clerk_id(db, clerk_user_id)
        if not admin_user:
            raise ValueError(
                f"Admin user not found for Clerk ID: {clerk_user_id}")

        for key, value in update_data.items():
            if hasattr(admin_user, key):
                setattr(admin_user, key, value)

        await db.flush()
        return admin_user

    # Role management

    async def assign_role_to_admin_user(
        self,
        db: AsyncSession,
        admin_user_id: UUID,
        role_id: UUID,
        tenant_id: Optional[UUID] = None,
        created_by_id: Optional[UUID] = None
    ) -> AdminUserRole:
        """Assign a role to an admin user."""
        return await assign_role_to_admin_user(
            db, admin_user_id, role_id, tenant_id, created_by_id
        )

    async def remove_role_from_admin_user(
        self,
        db: AsyncSession,
        admin_user_id: UUID,
        role_id: UUID,
        tenant_id: Optional[UUID] = None
    ) -> None:
        """Remove a role from an admin user."""
        return await remove_role_from_admin_user(
            db, admin_user_id, role_id, tenant_id
        )

    async def get_admin_user_roles(
        self,
        db: AsyncSession,
        admin_user_id: UUID,
        tenant_id: Optional[UUID] = None
    ) -> List[Tuple[Role, Optional[UUID]]]:
        """Get all roles assigned to an admin user."""
        return await get_admin_user_roles(db, admin_user_id, tenant_id)

    async def get_admin_users_by_role(
        self,
        db: AsyncSession,
        role_id: UUID,
        tenant_id: Optional[UUID] = None
    ) -> List[Tuple[AdminUser, Optional[UUID]]]:
        """Get all admin users assigned to a role."""
        return await get_admin_users_by_role(db, role_id, tenant_id)

    async def has_role(
        self,
        db: AsyncSession,
        admin_user_id: UUID,
        role_name: str,
        tenant_id: Optional[UUID] = None,
        include_ancestors: bool = True
    ) -> bool:
        """Check if an admin user has a specific role."""
        return await has_role(
            db, admin_user_id, role_name, tenant_id, include_ancestors
        )

    # Authentication and authorization

    def is_ip_allowed(
        self,
        ip_address: str,
        allowed_ranges: List[str]
    ) -> bool:
        """Check if an IP address is within any of the allowed ranges."""
        return is_ip_allowed(ip_address, allowed_ranges)

    async def verify_admin_access(
        self,
        db: AsyncSession,
        admin_user: AdminUser,
        ip_address: Optional[str] = None,
        require_2fa: bool = True
    ) -> bool:
        """Verify if an admin user has access."""
        return await verify_admin_access(
            db, admin_user, ip_address, require_2fa
        )

    async def get_admin_user_permissions(
        self,
        db: AsyncSession,
        admin_user_id: UUID,
        tenant_id: Optional[UUID] = None
    ) -> List[dict]:
        """Get all permissions an admin user has through their roles."""
        return await get_admin_user_permissions(db, admin_user_id, tenant_id)
