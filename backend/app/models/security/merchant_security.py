"""
Database models for enhanced merchant security system.

Track A Phase 3: Enhanced merchant-specific security and access control
"""

import uuid
from enum import Enum
from datetime import datetime
from sqlalchemy import Column, String, Boolean, Integer, Float, DateTime, ForeignKey, Text, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base_class import Base


class SecurityPolicyType(str, Enum):
    """Types of security policies that can be applied."""
    ACCESS_CONTROL = "access_control"
    RATE_LIMITING = "rate_limiting"
    IP_RESTRICTION = "ip_restriction"
    TIME_RESTRICTION = "time_restriction"
    DATA_ACCESS = "data_access"
    OPERATION_RESTRICTION = "operation_restriction"
    COMPLIANCE = "compliance"


class SecurityRiskLevel(str, Enum):
    """Security risk levels for threat assessment."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class MerchantSecurityPolicy(Base):
    """
    Model for merchant-specific security policies.

    Stores custom security rules and configurations that can be
    applied to merchant operations beyond basic RLS.
    """
    __tablename__ = "merchant_security_policies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey(
        "tenants.id"), nullable=False, index=True)

    # Policy configuration
    policy_type = Column(String(50), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    rules = Column(JSONB, nullable=False)  # Policy rules and configuration

    # Policy management
    is_active = Column(Boolean, default=True, nullable=False)
    # Lower = higher priority
    priority = Column(Integer, default=100, nullable=False)

    # Metadata
    # User ID who created the policy
    created_by = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True),
                        server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(
    ), onupdate=func.now(), nullable=False)

    # Relationships
    tenant = relationship("Tenant", back_populates="security_policies")

    # Indexes
    __table_args__ = (
        Index('idx_merchant_security_policies_tenant_active',
              'tenant_id', 'is_active'),
        Index('idx_merchant_security_policies_type_priority',
              'policy_type', 'priority'),
    )


class SecurityEvent(Base):
    """
    Model for security events and incidents.

    Tracks security-related events for monitoring, analysis,
    and compliance reporting.
    """
    __tablename__ = "security_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey(
        "tenants.id"), nullable=False, index=True)

    # Event details
    event_type = Column(String(100), nullable=False, index=True)
    risk_level = Column(String(20), nullable=False, index=True)
    description = Column(Text, nullable=False)
    metadata = Column(JSONB, nullable=True)  # Additional event data

    # Request context
    user_id = Column(String(255), nullable=True,
                     index=True)  # User involved in event
    ip_address = Column(String(45), nullable=True,
                        index=True)  # IPv4 or IPv6 address
    user_agent = Column(Text, nullable=True)
    request_path = Column(String(500), nullable=True)
    request_method = Column(String(10), nullable=True)

    # Event management
    resolved = Column(Boolean, default=False, nullable=False)
    # User ID who resolved the event
    resolved_by = Column(String(255), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolution_notes = Column(Text, nullable=True)

    # Timestamps
    timestamp = Column(DateTime(timezone=True),
                       server_default=func.now(), nullable=False)
    created_at = Column(DateTime(timezone=True),
                        server_default=func.now(), nullable=False)

    # Relationships
    tenant = relationship("Tenant", back_populates="security_events")

    # Indexes
    __table_args__ = (
        Index('idx_security_events_tenant_timestamp', 'tenant_id', 'timestamp'),
        Index('idx_security_events_risk_unresolved', 'risk_level', 'resolved'),
        Index('idx_security_events_type_timestamp', 'event_type', 'timestamp'),
        Index('idx_security_events_user_timestamp', 'user_id', 'timestamp'),
    )


class SecurityAssessment(Base):
    """
    Model for security assessment results.

    Stores periodic security assessments and scores for merchants
    to track security posture over time.
    """
    __tablename__ = "security_assessments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey(
        "tenants.id"), nullable=False, index=True)

    # Assessment scores
    overall_score = Column(Float, nullable=False)  # 0-100 security score
    risk_level = Column(String(20), nullable=False)

    # Assessment metrics
    active_threats = Column(Integer, default=0, nullable=False)
    policy_violations = Column(Integer, default=0, nullable=False)
    total_events = Column(Integer, default=0, nullable=False)
    critical_events = Column(Integer, default=0, nullable=False)
    high_risk_events = Column(Integer, default=0, nullable=False)

    # Assessment details
    assessment_period_days = Column(Integer, default=30, nullable=False)
    recommendations = Column(JSONB, nullable=True)  # List of recommendations
    detailed_metrics = Column(JSONB, nullable=True)  # Detailed assessment data

    # Assessment metadata
    assessment_date = Column(DateTime(timezone=True),
                             server_default=func.now(), nullable=False)
    generated_by = Column(String(255), nullable=True)  # User ID or system

    # Relationships
    tenant = relationship("Tenant", back_populates="security_assessments")

    # Indexes
    __table_args__ = (
        Index('idx_security_assessments_tenant_date',
              'tenant_id', 'assessment_date'),
        Index('idx_security_assessments_score_risk',
              'overall_score', 'risk_level'),
    )


class SecurityAuditLog(Base):
    """
    Model for enhanced security audit logging.

    Provides detailed audit trails for security-sensitive operations
    with enhanced metadata and correlation capabilities.
    """
    __tablename__ = "security_audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey(
        "tenants.id"), nullable=False, index=True)

    # Audit event details
    action = Column(String(100), nullable=False, index=True)
    resource_type = Column(String(100), nullable=False, index=True)
    resource_id = Column(String(255), nullable=True, index=True)
    resource_name = Column(String(255), nullable=True)

    # User context
    user_id = Column(String(255), nullable=False, index=True)
    user_email = Column(String(255), nullable=True)
    user_roles = Column(JSONB, nullable=True)  # User roles at time of action

    # Request context
    ip_address = Column(String(45), nullable=True, index=True)
    user_agent = Column(Text, nullable=True)
    request_id = Column(String(100), nullable=True,
                        index=True)  # For correlation
    session_id = Column(String(100), nullable=True, index=True)

    # Audit details
    before_state = Column(JSONB, nullable=True)  # State before change
    after_state = Column(JSONB, nullable=True)   # State after change
    changes = Column(JSONB, nullable=True)       # Specific changes made
    metadata = Column(JSONB, nullable=True)      # Additional audit data

    # Risk and compliance
    risk_level = Column(String(20), default="low", nullable=False)
    compliance_tags = Column(JSONB, nullable=True)  # Compliance standards
    retention_date = Column(DateTime(timezone=True),
                            nullable=True)  # For data retention

    # Outcome and status
    success = Column(Boolean, nullable=False)
    error_message = Column(Text, nullable=True)
    response_code = Column(Integer, nullable=True)

    # Timestamps
    timestamp = Column(DateTime(timezone=True),
                       server_default=func.now(), nullable=False)
    created_at = Column(DateTime(timezone=True),
                        server_default=func.now(), nullable=False)

    # Relationships
    tenant = relationship("Tenant", back_populates="security_audit_logs")

    # Indexes
    __table_args__ = (
        Index('idx_security_audit_logs_tenant_timestamp',
              'tenant_id', 'timestamp'),
        Index('idx_security_audit_logs_user_action', 'user_id', 'action'),
        Index('idx_security_audit_logs_resource',
              'resource_type', 'resource_id'),
        Index('idx_security_audit_logs_risk_success', 'risk_level', 'success'),
        Index('idx_security_audit_logs_request_id', 'request_id'),
    )


class SecurityAlert(Base):
    """
    Model for security alerts and notifications.

    Manages security alerts generated from policy violations,
    threat detection, and other security events.
    """
    __tablename__ = "security_alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey(
        "tenants.id"), nullable=False, index=True)

    # Alert details
    alert_type = Column(String(100), nullable=False, index=True)
    # low, medium, high, critical
    severity = Column(String(20), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)

    # Source information
    # Related security event
    source_event_id = Column(UUID(as_uuid=True), nullable=True)
    source_policy_id = Column(
        UUID(as_uuid=True), nullable=True)  # Related policy
    # System that generated alert
    source_system = Column(String(100), nullable=True)

    # Alert data
    metadata = Column(JSONB, nullable=True)  # Additional alert data
    affected_resources = Column(JSONB, nullable=True)  # Resources affected
    recommended_actions = Column(JSONB, nullable=True)  # Recommended responses

    # Alert status
    # open, acknowledged, resolved, dismissed
    status = Column(String(20), default="open", nullable=False)
    acknowledged_by = Column(String(255), nullable=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by = Column(String(255), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolution_notes = Column(Text, nullable=True)

    # Notifications
    # Track notification channels used
    notifications_sent = Column(JSONB, nullable=True)
    escalation_level = Column(Integer, default=0, nullable=False)
    last_escalated_at = Column(DateTime(timezone=True), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True),
                        server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(
    ), onupdate=func.now(), nullable=False)

    # Relationships
    tenant = relationship("Tenant", back_populates="security_alerts")

    # Indexes
    __table_args__ = (
        Index('idx_security_alerts_tenant_status', 'tenant_id', 'status'),
        Index('idx_security_alerts_severity_created', 'severity', 'created_at'),
        Index('idx_security_alerts_type_status', 'alert_type', 'status'),
    )
