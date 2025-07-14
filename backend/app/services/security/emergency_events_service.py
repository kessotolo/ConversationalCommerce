"""
Emergency events service.

This module handles the creation, updating, and management of emergency events
that can trigger system lockouts and notifications.
"""

import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, Tuple

from sqlalchemy import select, update, and_, or_, not_
from sqlalchemy.ext.asyncio import AsyncSession

from app.app.models.security.emergency import (
    EmergencyEvent, EmergencyStatus, EmergencySeverity, 
    EmergencyType, EmergencyAction
)
from app.app.services.audit.audit_service import AuditService


class EmergencyEventsService:
    """Service for managing emergency events."""
    
    def __init__(self):
        self.audit_service = AuditService()
    
    async def create_emergency_event(
        self,
        db: AsyncSession,
        type: EmergencyType,
        severity: EmergencySeverity,
        title: str,
        description: str,
        reported_by: Optional[uuid.UUID] = None,
        affected_tenants: Optional[List[uuid.UUID]] = None,
        affected_users: Optional[List[uuid.UUID]] = None,
        affected_systems: Optional[List[str]] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> EmergencyEvent:
        """
        Create a new emergency event.
        
        Args:
            db: Database session
            type: Type of emergency
            severity: Severity level
            title: Short title describing the emergency
            description: Detailed description
            reported_by: ID of user reporting the emergency
            affected_tenants: List of affected tenant IDs
            affected_users: List of affected user IDs
            affected_systems: List of affected systems
            details: Additional details
            
        Returns:
            The created emergency event
        """
        # Create the event
        event = EmergencyEvent(
            type=type,
            severity=severity,
            title=title,
            description=description,
            status=EmergencyStatus.ACTIVE,
            detected_at=datetime.now(timezone.utc),
            reported_by=reported_by,
            affected_tenants=affected_tenants,
            affected_users=affected_users,
            affected_systems=affected_systems,
            details=details
        )
        
        db.add(event)
        await db.commit()
        await db.refresh(event)
        
        # Log audit event
        if reported_by:
            await self.audit_service.log_event(
                db=db,
                user_id=reported_by,
                action="emergency_event_created",
                resource_type="emergency_event",
                resource_id=str(event.id),
                status="success",
                details={
                    "type": type,
                    "severity": severity,
                    "title": title
                }
            )
        
        return event
    
    async def update_emergency_status(
        self,
        db: AsyncSession,
        event_id: uuid.UUID,
        status: EmergencyStatus,
        user_id: uuid.UUID,
        resolution_notes: Optional[str] = None
    ) -> EmergencyEvent:
        """
        Update the status of an emergency event.
        
        Args:
            db: Database session
            event_id: ID of the emergency event
            status: New status
            user_id: ID of user updating the status
            resolution_notes: Optional notes for resolution
            
        Returns:
            The updated emergency event
        """
        # Get the event
        query = select(EmergencyEvent).where(EmergencyEvent.id == event_id)
        result = await db.execute(query)
        event = result.scalars().first()
        
        if not event:
            raise ValueError(f"Emergency event {event_id} not found")
            
        if event.status == status:
            return event  # No change needed
        
        # Update the event
        old_status = event.status
        event.status = status
        
        if status in [EmergencyStatus.RESOLVED, EmergencyStatus.FALSE_ALARM]:
            event.resolved_at = datetime.now(timezone.utc)
            event.resolved_by = user_id
            if resolution_notes:
                event.resolution_notes = resolution_notes
            
        await db.commit()
        await db.refresh(event)
        
        # Log audit event
        await self.audit_service.log_event(
            db=db,
            user_id=user_id,
            action="emergency_event_status_updated",
            resource_type="emergency_event",
            resource_id=str(event.id),
            status="success",
            details={
                "old_status": old_status,
                "new_status": status,
                "resolution_notes": resolution_notes if resolution_notes else ""
            }
        )
        
        return event
    
    async def record_emergency_action(
        self,
        db: AsyncSession,
        emergency_id: uuid.UUID,
        action_type: str,
        description: str,
        is_automatic: bool = False,
        executed_by: Optional[uuid.UUID] = None,
        successful: bool = True,
        error_details: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> EmergencyAction:
        """
        Record an action taken in response to an emergency.
        
        Args:
            db: Database session
            emergency_id: ID of the emergency event
            action_type: Type of action (e.g., "system_lockout")
            description: Description of the action
            is_automatic: Whether the action was automatic
            executed_by: ID of user who executed the action
            successful: Whether the action was successful
            error_details: Details of any errors
            details: Additional details
            
        Returns:
            The created emergency action
        """
        # Verify emergency exists
        query = select(EmergencyEvent).where(EmergencyEvent.id == emergency_id)
        result = await db.execute(query)
        event = result.scalars().first()
        
        if not event:
            raise ValueError(f"Emergency event {emergency_id} not found")
        
        # Create the action
        action = EmergencyAction(
            emergency_id=emergency_id,
            action_type=action_type,
            description=description,
            is_automatic=is_automatic,
            successful=successful,
            error_details=error_details,
            executed_at=datetime.now(timezone.utc),
            executed_by=executed_by,
            details=details
        )
        
        db.add(action)
        await db.commit()
        await db.refresh(action)
        
        # Log audit event
        if executed_by:
            await self.audit_service.log_event(
                db=db,
                user_id=executed_by,
                action="emergency_action_recorded",
                resource_type="emergency_action",
                resource_id=str(action.id),
                status="success" if successful else "error",
                details={
                    "emergency_id": str(emergency_id),
                    "action_type": action_type,
                    "is_automatic": is_automatic,
                    "error_details": error_details if error_details else None
                }
            )
        
        return action
    
    async def revert_emergency_action(
        self,
        db: AsyncSession,
        action_id: uuid.UUID,
        user_id: uuid.UUID,
        reason: Optional[str] = None
    ) -> EmergencyAction:
        """
        Mark an emergency action as reverted.
        
        Args:
            db: Database session
            action_id: ID of the action
            user_id: ID of user reverting the action
            reason: Reason for reverting
            
        Returns:
            The updated emergency action
        """
        # Get the action
        query = select(EmergencyAction).where(EmergencyAction.id == action_id)
        result = await db.execute(query)
        action = result.scalars().first()
        
        if not action:
            raise ValueError(f"Emergency action {action_id} not found")
            
        if action.reverted_at is not None:
            raise ValueError(f"Emergency action {action_id} has already been reverted")
        
        # Update the action
        action.reverted_at = datetime.now(timezone.utc)
        action.reverted_by = user_id
        
        if reason and action.details:
            if action.details is None:
                action.details = {}
            action.details["revert_reason"] = reason
        
        await db.commit()
        await db.refresh(action)
        
        # Log audit event
        await self.audit_service.log_event(
            db=db,
            user_id=user_id,
            action="emergency_action_reverted",
            resource_type="emergency_action",
            resource_id=str(action.id),
            status="success",
            details={
                "emergency_id": str(action.emergency_id),
                "action_type": action.action_type,
                "reason": reason if reason else None
            }
        )
        
        return action
    
    async def get_active_emergencies(
        self,
        db: AsyncSession,
        tenant_id: Optional[uuid.UUID] = None,
        min_severity: Optional[EmergencySeverity] = None
    ) -> List[EmergencyEvent]:
        """
        Get active emergency events, optionally filtered by tenant and severity.
        
        Args:
            db: Database session
            tenant_id: Optional tenant ID to filter by
            min_severity: Optional minimum severity level
            
        Returns:
            List of active emergency events
        """
        query = select(EmergencyEvent).where(
            EmergencyEvent.status == EmergencyStatus.ACTIVE
        )
        
        # Apply filters
        if tenant_id:
            query = query.where(
                or_(
                    EmergencyEvent.affected_tenants == None,
                    EmergencyEvent.affected_tenants.contains([tenant_id])
                )
            )
        
        if min_severity:
            severity_levels = {
                EmergencySeverity.LOW: 1,
                EmergencySeverity.MEDIUM: 2,
                EmergencySeverity.HIGH: 3,
                EmergencySeverity.CRITICAL: 4
            }
            
            min_level = severity_levels.get(min_severity, 1)
            eligible_severities = [
                s for s, l in severity_levels.items() if l >= min_level
            ]
            
            query = query.where(EmergencyEvent.severity.in_(eligible_severities))
        
        # Order by severity (descending) and detection time
        query = query.order_by(
            EmergencyEvent.severity.desc(),
            EmergencyEvent.detected_at.desc()
        )
        
        result = await db.execute(query)
        return result.scalars().all()
