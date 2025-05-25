from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog
from fastapi import Request
from typing import Dict, Any, Optional
from uuid import UUID
from datetime import datetime, timezone
import logging

# Configure logger
logger = logging.getLogger(__name__)

class AuditActionType:
    """Constants for common audit action types"""
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    LOGIN = "login"
    LOGOUT = "logout"
    RESET_PASSWORD = "reset_password"
    EXPORT = "export_data"
    PAYMENT = "payment"


class AuditResourceType:
    """Constants for common resource types"""
    PRODUCT = "product"
    USER = "user"
    ORDER = "order"
    PAYMENT = "payment"
    CUSTOMER = "customer"
    SETTING = "setting"
    STOREFRONT = "storefront"


def create_audit_log(
    db: Session,
    user_id: UUID,
    action: str,
    resource_type: str,
    resource_id: str,
    details: Optional[Dict[str, Any]] = None,
    request: Optional[Request] = None,
) -> AuditLog:
    """
    Create an audit log entry for security and compliance tracking.
    
    Args:
        db: Database session
        user_id: ID of the user performing the action
        action: Type of action (create, update, delete, etc.)
        resource_type: Type of resource affected (product, user, etc.)
        resource_id: ID of the affected resource
        details: Additional details about the action
        request: FastAPI request object for IP and user agent extraction
        
    Returns:
        Created audit log entry
    """
    try:
        # Extract IP address and user agent from request if available
        ip_address = None
        user_agent = None
        
        if request:
            ip_address = request.client.host if request.client else None
            user_agent = request.headers.get("user-agent")
        
        # Create audit log entry
        audit_log = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id),
            ip_address=ip_address,
            user_agent=user_agent,
            details=details,
            timestamp=datetime.now(timezone.utc)
        )
        
        # Add to database
        db.add(audit_log)
        db.commit()
        db.refresh(audit_log)
        
        logger.info(
            f"Audit log created: {action} {resource_type}/{resource_id} by user {user_id}"
        )
        
        return audit_log
        
    except Exception as e:
        logger.error(f"Failed to create audit log: {str(e)}", exc_info=True)
        db.rollback()
        # Don't raise exception - audit logging should not disrupt normal operation
        return None


def get_resource_audit_logs(
    db: Session,
    resource_type: str,
    resource_id: str,
    limit: int = 100
) -> list[AuditLog]:
    """
    Get audit logs for a specific resource.
    
    Args:
        db: Database session
        resource_type: Type of resource (product, user, etc.)
        resource_id: ID of the resource
        limit: Maximum number of logs to return
        
    Returns:
        List of audit logs
    """
    return db.query(AuditLog).filter(
        AuditLog.resource_type == resource_type,
        AuditLog.resource_id == str(resource_id)
    ).order_by(
        AuditLog.timestamp.desc()
    ).limit(limit).all()


def get_user_audit_logs(
    db: Session,
    user_id: UUID,
    limit: int = 100
) -> list[AuditLog]:
    """
    Get audit logs for a specific user.
    
    Args:
        db: Database session
        user_id: ID of the user
        limit: Maximum number of logs to return
        
    Returns:
        List of audit logs
    """
    return db.query(AuditLog).filter(
        AuditLog.user_id == user_id
    ).order_by(
        AuditLog.timestamp.desc()
    ).limit(limit).all()
