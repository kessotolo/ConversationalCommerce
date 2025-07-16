import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from sqlalchemy import Boolean, Column, DateTime, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.db.base_class import Base


class AdminNotification(Base):
    """Model for storing admin notifications in the database."""

    __tablename__ = "admin_notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Optional for admin-only notifications
    tenant_id = Column(UUID(as_uuid=True), nullable=True)
    # admin_user, all_admins, etc.
    recipient_type = Column(String(50), nullable=False)
    # User ID or tenant ID
    recipient_id = Column(UUID(as_uuid=True), nullable=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    # low, medium, high, critical
    priority = Column(String(20), nullable=False, default="medium")
    # system, security, performance, etc.
    category = Column(String(50), nullable=False)
    # List of channels: ["in_app", "email"]
    channels = Column(JSONB, nullable=False)
    action_url = Column(String(500), nullable=True)
    action_text = Column(String(100), nullable=True)
    metadata = Column(JSONB, nullable=True)  # Additional metadata
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(
        timezone.utc), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
    # pending, sent, delivered, failed
    status = Column(String(20), default="pending", nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    is_archived = Column(Boolean, default=False, nullable=False)

    def __repr__(self):
        return f"<AdminNotification(id={self.id}, title='{self.title}', recipient_type='{self.recipient_type}')>"

    def to_dict(self) -> Dict[str, Any]:
        """Convert notification to dictionary."""
        return {
            "id": str(self.id),
            "tenant_id": str(self.tenant_id) if self.tenant_id else None,
            "recipient_type": self.recipient_type,
            "recipient_id": str(self.recipient_id) if self.recipient_id else None,
            "title": self.title,
            "message": self.message,
            "priority": self.priority,
            "category": self.category,
            "channels": self.channels,
            "action_url": self.action_url,
            "action_text": self.action_text,
            "metadata": self.metadata,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "sent_at": self.sent_at.isoformat() if self.sent_at else None,
            "read_at": self.read_at.isoformat() if self.read_at else None,
            "status": self.status,
            "is_read": self.is_read,
            "is_archived": self.is_archived,
        }
