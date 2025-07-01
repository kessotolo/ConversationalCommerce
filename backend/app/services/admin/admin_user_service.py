"""
Admin User Service for the Super Admin RBAC system.

This service handles operations related to admin users, including:
- Creating and managing admin users
- Assigning roles to admin users
- Admin user authentication and authorization
"""

from typing import List, Optional, Dict, Any, Set, Tuple
from uuid import UUID
from datetime import datetime
import ipaddress

from sqlalchemy import select, and_, or_, not_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from sqlalchemy.exc import IntegrityError

from app.models.admin.admin_user import AdminUser, AdminUserRole
from app.models.admin.role import Role
from app.models.user import User
from app.core.errors.exception import EntityNotFoundError, DuplicateEntityError


class AdminUserService:
    """Service for managing admin users in the RBAC system."""

    async def create_admin_user(
        self,
        db: AsyncSession,
        user_id: UUID,
        is_super_admin: bool = False,
        require_2fa: bool = True,
        allowed_ip_ranges: Optional[List[str]] = None,
        preferences: Optional[Dict[str, Any]] = None
    ) -> AdminUser:
        """
        Create a new admin user.

        Args:
            db: Database session
            user_id: ID of the base user to associate with the admin user
            is_super_admin: Whether this is a super admin
            require_2fa: Whether 2FA is required for this admin user
            allowed_ip_ranges: List of allowed IP ranges for this admin user
            preferences: Admin interface preferences

        Returns:
            The created admin user

        Raises:
            EntityNotFoundError: If the user does not exist
            DuplicateEntityError: If an admin user already exists for this user
        """
        # Verify user exists
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalars().first()
        if not user:
            raise EntityNotFoundError("User", user_id)
            
        # Validate IP ranges if provided
        if allowed_ip_ranges:
            for ip_range in allowed_ip_ranges:
                try:
                    ipaddress.ip_network(ip_range)
                except ValueError:
                    raise ValueError(f"Invalid IP range: {ip_range}")
        
        try:
            admin_user = AdminUser(
                user_id=user_id,
                is_super_admin=is_super_admin,
                require_2fa=require_2fa,
                allowed_ip_ranges=allowed_ip_ranges,
                preferences=preferences or {}
            )
            db.add(admin_user)
            await db.flush()
            return admin_user
        except IntegrityError:
            await db.rollback()
            raise DuplicateEntityError(f"Admin user already exists for user {user_id}")

    async def get_admin_user(
        self,
        db: AsyncSession,
        admin_user_id: UUID
    ) -> AdminUser:
        """
        Get an admin user by ID.

        Args:
            db: Database session
            admin_user_id: ID of the admin user to retrieve

        Returns:
            The admin user

        Raises:
            EntityNotFoundError: If the admin user does not exist
        """
        result = await db.execute(
            select(AdminUser).where(AdminUser.id == admin_user_id)
        )
        admin_user = result.scalars().first()
        if not admin_user:
            raise EntityNotFoundError("AdminUser", admin_user_id)
        return admin_user

    async def get_admin_user_by_user_id(
        self,
        db: AsyncSession,
        user_id: UUID
    ) -> Optional[AdminUser]:
        """
        Get an admin user by user ID.

        Args:
            db: Database session
            user_id: ID of the base user

        Returns:
            The admin user if found, None otherwise
        """
        result = await db.execute(
            select(AdminUser).where(AdminUser.user_id == user_id)
        )
        return result.scalars().first()

    async def list_admin_users(
        self,
        db: AsyncSession,
        is_active: Optional[bool] = None,
        is_super_admin: Optional[bool] = None
    ) -> List[AdminUser]:
        """
        List admin users with optional filtering.

        Args:
            db: Database session
            is_active: Filter by is_active flag
            is_super_admin: Filter by is_super_admin flag

        Returns:
            List of admin users matching the criteria
        """
        query = select(AdminUser)
        
        # Apply filters if provided
        if is_active is not None:
            query = query.where(AdminUser.is_active == is_active)
        if is_super_admin is not None:
            query = query.where(AdminUser.is_super_admin == is_super_admin)
            
        result = await db.execute(query)
        return list(result.scalars().all())

    async def update_admin_user(
        self,
        db: AsyncSession,
        admin_user_id: UUID,
        **update_data
    ) -> AdminUser:
        """
        Update an admin user.

        Args:
            db: Database session
            admin_user_id: ID of the admin user to update
            **update_data: Data to update on the admin user

        Returns:
            The updated admin user

        Raises:
            EntityNotFoundError: If the admin user does not exist
        """
        # Get the admin user to update
        admin_user = await self.get_admin_user(db, admin_user_id)
        
        # Validate IP ranges if provided
        if "allowed_ip_ranges" in update_data and update_data["allowed_ip_ranges"]:
            for ip_range in update_data["allowed_ip_ranges"]:
                try:
                    ipaddress.ip_network(ip_range)
                except ValueError:
                    raise ValueError(f"Invalid IP range: {ip_range}")
            
        # Update attributes that are provided
        for key, value in update_data.items():
            if hasattr(admin_user, key):
                setattr(admin_user, key, value)
                
        await db.flush()
        return admin_user

    async def delete_admin_user(
        self,
        db: AsyncSession,
        admin_user_id: UUID
    ) -> None:
        """
        Delete an admin user.

        Args:
            db: Database session
            admin_user_id: ID of the admin user to delete

        Raises:
            EntityNotFoundError: If the admin user does not exist
        """
        admin_user = await self.get_admin_user(db, admin_user_id)
        await db.delete(admin_user)
        await db.flush()
    
    async def record_login(
        self,
        db: AsyncSession,
        admin_user_id: UUID,
        login_ip: str
    ) -> AdminUser:
        """
        Record a successful login for an admin user.
        
        Args:
            db: Database session
            admin_user_id: ID of the admin user
            login_ip: IP address of the client
            
        Returns:
            The updated admin user
        """
        admin_user = await self.get_admin_user(db, admin_user_id)
        admin_user.last_login_at = datetime.now()
        admin_user.last_login_ip = login_ip
        await db.flush()
        return admin_user
        
    async def is_ip_allowed(
        self,
        admin_user: AdminUser,
        ip_address: str
    ) -> bool:
        """
        Check if an IP address is allowed for the admin user.
        
        Args:
            admin_user: Admin user to check
            ip_address: IP address to check
            
        Returns:
            True if the IP is allowed, False otherwise
        """
        # If no IP restrictions are set, allow all IPs
        if not admin_user.allowed_ip_ranges:
            return True
            
        try:
            client_ip = ipaddress.ip_address(ip_address)
            for range_str in admin_user.allowed_ip_ranges:
                ip_range = ipaddress.ip_network(range_str)
                if client_ip in ip_range:
                    return True
            return False
        except ValueError:
            # If IP parsing fails, deny access
            return False

    # Role Assignment Methods
    
    async def assign_role_to_admin_user(
        self,
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
        # Verify admin user and role exist
        admin_user = await self.get_admin_user(db, admin_user_id)
        
        # Check if the role exists and validate tenant_id if role is tenant-scoped
        from app.services.admin.role_service import RoleService
        role_service = RoleService()
        role = await role_service.get_role(db, role_id)
        
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
        self,
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
        self,
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
        self,
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
        self,
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
        from app.services.admin.role_service import RoleService
        role_service = RoleService()
        role = await role_service.get_role_by_name(db, role_name)
        if not role:
            return False
            
        # Get all roles assigned to the admin user
        assigned_roles = await self.get_admin_user_roles(
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
            for assigned_role_id in assigned_role_ids:
                is_ancestor = await role_service.is_role_ancestor(
                    db=db,
                    role_id=role.id,
                    potential_ancestor_id=assigned_role_id
                )
                if is_ancestor:
                    return True
                    
        return False
