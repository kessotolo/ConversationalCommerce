"""
Emergency controls and notifications models.

This module defines models for system-wide emergency controls
such as emergency lockouts and notifications.
"""

import uuid
import enum
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Enum, Text, JSON, Index, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class EmergencyStatus(str, enum.Enum):
    """Status of an emergency situation."""
    ACTIVE = "active"
    RESOLVED = "resolved"
    FALSE_ALARM = "false_alarm"


class EmergencySeverity(str, enum.Enum):
    """Severity levels for emergency situations."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class EmergencyType(str, enum.Enum):
    """Types of emergency situations."""
    SECURITY_BREACH = "security_breach"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    DATA_LEAK = "data_leak"
    SYSTEM_COMPROMISE = "system_compromise"
    DDOS_ATTACK = "ddos_attack"
    RANSOMWARE = "ransomware"
    ACCOUNT_COMPROMISE = "account_compromise"
    API_ABUSE = "api_abuse"
    OTHER = "other"


class NotificationChannel(str, enum.Enum):
    """Available notification channels."""
    EMAIL = "email"
    SMS = "sms"
    SLACK = "slack"
    WEBHOOK = "webhook"
    PUSH = "push"


class EmergencyEvent(Base):
    """
    Record of an emergency situation.

    Tracks details about security emergencies, their status,
    and resolution.
    """
    __tablename__ = "emergency_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Emergency details
    type = Column(Enum(EmergencyType), nullable=False)
    severity = Column(Enum(EmergencySeverity), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)

    # Status
    status = Column(Enum(EmergencyStatus), nullable=False,
                    default=EmergencyStatus.ACTIVE)

    # Timing
    detected_at = Column(DateTime(timezone=True), nullable=False,
                         default=lambda: datetime.now(timezone.utc))
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    # Who reported/resolved
    reported_by = Column(UUID(as_uuid=True),
                         ForeignKey("users.id"), nullable=True)
    resolved_by = Column(UUID(as_uuid=True),
                         ForeignKey("users.id"), nullable=True)

    # Affected resources
    affected_tenants = Column(ARRAY(UUID(as_uuid=True)), nullable=True)
    affected_users = Column(ARRAY(UUID(as_uuid=True)), nullable=True)
    affected_systems = Column(ARRAY(String), nullable=True)

    # Additional data
    details = Column(JSONB, nullable=True)
    resolution_notes = Column(Text, nullable=True)

    # Relationships
    reporter = relationship("User", foreign_keys=[reported_by])
    resolver = relationship("User", foreign_keys=[resolved_by])
    actions = relationship("EmergencyAction", back_populates="emergency")
    notifications = relationship(
        "EmergencyNotification", back_populates="emergency")

    __table_args__ = (
        # Indexes
        Index('ix_emergency_events_status', status),
        Index('ix_emergency_events_type', type),
        Index('ix_emergency_events_detected_at', detected_at),
    )

    def __repr__(self):
        return f"<EmergencyEvent id={self.id} type={self.type} severity={self.severity} status={self.status}>"


class EmergencyAction(Base):
    """
    Actions taken in response to an emergency.

    Records automatic or manual actions taken to mitigate
    or resolve an emergency.
    """
    __tablename__ = "emergency_actions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    emergency_id = Column(UUID(as_uuid=True), ForeignKey(
        "emergency_events.id"), nullable=False)

    # Action details
    # e.g., "system_lockout", "ip_block", "password_reset"
    action_type = Column(String(50), nullable=False)
    description = Column(Text, nullable=False)
    is_automatic = Column(Boolean, nullable=False, default=False)

    # Status
    successful = Column(Boolean, nullable=False, default=True)
    error_details = Column(Text, nullable=True)

    # Timing
    executed_at = Column(DateTime(timezone=True), nullable=False,
                         default=lambda: datetime.now(timezone.utc))
    reverted_at = Column(DateTime(timezone=True), nullable=True)

    # Who executed/reverted
    executed_by = Column(UUID(as_uuid=True),
                         ForeignKey("users.id"), nullable=True)
    reverted_by = Column(UUID(as_uuid=True),
                         ForeignKey("users.id"), nullable=True)

    # Additional data
    details = Column(JSONB, nullable=True)

    # Relationships
    emergency = relationship("EmergencyEvent", back_populates="actions")
    executor = relationship("User", foreign_keys=[executed_by])
    reverter = relationship("User", foreign_keys=[reverted_by])

    __table_args__ = (
        # Indexes
        Index('ix_emergency_actions_emergency_id', emergency_id),
        Index('ix_emergency_actions_action_type', action_type),
        Index('ix_emergency_actions_executed_at', executed_at),
    )

    def __repr__(self):
        return f"<EmergencyAction id={self.id} type={self.action_type} emergency_id={self.emergency_id}>"


class EmergencyNotification(Base):
    """
    Record of notifications sent during emergencies.

    Tracks who was notified, through which channels,
    and whether they acknowledged the notification.
    """
    __tablename__ = "emergency_notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    emergency_id = Column(UUID(as_uuid=True), ForeignKey(
        "emergency_events.id"), nullable=False)

    # Recipient
    recipient_user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    recipient_email = Column(String(255), nullable=True)
    recipient_phone = Column(String(50), nullable=True)
    recipient_channel = Column(Enum(NotificationChannel), nullable=False)

    # Content
    subject = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)

    # Status
    sent_at = Column(DateTime(timezone=True), nullable=False,
                     default=lambda: datetime.now(timezone.utc))
    delivered = Column(Boolean, nullable=True)  # Null if unknown
    error_details = Column(Text, nullable=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)

    # Additional data
    details = Column(JSONB, nullable=True)

    # Relationships
    emergency = relationship("EmergencyEvent", back_populates="notifications")
    recipient = relationship("User", foreign_keys=[recipient_user_id])

    __table_args__ = (
        # Indexes
        Index('ix_emergency_notifications_emergency_id', emergency_id),
        Index('ix_emergency_notifications_recipient_user_id', recipient_user_id),
        Index('ix_emergency_notifications_recipient_channel', recipient_channel),
        Index('ix_emergency_notifications_sent_at', sent_at),
    )

    def __repr__(self):
        return f"<EmergencyNotification id={self.id} channel={self.recipient_channel} emergency_id={self.emergency_id}>"


class SystemLockout(Base):
    """
    System-wide lockout configuration.

    Manages platform-wide or tenant-specific lockouts
    that can be activated during emergencies.
    """
    __tablename__ = "system_lockouts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Scope
    is_platform_wide = Column(Boolean, nullable=False, default=False)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey(
        "tenants.id"), nullable=True)

    # Lockout details
    reason = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)  # Message shown to users
    is_active = Column(Boolean, nullable=False, default=True)

    # Exceptions
    # Roles exempt from lockout
    exempt_role_ids = Column(ARRAY(UUID(as_uuid=True)), nullable=True)
    # Users exempt from lockout
    exempt_user_ids = Column(ARRAY(UUID(as_uuid=True)), nullable=True)

    # Permissions during lockout
    # If true, read operations still allowed
    allow_read_only = Column(Boolean, nullable=False, default=False)

    # Timing
    created_at = Column(DateTime(timezone=True), nullable=False,
                        default=lambda: datetime.now(timezone.utc))
    # Null for no expiration
    expires_at = Column(DateTime(timezone=True), nullable=True)
    deactivated_at = Column(DateTime(timezone=True), nullable=True)

    # Who created/deactivated
    created_by = Column(UUID(as_uuid=True), ForeignKey(
        "users.id"), nullable=False)
    deactivated_by = Column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Related emergency
    emergency_id = Column(UUID(as_uuid=True), ForeignKey(
        "emergency_events.id"), nullable=True)

    # Additional data
    details = Column(JSONB, nullable=True)

    # Relationships
    tenant = relationship("Tenant")
    creator = relationship("User", foreign_keys=[created_by])
    deactivator = relationship("User", foreign_keys=[deactivated_by])
    emergency = relationship("EmergencyEvent")

    __table_args__ = (
        # Ensure either platform-wide or tenant-specific
        CheckConstraint('is_platform_wide = true OR tenant_id IS NOT NULL',
                        name='chk_system_lockouts_scope'),
        # Indexes
        Index('ix_system_lockouts_is_active', is_active),
        Index('ix_system_lockouts_tenant_id', tenant_id),
        Index('ix_system_lockouts_created_at', created_at),
    )

    def __repr__(self):
        scope = "platform-wide" if self.is_platform_wide else f"tenant={self.tenant_id}"
        status = "active" if self.is_active else "inactive"
        return f"<SystemLockout id={self.id} {scope} {status}>"


class EmergencyContact(Base):
    """
    Emergency contacts for notifications.

    Defines who should be notified in case of emergencies,
    and through which channels.
    """
    __tablename__ = "emergency_contacts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Contact details
    user_id = Column(UUID(as_uuid=True), ForeignKey(
        "users.id"), nullable=True)  # If internal user
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)

    # Notification preferences
    notify_via_email = Column(Boolean, nullable=False, default=True)
    notify_via_sms = Column(Boolean, nullable=False, default=False)
    # e.g., {"slack": {"webhook": "..."}}
    additional_channels = Column(JSONB, nullable=True)

    # Scope and severity
    tenant_id = Column(UUID(as_uuid=True), ForeignKey(
        "tenants.id"), nullable=True)  # Null for platform-wide
    min_severity = Column(Enum(EmergencySeverity),
                          nullable=False, default=EmergencySeverity.HIGH)
    notify_for_types = Column(
        ARRAY(String), nullable=True)  # Null for all types

    # Status
    is_active = Column(Boolean, nullable=False, default=True)

    # Additional data
    details = Column(JSONB, nullable=True)

    # Relationships
    user = relationship("User")
    tenant = relationship("Tenant")

    __table_args__ = (
        # Ensure at least one notification channel
        CheckConstraint('notify_via_email = true OR notify_via_sms = true OR additional_channels IS NOT NULL',
                        name='chk_emergency_contacts_channel'),
        # Ensure at least email or phone is provided
        CheckConstraint('email IS NOT NULL OR phone IS NOT NULL',
                        name='chk_emergency_contacts_contact_info'),
        # Indexes
        Index('ix_emergency_contacts_tenant_id', tenant_id),
        Index('ix_emergency_contacts_is_active', is_active),
        Index('ix_emergency_contacts_min_severity', min_severity),
    )

    def __repr__(self):
        scope = "platform-wide" if self.tenant_id is None else f"tenant={self.tenant_id}"
        return f"<EmergencyContact id={self.id} name={self.name} {scope} severity={self.min_severity}>"
