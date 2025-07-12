"""
Audit service for logging and retrieving administrative actions.

This service provides methods for:
- Recording audit events for admin actions
- Retrieving and filtering audit logs
- Exporting audit data for compliance
"""

import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union

from sqlalchemy import select, desc, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Request

from backend.app.models.audit.audit_log import AuditLog


class AuditService:
    """Service for audit logging and retrieval."""

    async def log_event(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        tenant_id: Optional[uuid.UUID] = None,
        details: Optional[Dict[str, Any]] = None,
        status: str = "success",
        message: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> AuditLog:
        """
        Log an audit event.
        
        Args:
            db: Database session
            user_id: ID of the user who performed the action
            action: The action performed (e.g., create, update, delete, login)
            resource_type: Type of resource acted upon (e.g., user, tenant, feature_flag)
            resource_id: Identifier of the specific resource (optional)
            tenant_id: ID of the tenant context (optional)
            details: Additional structured details about the action (optional)
            status: Status of the action (success, failure, etc.)
            message: Human-readable description of the action (optional)
            ip_address: IP address of the user (optional)
            user_agent: User agent string (optional)
            
        Returns:
            The created audit log entry
        """
        audit_log = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            tenant_id=tenant_id,
            details=details or {},
            status=status,
            message=message,
            ip_address=ip_address,
            user_agent=user_agent,
            timestamp=datetime.utcnow()
        )
        
        db.add(audit_log)
        await db.commit()
        await db.refresh(audit_log)
        
        return audit_log
    
    async def log_event_from_request(
        self,
        db: AsyncSession,
        request: Request,
        user_id: uuid.UUID,
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        tenant_id: Optional[uuid.UUID] = None,
        details: Optional[Dict[str, Any]] = None,
        status: str = "success",
        message: Optional[str] = None
    ) -> AuditLog:
        """
        Log an audit event using information from the request object.
        
        This extracts the IP address and user agent from the request.
        
        Args:
            db: Database session
            request: FastAPI request object
            user_id: ID of the user who performed the action
            action: The action performed
            resource_type: Type of resource acted upon
            resource_id: Identifier of the specific resource (optional)
            tenant_id: ID of the tenant context (optional)
            details: Additional structured details about the action (optional)
            status: Status of the action (success, failure, etc.)
            message: Human-readable description of the action (optional)
            
        Returns:
            The created audit log entry
        """
        # Extract client IP (handles proxy forwarding)
        ip_address = request.client.host
        if forwarded := request.headers.get("x-forwarded-for"):
            ip_address = forwarded.split(",")[0].strip()
            
        # Extract user agent
        user_agent = request.headers.get("user-agent", "")
        
        return await self.log_event(
            db=db,
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            tenant_id=tenant_id,
            details=details,
            status=status,
            message=message,
            ip_address=ip_address,
            user_agent=user_agent
        )
    
    async def get_audit_logs(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        user_id: Optional[uuid.UUID] = None,
        tenant_id: Optional[uuid.UUID] = None,
        resource_type: Optional[str] = None,
        action: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        search: Optional[str] = None
    ) -> List[AuditLog]:
        """
        Retrieve audit logs with filtering options.
        
        Args:
            db: Database session
            skip: Number of records to skip
            limit: Maximum number of records to return
            user_id: Filter by user who performed the action
            tenant_id: Filter by tenant context
            resource_type: Filter by resource type
            action: Filter by action performed
            start_date: Filter by timestamp (from)
            end_date: Filter by timestamp (to)
            search: Search in resource_id or message
            
        Returns:
            List of matching audit log entries
        """
        query = select(AuditLog).order_by(desc(AuditLog.timestamp))
        
        # Apply filters
        filters = []
        if user_id:
            filters.append(AuditLog.user_id == user_id)
        if tenant_id:
            filters.append(AuditLog.tenant_id == tenant_id)
        if resource_type:
            filters.append(AuditLog.resource_type == resource_type)
        if action:
            filters.append(AuditLog.action == action)
        if start_date:
            filters.append(AuditLog.timestamp >= start_date)
        if end_date:
            filters.append(AuditLog.timestamp <= end_date)
        if search:
            filters.append(or_(
                AuditLog.resource_id.ilike(f"%{search}%"),
                AuditLog.message.ilike(f"%{search}%")
            ))
        
        # Apply all filters
        if filters:
            query = query.where(and_(*filters))
        
        # Apply pagination
        query = query.offset(skip).limit(limit)
        
        # Execute query
        result = await db.execute(query)
        return result.scalars().all()
    
    async def get_audit_log(self, db: AsyncSession, log_id: uuid.UUID) -> Optional[AuditLog]:
        """
        Get a specific audit log entry by ID.
        
        Args:
            db: Database session
            log_id: ID of the audit log entry
            
        Returns:
            The audit log entry if found, None otherwise
        """
        result = await db.execute(
            select(AuditLog).where(AuditLog.id == log_id)
        )
        return result.scalars().first()
    
    async def get_user_activity(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        days: int = 30,
        limit: int = 100
    ) -> List[AuditLog]:
        """
        Get recent activity for a specific user.
        
        Args:
            db: Database session
            user_id: ID of the user
            days: Number of days to look back
            limit: Maximum number of records to return
            
        Returns:
            List of audit log entries for the user
        """
        start_date = datetime.utcnow() - timedelta(days=days)
        
        result = await db.execute(
            select(AuditLog)
            .where(
                AuditLog.user_id == user_id,
                AuditLog.timestamp >= start_date
            )
            .order_by(desc(AuditLog.timestamp))
            .limit(limit)
        )
        
        return result.scalars().all()
    
    async def get_resource_history(
        self,
        db: AsyncSession,
        resource_type: str,
        resource_id: str,
        limit: int = 100
    ) -> List[AuditLog]:
        """
        Get audit history for a specific resource.
        
        Args:
            db: Database session
            resource_type: Type of resource
            resource_id: ID of the resource
            limit: Maximum number of records to return
            
        Returns:
            List of audit log entries for the resource
        """
        result = await db.execute(
            select(AuditLog)
            .where(
                AuditLog.resource_type == resource_type,
                AuditLog.resource_id == resource_id
            )
            .order_by(desc(AuditLog.timestamp))
            .limit(limit)
        )
        
        return result.scalars().all()
    
    async def get_tenant_activity(
        self,
        db: AsyncSession,
        tenant_id: uuid.UUID,
        days: int = 30,
        limit: int = 100
    ) -> List[AuditLog]:
        """
        Get recent activity for a specific tenant.
        
        Args:
            db: Database session
            tenant_id: ID of the tenant
            days: Number of days to look back
            limit: Maximum number of records to return
            
        Returns:
            List of audit log entries for the tenant
        """
        start_date = datetime.utcnow() - timedelta(days=days)
        
        result = await db.execute(
            select(AuditLog)
            .where(
                AuditLog.tenant_id == tenant_id,
                AuditLog.timestamp >= start_date
            )
            .order_by(desc(AuditLog.timestamp))
            .limit(limit)
        )
        
        return result.scalars().all()
