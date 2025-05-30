from sqlalchemy import Column, String, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db import Base
import uuid

class Tenant(Base):
    """
    Model for storing tenant information for the multi-tenant architecture.
    Each tenant represents a separate storefront with its own themes, products, etc.
    """
    __tablename__ = "tenants"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    subdomain = Column(String, nullable=False, unique=True)
    custom_domain = Column(String, nullable=True, unique=True)
    
    # Settings and configuration
    is_active = Column(Boolean, default=True)
    settings = Column(UUID(as_uuid=True), nullable=True)  # JSON settings would be better
    
    # Relationships
    storefront_config = relationship("StorefrontConfig", back_populates="tenant", uselist=False, cascade="all, delete-orphan")
    complaints = relationship("Complaint", back_populates="tenant", cascade="all, delete-orphan")
    content_filter_rules = relationship("ContentFilterRule", back_populates="tenant", cascade="all, delete-orphan")
    content_analysis_results = relationship("ContentAnalysisResult", back_populates="tenant", cascade="all, delete-orphan")
    violations = relationship("Violation", back_populates="tenant", cascade="all, delete-orphan")
    behavior_patterns = relationship("BehaviorPattern", back_populates="tenant", cascade="all, delete-orphan")
    pattern_detections = relationship("PatternDetection", back_populates="tenant", cascade="all, delete-orphan")
    evidence = relationship("Evidence", back_populates="tenant", cascade="all, delete-orphan")
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
