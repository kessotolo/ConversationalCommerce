from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db import Base
import uuid


class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True)
    is_seller = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey(
        "tenants.id"), nullable=False)
    ban_end_at = Column(DateTime, nullable=True)
    
    # Relationships
    violations = relationship("Violation", back_populates="user", foreign_keys="[Violation.user_id]")
    reviewed_pattern_detections = relationship("PatternDetection", back_populates="reviewer", foreign_keys="[PatternDetection.reviewed_by]")
    reviewed_content_analyses = relationship("ContentAnalysisResult", back_populates="reviewer", foreign_keys="[ContentAnalysisResult.reviewed_by]")
    complaints = relationship("Complaint", back_populates="user")
