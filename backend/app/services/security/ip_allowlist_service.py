"""
IP Allowlisting service.

This service provides functionality for:
- Managing IP allowlist entries
- Checking if an IP is allowed for a given user/role/tenant
- Managing temporary bypasses
"""

import uuid
import ipaddress
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any, Union

from sqlalchemy import select, update, delete, and_, or_, not_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.security.ip_allowlist import IPAllowlistEntry, IPAllowlistSetting, IPTemporaryBypass
from app.models.admin.admin_user import AdminUser
from app.services.audit.audit_service import AuditService


class IPAllowlistService:
    """Service for managing IP allowlisting."""
    
    def __init__(self):
        self.audit_service = AuditService()
    
    async def add_allowlist_entry(
        self,
        db: AsyncSession,
        ip_range: str,
        description: Optional[str] = None,
        user_id: Optional[uuid.UUID] = None,
        role_id: Optional[uuid.UUID] = None,
        tenant_id: Optional[uuid.UUID] = None,
        is_global: bool = False,
        expires_at: Optional[datetime] = None,
        created_by: uuid.UUID = None
    ) -> IPAllowlistEntry:
        """
        Add a new IP allowlist entry.
        
        Args:
            db: Database session
            ip_range: IP address or CIDR range
            description: Optional description
            user_id: Optional user ID to restrict to
            role_id: Optional role ID to restrict to
            tenant_id: Optional tenant ID to restrict to
            is_global: Whether this is a global entry
            expires_at: Optional expiration date
            created_by: ID of the admin creating the entry
            
        Returns:
            The created IP allowlist entry
        """
        # Validate IP range
        try:
            # This will raise ValueError if invalid
            ipaddress.ip_network(ip_range)
        except ValueError:
            raise ValueError(f"Invalid IP address or CIDR range: {ip_range}")
        
        # Check if entry already exists
        query = select(IPAllowlistEntry).where(
            IPAllowlistEntry.ip_range == ip_range,
            IPAllowlistEntry.user_id == user_id,
            IPAllowlistEntry.role_id == role_id,
            IPAllowlistEntry.tenant_id == tenant_id,
            IPAllowlistEntry.is_global == is_global
        )
        
        result = await db.execute(query)
        existing_entry = result.scalars().first()
        
        if existing_entry:
            # Update existing entry
            existing_entry.description = description
            existing_entry.expires_at = expires_at
            existing_entry.is_active = True
            existing_entry.updated_at = datetime.now(timezone.utc)
            entry = existing_entry
        else:
            # Create new entry
            entry = IPAllowlistEntry(
                ip_range=ip_range,
                description=description,
                user_id=user_id,
                role_id=role_id,
                tenant_id=tenant_id,
                is_global=is_global,
                expires_at=expires_at,
                is_active=True,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
                created_by=created_by
            )
            db.add(entry)
        
        await db.commit()
        await db.refresh(entry)
        
        # Determine the scope for audit logging
        scope = "global" if is_global else ""
        if user_id:
            scope = f"user:{user_id}"
        elif role_id:
            scope = f"role:{role_id}"
        elif tenant_id:
            scope = f"tenant:{tenant_id}"
            
        # Log this action in the audit log
        await self.audit_service.log_event(
            db=db,
            user_id=created_by,
            action="ip_allowlist_entry_added",
            resource_type="ip_allowlist",
            resource_id=str(entry.id),
            tenant_id=tenant_id,
            status="success",
            details={
                "ip_range": ip_range,
                "scope": scope,
                "expires_at": expires_at.isoformat() if expires_at else None
            }
        )
        
        return entry
    
    async def remove_allowlist_entry(
        self,
        db: AsyncSession,
        entry_id: uuid.UUID,
        admin_user_id: uuid.UUID
    ) -> bool:
        """
        Remove an IP allowlist entry.
        
        Args:
            db: Database session
            entry_id: ID of the entry to remove
            admin_user_id: ID of the admin performing the action
            
        Returns:
            True if the entry was removed, False otherwise
        """
        # Get the entry
        query = select(IPAllowlistEntry).where(IPAllowlistEntry.id == entry_id)
        result = await db.execute(query)
        entry = result.scalars().first()
        
        if not entry:
            return False
        
        # Store info for audit log
        entry_info = {
            "ip_range": str(entry.ip_range),
            "user_id": str(entry.user_id) if entry.user_id else None,
            "role_id": str(entry.role_id) if entry.role_id else None,
            "tenant_id": str(entry.tenant_id) if entry.tenant_id else None,
            "is_global": entry.is_global
        }
        
        # Delete the entry
        await db.delete(entry)
        await db.commit()
        
        # Log this action in the audit log
        await self.audit_service.log_event(
            db=db,
            user_id=admin_user_id,
            action="ip_allowlist_entry_removed",
            resource_type="ip_allowlist",
            resource_id=str(entry_id),
            tenant_id=entry.tenant_id,
            status="success",
            details=entry_info
        )
        
        return True
    
    async def is_ip_allowed(
        self,
        db: AsyncSession,
        ip_address: str,
        user_id: uuid.UUID,
        roles: List[uuid.UUID] = None,
        tenant_id: Optional[uuid.UUID] = None
    ) -> bool:
        """
        Check if an IP address is allowed for a user.
        
        Args:
            db: Database session
            ip_address: IP address to check
            user_id: ID of the user
            roles: Optional list of role IDs
            tenant_id: Optional tenant ID
            
        Returns:
            True if the IP is allowed, False otherwise
        """
        roles = roles or []
        
        # First, check if allowlisting is enforced
        is_enforced = await self._is_allowlisting_enforced(db, user_id, roles, tenant_id)
        
        if not is_enforced:
            return True
        
        # Check for a temporary bypass
        has_bypass = await self.has_temporary_bypass(db, user_id, ip_address)
        
        if has_bypass:
            return True
        
        # Convert IP address to network object for comparison
        try:
            check_ip = ipaddress.ip_address(ip_address)
        except ValueError:
            return False  # Invalid IP format
        
        # Check for matching allowlist entries
        current_time = datetime.now(timezone.utc)
        
        # Start with user-specific entries
        query = select(IPAllowlistEntry).where(
            IPAllowlistEntry.user_id == user_id,
            IPAllowlistEntry.is_active == True,
            or_(
                IPAllowlistEntry.expires_at == None,
                IPAllowlistEntry.expires_at > current_time
            )
        )
        
        result = await db.execute(query)
        user_entries = result.scalars().all()
        
        # Check each entry
        for entry in user_entries:
            entry_network = ipaddress.ip_network(entry.ip_range)
            if check_ip in entry_network:
                return True
        
        # Check role-specific entries
        if roles:
            query = select(IPAllowlistEntry).where(
                IPAllowlistEntry.role_id.in_(roles),
                IPAllowlistEntry.is_active == True,
                or_(
                    IPAllowlistEntry.expires_at == None,
                    IPAllowlistEntry.expires_at > current_time
                )
            )
            
            result = await db.execute(query)
            role_entries = result.scalars().all()
            
            for entry in role_entries:
                entry_network = ipaddress.ip_network(entry.ip_range)
                if check_ip in entry_network:
                    return True
        
        # Check tenant-specific entries
        if tenant_id:
            query = select(IPAllowlistEntry).where(
                IPAllowlistEntry.tenant_id == tenant_id,
                IPAllowlistEntry.is_active == True,
                or_(
                    IPAllowlistEntry.expires_at == None,
                    IPAllowlistEntry.expires_at > current_time
                )
            )
            
            result = await db.execute(query)
            tenant_entries = result.scalars().all()
            
            for entry in tenant_entries:
                entry_network = ipaddress.ip_network(entry.ip_range)
                if check_ip in entry_network:
                    return True
        
        # Check global entries
        query = select(IPAllowlistEntry).where(
            IPAllowlistEntry.is_global == True,
            IPAllowlistEntry.is_active == True,
            or_(
                IPAllowlistEntry.expires_at == None,
                IPAllowlistEntry.expires_at > current_time
            )
        )
        
        result = await db.execute(query)
        global_entries = result.scalars().all()
        
        for entry in global_entries:
            entry_network = ipaddress.ip_network(entry.ip_range)
            if check_ip in entry_network:
                return True
        
        # No matching entries found
        return False
    
    async def _is_allowlisting_enforced(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        roles: List[uuid.UUID],
        tenant_id: Optional[uuid.UUID]
    ) -> bool:
        """
        Check if IP allowlisting is enforced for a user.
        
        Args:
            db: Database session
            user_id: ID of the user
            roles: List of role IDs
            tenant_id: Optional tenant ID
            
        Returns:
            True if allowlisting is enforced, False otherwise
        """
        # Check role+tenant specific setting
        if roles and tenant_id:
            query = select(IPAllowlistSetting).where(
                IPAllowlistSetting.role_id.in_(roles),
                IPAllowlistSetting.tenant_id == tenant_id,
                IPAllowlistSetting.is_enforced == True
            )
            
            result = await db.execute(query)
            if result.scalars().first():
                return True
        
        # Check role-specific setting
        if roles:
            query = select(IPAllowlistSetting).where(
                IPAllowlistSetting.role_id.in_(roles),
                IPAllowlistSetting.tenant_id == None,
                IPAllowlistSetting.is_enforced == True
            )
            
            result = await db.execute(query)
            if result.scalars().first():
                return True
        
        # Check tenant-specific setting
        if tenant_id:
            query = select(IPAllowlistSetting).where(
                IPAllowlistSetting.tenant_id == tenant_id,
                IPAllowlistSetting.role_id == None,
                IPAllowlistSetting.is_enforced == True
            )
            
            result = await db.execute(query)
            if result.scalars().first():
                return True
        
        # Check global setting
        query = select(IPAllowlistSetting).where(
            IPAllowlistSetting.tenant_id == None,
            IPAllowlistSetting.role_id == None,
            IPAllowlistSetting.is_enforced == True
        )
        
        result = await db.execute(query)
        return result.scalars().first() is not None
    
    async def create_temporary_bypass(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        ip_address: str,
        duration_minutes: int = 60,
        reason: Optional[str] = None,
        user_agent: Optional[str] = None,
        verification_method: str = "email"
    ) -> IPTemporaryBypass:
        """
        Create a temporary bypass for a user's IP address.
        
        Args:
            db: Database session
            user_id: ID of the user
            ip_address: IP address to bypass
            duration_minutes: Duration of the bypass in minutes
            reason: Optional reason for the bypass
            user_agent: User agent string
            verification_method: Method used to verify the user
            
        Returns:
            The created temporary bypass record
        """
        # Calculate expiration time
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=duration_minutes)
        
        # Create bypass record
        bypass = IPTemporaryBypass(
            user_id=user_id,
            ip_address=ip_address,
            created_at=datetime.now(timezone.utc),
            expires_at=expires_at,
            reason=reason,
            user_agent=user_agent,
            verification_method=verification_method
        )
        
        db.add(bypass)
        await db.commit()
        await db.refresh(bypass)
        
        # Log this action in the audit log
        await self.audit_service.log_event(
            db=db,
            user_id=user_id,
            action="ip_temporary_bypass_created",
            resource_type="ip_bypass",
            resource_id=str(bypass.id),
            status="success",
            details={
                "ip_address": ip_address,
                "expires_at": expires_at.isoformat(),
                "verification_method": verification_method
            }
        )
        
        return bypass
    
    async def has_temporary_bypass(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        ip_address: str
    ) -> bool:
        """
        Check if a user has a temporary bypass for an IP address.
        
        Args:
            db: Database session
            user_id: ID of the user
            ip_address: IP address to check
            
        Returns:
            True if the user has a valid temporary bypass, False otherwise
        """
        # Get current time
        current_time = datetime.now(timezone.utc)
        
        # Check for valid bypass
        query = select(IPTemporaryBypass).where(
            IPTemporaryBypass.user_id == user_id,
            IPTemporaryBypass.ip_address == ip_address,
            IPTemporaryBypass.expires_at > current_time
        )
        
        result = await db.execute(query)
        return result.scalars().first() is not None
    
    async def set_allowlist_enforcement(
        self,
        db: AsyncSession,
        is_enforced: bool,
        role_id: Optional[uuid.UUID] = None,
        tenant_id: Optional[uuid.UUID] = None,
        allow_temporary_bypass: bool = True,
        temporary_bypass_duration_minutes: int = 60,
        geo_restrict_countries: Optional[List[str]] = None,
        geo_block_countries: Optional[List[str]] = None,
        admin_user_id: uuid.UUID = None
    ) -> IPAllowlistSetting:
        """
        Set IP allowlisting enforcement settings.
        
        Args:
            db: Database session
            is_enforced: Whether allowlisting is enforced
            role_id: Optional role ID
            tenant_id: Optional tenant ID
            allow_temporary_bypass: Whether temporary bypasses are allowed
            temporary_bypass_duration_minutes: Duration of temporary bypasses
            geo_restrict_countries: Optional list of countries to restrict to
            geo_block_countries: Optional list of countries to block
            admin_user_id: ID of the admin setting the enforcement
            
        Returns:
            The created/updated setting record
        """
        # Check if a setting already exists
        query = select(IPAllowlistSetting).where(
            IPAllowlistSetting.role_id == role_id,
            IPAllowlistSetting.tenant_id == tenant_id
        )
        
        result = await db.execute(query)
        setting = result.scalars().first()
        
        if setting:
            # Update existing setting
            setting.is_enforced = is_enforced
            setting.allow_temporary_bypass = allow_temporary_bypass
            setting.temporary_bypass_duration_minutes = temporary_bypass_duration_minutes
            setting.geo_restrict_countries = geo_restrict_countries
            setting.geo_block_countries = geo_block_countries
            setting.updated_at = datetime.now(timezone.utc)
            setting.updated_by = admin_user_id
        else:
            # Create new setting
            setting = IPAllowlistSetting(
                role_id=role_id,
                tenant_id=tenant_id,
                is_enforced=is_enforced,
                allow_temporary_bypass=allow_temporary_bypass,
                temporary_bypass_duration_minutes=temporary_bypass_duration_minutes,
                geo_restrict_countries=geo_restrict_countries,
                geo_block_countries=geo_block_countries,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
                created_by=admin_user_id,
                updated_by=admin_user_id
            )
            db.add(setting)
            
        await db.commit()
        await db.refresh(setting)
        
        # Determine the scope for audit logging
        scope = "global"
        if role_id:
            scope = f"role:{role_id}"
        if tenant_id:
            scope = f"{scope}+tenant:{tenant_id}" if role_id else f"tenant:{tenant_id}"
            
        # Log this action in the audit log
        await self.audit_service.log_event(
            db=db,
            user_id=admin_user_id,
            action="ip_allowlist_enforcement_set",
            resource_type="ip_allowlist_setting",
            resource_id=str(setting.id),
            tenant_id=tenant_id,
            status="success",
            details={
                "scope": scope,
                "is_enforced": is_enforced,
                "allow_temporary_bypass": allow_temporary_bypass
            }
        )
        
        return setting
