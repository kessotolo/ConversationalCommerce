import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID

from app.db.base_class import Base


class AuditLog(Base):
    """
    Audit log model for tracking security-sensitive operations
    and maintaining compliance with security best practices.
    """

    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    # create, update, delete, login, etc.
    action = Column(String, nullable=False)
    # product, user, order, etc.
    resource_type = Column(String, nullable=False)
    resource_id = Column(String, nullable=False)  # ID of the affected resource
    ip_address = Column(String, nullable=True)  # IP address of the user
    user_agent = Column(String, nullable=True)  # User agent of the client
    # Additional details about the action
    details = Column(JSON, nullable=True)
    timestamp = Column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    def __str__(self):
        return f"AuditLog(user_id={self.user_id}, action={self.action}, resource={self.resource_type}/{self.resource_id})"
