"""
Emergency Manager service.

This module integrates the emergency event, system lockout, and notification services
to provide a unified interface for managing security emergencies.
"""

import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any, Tuple

from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.security.emergency import (
    EmergencyEvent, EmergencyStatus, EmergencySeverity, EmergencyType,
    EmergencyAction, SystemLockout, EmergencyContact, EmergencyNotification
)
from backend.app.services.security.emergency_events_service import EmergencyEventsService
from backend.app.services.security.system_lockout_service import SystemLockoutService
from backend.app.services.security.emergency_notification_service import EmergencyNotificationService
from backend.app.services.audit.audit_service import AuditService


class EmergencyManager:
    """
    Manager service that orchestrates emergency response actions.
    
    This service integrates emergency events, system lockouts, and notifications
    to provide a unified interface for security incident response.
    """
    
    def __init__(self):
        self.events_service = EmergencyEventsService()
        self.lockout_service = SystemLockoutService()
        self.notification_service = EmergencyNotificationService()
        self.audit_service = AuditService()
    
    async def declare_emergency(
        self,
        db: AsyncSession,
        type: EmergencyType,
        severity: EmergencySeverity,
        title: str,
        description: str,
        admin_user_id: uuid.UUID,
        affected_tenants: Optional[List[uuid.UUID]] = None,
        affected_users: Optional[List[uuid.UUID]] = None,
        affected_systems: Optional[List[str]] = None,
        details: Optional[Dict[str, Any]] = None,
        auto_notify: bool = True,
        auto_lockout: bool = False,
        lockout_message: Optional[str] = None,
        lockout_is_platform_wide: bool = False,
        lockout_tenant_id: Optional[uuid.UUID] = None,
        lockout_expires_after_minutes: Optional[int] = None,
        lockout_allow_read_only: bool = False
    ) -> Dict[str, Any]:
        """
        Declare an emergency and optionally trigger lockouts and notifications.
        
        Args:
            db: Database session
            type: Type of emergency
            severity: Severity level
            title: Short title describing the emergency
            description: Detailed description
            admin_user_id: ID of admin declaring the emergency
            affected_tenants: List of affected tenant IDs
            affected_users: List of affected user IDs
            affected_systems: List of affected systems
            details: Additional details
            auto_notify: Whether to automatically send notifications
            auto_lockout: Whether to automatically create system lockout
            lockout_message: Message for lockout (required if auto_lockout is True)
            lockout_is_platform_wide: Whether lockout is platform-wide
            lockout_tenant_id: Tenant ID for lockout (required if not platform-wide)
            lockout_expires_after_minutes: Minutes until lockout expires
            lockout_allow_read_only: Whether to allow read-only operations during lockout
            
        Returns:
            Dictionary with created resources
        """
        result = {}
        
        # Create emergency event
        event = await self.events_service.create_emergency_event(
            db=db,
            type=type,
            severity=severity,
            title=title,
            description=description,
            reported_by=admin_user_id,
            affected_tenants=affected_tenants,
            affected_users=affected_users,
            affected_systems=affected_systems,
            details=details
        )
        result["event"] = event
        
        # Create system lockout if requested
        if auto_lockout:
            if not lockout_message:
                lockout_message = f"System access has been temporarily restricted due to a security incident. Please try again later or contact your administrator."
            
            # Set lockout expiration if specified
            expires_at = None
            if lockout_expires_after_minutes:
                expires_at = datetime.now(timezone.utc) + timedelta(minutes=lockout_expires_after_minutes)
            
            try:
                lockout = await self.lockout_service.create_system_lockout(
                    db=db,
                    reason=title,
                    message=lockout_message,
                    is_platform_wide=lockout_is_platform_wide,
                    tenant_id=lockout_tenant_id,
                    emergency_id=event.id,
                    admin_user_id=admin_user_id,
                    expires_at=expires_at,
                    allow_read_only=lockout_allow_read_only,
                    details={
                        "emergency_type": type,
                        "emergency_severity": severity,
                        "auto_created": True
                    }
                )
                result["lockout"] = lockout
            except ValueError as e:
                # Log but continue if lockout creation fails
                result["lockout_error"] = str(e)
        
        # Send notifications if requested
        if auto_notify:
            notification_subject = f"SECURITY ALERT: {title}"
            notification_message = f"""
Security Emergency Alert

Type: {type}
Severity: {severity}
Time: {event.detected_at.strftime('%Y-%m-%d %H:%M:%S UTC')}

{description}

Please follow your organization's security incident response protocol.
            """.strip()
            
            try:
                notifications = await self.notification_service.send_emergency_notification(
                    db=db,
                    emergency_id=event.id,
                    subject=notification_subject,
                    message=notification_message,
                    user_id=admin_user_id
                )
                result["notifications_count"] = len(notifications)
                result["notifications"] = notifications
            except Exception as e:
                # Log but continue if notification sending fails
                result["notification_error"] = str(e)
        
        # Log audit event for the complete emergency declaration
        await self.audit_service.log_event(
            db=db,
            user_id=admin_user_id,
            action="emergency_declared",
            resource_type="emergency_event",
            resource_id=str(event.id),
            status="success",
            details={
                "type": type,
                "severity": severity,
                "title": title,
                "auto_notify": auto_notify,
                "auto_lockout": auto_lockout,
                "notifications_sent": result.get("notifications_count", 0),
                "lockout_created": "lockout" in result
            }
        )
        
        return result
    
    async def resolve_emergency(
        self,
        db: AsyncSession,
        emergency_id: uuid.UUID,
        admin_user_id: uuid.UUID,
        resolution_notes: str,
        status: EmergencyStatus = EmergencyStatus.RESOLVED,
        auto_deactivate_lockouts: bool = True
    ) -> Dict[str, Any]:
        """
        Resolve an emergency and optionally deactivate associated lockouts.
        
        Args:
            db: Database session
            emergency_id: ID of the emergency event
            admin_user_id: ID of admin resolving the emergency
            resolution_notes: Notes describing how the emergency was resolved
            status: Resolution status (RESOLVED or FALSE_ALARM)
            auto_deactivate_lockouts: Whether to automatically deactivate lockouts
            
        Returns:
            Dictionary with updated resources
        """
        result = {}
        
        # Update emergency status
        event = await self.events_service.update_emergency_status(
            db=db,
            event_id=emergency_id,
            status=status,
            user_id=admin_user_id,
            resolution_notes=resolution_notes
        )
        result["event"] = event
        
        # Deactivate associated lockouts if requested
        if auto_deactivate_lockouts:
            # Find active lockouts associated with this emergency
            query = select(SystemLockout).where(
                and_(
                    SystemLockout.emergency_id == emergency_id,
                    SystemLockout.is_active == True
                )
            )
            
            result = await db.execute(query)
            lockouts = result.scalars().all()
            
            deactivated_lockouts = []
            for lockout in lockouts:
                try:
                    updated_lockout = await self.lockout_service.deactivate_system_lockout(
                        db=db,
                        lockout_id=lockout.id,
                        admin_user_id=admin_user_id,
                        reason=f"Emergency {status.value}: {resolution_notes}"
                    )
                    deactivated_lockouts.append(updated_lockout)
                except Exception as e:
                    # Log error but continue with other lockouts
                    if "deactivation_errors" not in result:
                        result["deactivation_errors"] = []
                    result["deactivation_errors"].append(str(e))
                    
            result["deactivated_lockouts"] = deactivated_lockouts
        
        # Log audit event
        await self.audit_service.log_event(
            db=db,
            user_id=admin_user_id,
            action="emergency_resolved",
            resource_type="emergency_event",
            resource_id=str(emergency_id),
            status="success",
            details={
                "resolution_status": status,
                "lockouts_deactivated": len(result.get("deactivated_lockouts", [])),
                "has_deactivation_errors": "deactivation_errors" in result
            }
        )
        
        return result
    
    async def get_active_emergencies_summary(
        self,
        db: AsyncSession,
        tenant_id: Optional[uuid.UUID] = None,
        include_low_severity: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Get a summary of active emergencies.
        
        Args:
            db: Database session
            tenant_id: Optional tenant ID to filter by
            include_low_severity: Whether to include LOW severity emergencies
            
        Returns:
            List of emergency summaries
        """
        # Get active emergencies
        min_severity = None if include_low_severity else EmergencySeverity.MEDIUM
        emergencies = await self.events_service.get_active_emergencies(
            db=db,
            tenant_id=tenant_id,
            min_severity=min_severity
        )
        
        # Build summaries
        summaries = []
        for emergency in emergencies:
            # Get associated lockouts
            query = select(SystemLockout).where(
                and_(
                    SystemLockout.emergency_id == emergency.id,
                    SystemLockout.is_active == True
                )
            )
            
            result = await db.execute(query)
            lockouts = result.scalars().all()
            
            # Count notifications
            notifications_query = select(func.count()).select_from(EmergencyNotification).where(
                EmergencyNotification.emergency_id == emergency.id
            )
            
            result = await db.execute(notifications_query)
            notification_count = result.scalar()
            
            # Build summary
            summary = {
                "id": emergency.id,
                "type": emergency.type,
                "severity": emergency.severity,
                "title": emergency.title,
                "detected_at": emergency.detected_at,
                "has_active_lockouts": len(lockouts) > 0,
                "lockout_count": len(lockouts),
                "notification_count": notification_count,
                "affected_tenants_count": len(emergency.affected_tenants) if emergency.affected_tenants else 0,
                "affected_users_count": len(emergency.affected_users) if emergency.affected_users else 0
            }
            
            summaries.append(summary)
        
        return summaries
