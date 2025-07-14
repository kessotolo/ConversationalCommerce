"""
System lockout service.

This module handles the creation, management, and enforcement of system-wide
or tenant-specific lockouts that can be activated during emergencies.
"""

import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any, Tuple, Set

from sqlalchemy import select, update, and_, or_, not_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.app.models.security.emergency import (
    SystemLockout, EmergencyEvent, EmergencyAction
)
from app.app.models.admin.admin_user import AdminUser
from app.app.services.audit.audit_service import AuditService
from app.app.services.security.emergency_events_service import EmergencyEventsService


class SystemLockoutService:
    """Service for managing system-wide lockouts."""
    
    def __init__(self):
        self.audit_service = AuditService()
        self.emergency_events_service = EmergencyEventsService()
    
    async def create_system_lockout(
        self,
        db: AsyncSession,
        reason: str,
        message: str,
        is_platform_wide: bool,
        tenant_id: Optional[uuid.UUID] = None,
        emergency_id: Optional[uuid.UUID] = None,
        admin_user_id: uuid.UUID = None,
        expires_at: Optional[datetime] = None,
        exempt_role_ids: Optional[List[uuid.UUID]] = None,
        exempt_user_ids: Optional[List[uuid.UUID]] = None,
        allow_read_only: bool = False,
        details: Optional[Dict[str, Any]] = None
    ) -> SystemLockout:
        """
        Create a new system lockout.
        
        Args:
            db: Database session
            reason: Reason for the lockout
            message: Message to display to users
            is_platform_wide: Whether this is a platform-wide lockout
            tenant_id: ID of the tenant (required if not platform-wide)
            emergency_id: ID of the related emergency event (optional)
            admin_user_id: ID of the admin creating the lockout
            expires_at: When the lockout expires (optional)
            exempt_role_ids: Role IDs exempt from the lockout
            exempt_user_ids: User IDs exempt from the lockout
            allow_read_only: Whether read operations are still allowed
            details: Additional details
            
        Returns:
            The created system lockout
        """
        # Validate inputs
        if not is_platform_wide and tenant_id is None:
            raise ValueError("Tenant ID is required for tenant-specific lockouts")
            
        if is_platform_wide and tenant_id is not None:
            raise ValueError("Tenant ID should be None for platform-wide lockouts")
            
        # Check for existing active lockouts
        existing_query = select(SystemLockout).where(
            and_(
                SystemLockout.is_active == True,
                SystemLockout.is_platform_wide == is_platform_wide if is_platform_wide else SystemLockout.tenant_id == tenant_id
            )
        )
        
        result = await db.execute(existing_query)
        existing_lockout = result.scalars().first()
        
        if existing_lockout:
            raise ValueError(
                f"An active {'platform-wide' if is_platform_wide else 'tenant'} lockout already exists"
            )
        
        # Create lockout
        lockout = SystemLockout(
            reason=reason,
            message=message,
            is_platform_wide=is_platform_wide,
            tenant_id=tenant_id,
            is_active=True,
            exempt_role_ids=exempt_role_ids,
            exempt_user_ids=exempt_user_ids,
            allow_read_only=allow_read_only,
            created_at=datetime.now(timezone.utc),
            expires_at=expires_at,
            created_by=admin_user_id,
            emergency_id=emergency_id,
            details=details
        )
        
        db.add(lockout)
        await db.commit()
        await db.refresh(lockout)
        
        # Log audit event
        await self.audit_service.log_event(
            db=db,
            user_id=admin_user_id,
            action="system_lockout_created",
            resource_type="system_lockout",
            resource_id=str(lockout.id),
            tenant_id=tenant_id,
            status="success",
            details={
                "is_platform_wide": is_platform_wide,
                "reason": reason,
                "expires_at": expires_at.isoformat() if expires_at else None,
                "emergency_id": str(emergency_id) if emergency_id else None
            }
        )
        
        # Record as emergency action if related to emergency
        if emergency_id:
            await self.emergency_events_service.record_emergency_action(
                db=db,
                emergency_id=emergency_id,
                action_type="system_lockout",
                description=f"{'Platform-wide' if is_platform_wide else 'Tenant'} system lockout activated: {reason}",
                is_automatic=False,
                executed_by=admin_user_id,
                details={
                    "lockout_id": str(lockout.id),
                    "tenant_id": str(tenant_id) if tenant_id else None,
                    "expires_at": expires_at.isoformat() if expires_at else None
                }
            )
        
        return lockout
    
    async def deactivate_system_lockout(
        self,
        db: AsyncSession,
        lockout_id: uuid.UUID,
        admin_user_id: uuid.UUID,
        reason: Optional[str] = None
    ) -> SystemLockout:
        """
        Deactivate an existing system lockout.
        
        Args:
            db: Database session
            lockout_id: ID of the lockout to deactivate
            admin_user_id: ID of the admin deactivating the lockout
            reason: Reason for deactivation
            
        Returns:
            The updated system lockout
        """
        # Get the lockout
        query = select(SystemLockout).where(
            and_(
                SystemLockout.id == lockout_id,
                SystemLockout.is_active == True
            )
        )
        
        result = await db.execute(query)
        lockout = result.scalars().first()
        
        if not lockout:
            raise ValueError(f"Active system lockout {lockout_id} not found")
        
        # Update lockout
        lockout.is_active = False
        lockout.deactivated_at = datetime.now(timezone.utc)
        lockout.deactivated_by = admin_user_id
        
        if reason and lockout.details is not None:
            if lockout.details is None:
                lockout.details = {}
            lockout.details["deactivation_reason"] = reason
        
        await db.commit()
        await db.refresh(lockout)
        
        # Log audit event
        await self.audit_service.log_event(
            db=db,
            user_id=admin_user_id,
            action="system_lockout_deactivated",
            resource_type="system_lockout",
            resource_id=str(lockout.id),
            tenant_id=lockout.tenant_id,
            status="success",
            details={
                "is_platform_wide": lockout.is_platform_wide,
                "reason": reason if reason else None,
                "emergency_id": str(lockout.emergency_id) if lockout.emergency_id else None
            }
        )
        
        # Record emergency action if related to emergency
        if lockout.emergency_id:
            await self.emergency_events_service.record_emergency_action(
                db=db,
                emergency_id=lockout.emergency_id,
                action_type="system_lockout_deactivated",
                description=f"{'Platform-wide' if lockout.is_platform_wide else 'Tenant'} system lockout deactivated",
                is_automatic=False,
                executed_by=admin_user_id,
                details={
                    "lockout_id": str(lockout.id),
                    "tenant_id": str(lockout.tenant_id) if lockout.tenant_id else None,
                    "deactivation_reason": reason if reason else None
                }
            )
        
        return lockout
    
    async def cleanup_expired_lockouts(
        self,
        db: AsyncSession
    ) -> List[SystemLockout]:
        """
        Clean up expired lockouts by marking them as inactive.
        
        Args:
            db: Database session
            
        Returns:
            List of deactivated lockouts
        """
        # Get current time
        now = datetime.now(timezone.utc)
        
        # Find expired but still active lockouts
        query = select(SystemLockout).where(
            and_(
                SystemLockout.is_active == True,
                SystemLockout.expires_at != None,
                SystemLockout.expires_at < now
            )
        )
        
        result = await db.execute(query)
        expired_lockouts = result.scalars().all()
        
        # Update each lockout
        deactivated = []
        for lockout in expired_lockouts:
            lockout.is_active = False
            lockout.deactivated_at = now
            
            if lockout.details is None:
                lockout.details = {}
            lockout.details["deactivation_reason"] = "Automatic expiration"
            
            # Log audit event
            await self.audit_service.log_event(
                db=db,
                action="system_lockout_expired",
                resource_type="system_lockout",
                resource_id=str(lockout.id),
                tenant_id=lockout.tenant_id,
                status="success",
                details={
                    "is_platform_wide": lockout.is_platform_wide,
                    "emergency_id": str(lockout.emergency_id) if lockout.emergency_id else None
                }
            )
            
            deactivated.append(lockout)
        
        if deactivated:
            await db.commit()
            
        return deactivated
    
    async def is_access_allowed(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        role_ids: List[uuid.UUID],
        tenant_id: Optional[uuid.UUID] = None,
        is_read_operation: bool = False
    ) -> bool:
        """
        Check if a user is allowed access based on active lockouts.
        
        Args:
            db: Database session
            user_id: ID of the user
            role_ids: IDs of the user's roles
            tenant_id: ID of the tenant being accessed
            is_read_operation: Whether this is a read-only operation
            
        Returns:
            True if access is allowed, False otherwise
        """
        # Clean up any expired lockouts first
        await self.cleanup_expired_lockouts(db)
        
        # Check for platform-wide lockout
        platform_query = select(SystemLockout).where(
            and_(
                SystemLockout.is_active == True,
                SystemLockout.is_platform_wide == True
            )
        )
        
        result = await db.execute(platform_query)
        platform_lockout = result.scalars().first()
        
        if platform_lockout:
            # Check exemptions
            if user_id in (platform_lockout.exempt_user_ids or []):
                return True
                
            if any(role_id in (platform_lockout.exempt_role_ids or []) for role_id in role_ids):
                return True
                
            # Check read-only access
            if is_read_operation and platform_lockout.allow_read_only:
                return True
                
            # Access denied by platform-wide lockout
            return False
        
        # If tenant_id is provided, check for tenant-specific lockout
        if tenant_id:
            tenant_query = select(SystemLockout).where(
                and_(
                    SystemLockout.is_active == True,
                    SystemLockout.tenant_id == tenant_id
                )
            )
            
            result = await db.execute(tenant_query)
            tenant_lockout = result.scalars().first()
            
            if tenant_lockout:
                # Check exemptions
                if user_id in (tenant_lockout.exempt_user_ids or []):
                    return True
                    
                if any(role_id in (tenant_lockout.exempt_role_ids or []) for role_id in role_ids):
                    return True
                    
                # Check read-only access
                if is_read_operation and tenant_lockout.allow_read_only:
                    return True
                    
                # Access denied by tenant-specific lockout
                return False
        
        # No active lockouts affecting this user/tenant
        return True
    
    async def get_active_lockout_message(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        role_ids: List[uuid.UUID],
        tenant_id: Optional[uuid.UUID] = None,
        is_read_operation: bool = False
    ) -> Optional[str]:
        """
        Get the message for any active lockout affecting the user.
        
        Args:
            db: Database session
            user_id: ID of the user
            role_ids: IDs of the user's roles
            tenant_id: ID of the tenant being accessed
            is_read_operation: Whether this is a read-only operation
            
        Returns:
            Lockout message or None if no active lockout
        """
        # Check if access is allowed first
        is_allowed = await self.is_access_allowed(
            db=db,
            user_id=user_id,
            role_ids=role_ids,
            tenant_id=tenant_id,
            is_read_operation=is_read_operation
        )
        
        if is_allowed:
            return None
            
        # Access is not allowed, find the applicable lockout message
        
        # Check platform-wide lockout first
        platform_query = select(SystemLockout).where(
            and_(
                SystemLockout.is_active == True,
                SystemLockout.is_platform_wide == True
            )
        )
        
        result = await db.execute(platform_query)
        platform_lockout = result.scalars().first()
        
        if platform_lockout:
            return platform_lockout.message
            
        # Check tenant-specific lockout
        if tenant_id:
            tenant_query = select(SystemLockout).where(
                and_(
                    SystemLockout.is_active == True,
                    SystemLockout.tenant_id == tenant_id
                )
            )
            
            result = await db.execute(tenant_query)
            tenant_lockout = result.scalars().first()
            
            if tenant_lockout:
                return tenant_lockout.message
                
        # No lockout found, shouldn't happen based on is_access_allowed result
        return "System access is currently restricted. Please try again later."
