"""
Audit log model for tracking administrative actions across the platform.
"""

import uuid
from typing import Dict, Any, Optional

from sqlalchemy import Column, DateTime, String, JSON, ForeignKey, Index, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.app.db.base_class import Base


class AuditLog(Base):
    """
    Audit log entry for tracking administrative actions.
    
    Each audit log entry represents an administrative action performed by
    a user, such as creating/modifying resources, impersonation events,
    permission changes, etc.
    """
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Who performed the action
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    user = relationship("User")
    
    # User IP and user agent information
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    
    # When the action occurred
    timestamp = Column(DateTime, nullable=False, server_default="now()", index=True)
    
    # Action details
    action = Column(String(100), nullable=False, index=True)
    status = Column(String(20), nullable=False, default="success")
    
    # Resource that was acted upon
    resource_type = Column(String(100), nullable=False, index=True)
    resource_id = Column(String(100), nullable=True, index=True)
    
    # Additional context
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=True, index=True)
    tenant = relationship("Tenant")
    
    # Full details of the action (serialized as JSON)
    details = Column(JSON, nullable=True)
    
    # Optional message or description
    message = Column(Text, nullable=True)
    
    __table_args__ = (
        # Create composite indexes for common query patterns
        Index('idx_audit_user_action', 'user_id', 'action'),
        Index('idx_audit_tenant_resource', 'tenant_id', 'resource_type'),
        Index('idx_audit_timestamp_action', 'timestamp', 'action'),
    )
    
    def __repr__(self):
        return f"<AuditLog {self.action} on {self.resource_type}:{self.resource_id} by {self.user_id}>"
