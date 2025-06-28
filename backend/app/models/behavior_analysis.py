import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class BehaviorPattern(Base):
    __tablename__ = "behavior_patterns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey(
        "tenants.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String)
    pattern_type = Column(String, nullable=False)  # user, system, security
    conditions = Column(JSON, nullable=False)  # pattern matching conditions
    severity = Column(String, nullable=False)  # low, medium, high, critical
    threshold = Column(Float, nullable=False)  # threshold for pattern matching
    cooldown_minutes = Column(Integer, default=60)  # cooldown period
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(
        timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    tenant = relationship("Tenant", back_populates="behavior_patterns")
    detections = relationship("PatternDetection", back_populates="pattern")


class PatternDetection(Base):
    __tablename__ = "pattern_detections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey(
        "tenants.id"), nullable=False)
    pattern_id = Column(
        UUID(as_uuid=True), ForeignKey("behavior_patterns.id"), nullable=False
    )
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    detection_type = Column(String, nullable=False)  # user, system, security
    confidence_score = Column(Float, nullable=False)
    evidence = Column(JSON, nullable=False)  # collected evidence
    status = Column(String, nullable=False)  # pending, reviewed, resolved
    review_status = Column(String)  # approved, rejected, escalated
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    reviewed_at = Column(DateTime)
    resolution_notes = Column(String)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(
        timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    tenant = relationship("Tenant", back_populates="pattern_detections")
    pattern = relationship("BehaviorPattern", back_populates="detections")
    user = relationship("User", foreign_keys=[user_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    violations = relationship("Violation", back_populates="detection")
    evidence = relationship("Evidence", back_populates="detection")


class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey(
        "tenants.id"), nullable=False)
    detection_id = Column(
        UUID(as_uuid=True), ForeignKey("pattern_detections.id"), nullable=False
    )
    evidence_type = Column(String, nullable=False)  # log, activity, metric
    source = Column(String, nullable=False)  # system, user, security
    data = Column(JSON, nullable=False)  # evidence data
    collected_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(
        timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    tenant = relationship("Tenant", back_populates="evidence")
    detection = relationship("PatternDetection", back_populates="evidence")
