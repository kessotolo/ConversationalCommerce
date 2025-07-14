import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class ContentFilterRule(Base):
    __tablename__ = "content_filter_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey(
        "tenants.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String)
    # product, message, review, etc.
    content_type = Column(String, nullable=False)
    field = Column(String, nullable=False)  # title, description, content, etc.
    # contains, regex, sentiment, etc.
    condition = Column(String, nullable=False)
    value = Column(String, nullable=False)  # pattern or threshold
    severity = Column(String, nullable=False)  # low, medium, high, critical
    action = Column(String, nullable=False)  # flag, reject, require_review
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(
        timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    tenant = relationship("Tenant", back_populates="content_filter_rules")
    analysis_results = relationship(
        "ContentAnalysisResult", back_populates="rule")


class ContentAnalysisResult(Base):
    __tablename__ = "content_analysis_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey(
        "tenants.id"), nullable=False)
    rule_id = Column(UUID(as_uuid=True), ForeignKey("content_filter_rules.id"))
    content_type = Column(String, nullable=False)
    content_id = Column(String, nullable=False)
    field = Column(String, nullable=False)
    original_content = Column(String, nullable=False)
    # text, image, sentiment, etc.
    analysis_type = Column(String, nullable=False)
    result = Column(JSON, nullable=False)  # analysis results
    status = Column(String, nullable=False)  # passed, flagged, rejected
    review_status = Column(String)  # pending, approved, rejected
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    reviewed_at = Column(DateTime)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(
        timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    tenant = relationship("Tenant", back_populates="content_analysis_results")
    rule = relationship("ContentFilterRule", back_populates="analysis_results")
    reviewer = relationship("User", foreign_keys=[reviewed_by])
