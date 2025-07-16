import enum
import uuid

from sqlalchemy import Boolean, Column, DateTime, String, Enum, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db import Base


class KYCStatus(enum.Enum):
    """Enumeration for KYC verification status"""
    NOT_STARTED = "not_started"
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


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

    # Domain verification fields
    domain_verified = Column(Boolean, default=False)
    is_verified = Column(Boolean, nullable=False, default=False)
    domain_verification_token = Column(String, nullable=True)
    domain_verification_attempts = Column(
        JSONB, nullable=True)  # Store verification history

    # Country and KYC information
    country_code = Column(String(2), nullable=True)  # ISO 3166-1 alpha-2 code
    kyc_status = Column(Enum(KYCStatus),
                        default=KYCStatus.NOT_STARTED)
    # Store KYC data specific to country
    kyc_data = Column(JSONB, nullable=True)
    # Store document URLs and metadata
    kyc_documents = Column(JSONB, nullable=True)
    kyc_updated_at = Column(DateTime(timezone=True), nullable=True)

    # Main phone (WhatsApp-enabled preferred)
    phone_number = Column(String, nullable=False, unique=True, index=True)
    # Alternate WhatsApp number (optional)
    whatsapp_number = Column(String, nullable=True)

    # Settings and configuration
    is_active = Column(Boolean, default=True)
    storefront_enabled = Column(Boolean, default=True)
    # JSON settings would be better
    settings = Column(UUID(as_uuid=True), nullable=True)

    # Relationships
    storefront_config = relationship(
        "StorefrontConfig",
        back_populates="tenant",
        uselist=False,
        cascade="all, delete-orphan",
    )
    complaints = relationship(
        "Complaint", back_populates="tenant", cascade="all, delete-orphan"
    )
    content_filter_rules = relationship(
        "ContentFilterRule", back_populates="tenant", cascade="all, delete-orphan"
    )
    content_analysis_results = relationship(
        "ContentAnalysisResult", back_populates="tenant", cascade="all, delete-orphan"
    )
    violations = relationship(
        "Violation", back_populates="tenant", cascade="all, delete-orphan"
    )
    behavior_patterns = relationship(
        "BehaviorPattern", back_populates="tenant", cascade="all, delete-orphan"
    )
    pattern_detections = relationship(
        "PatternDetection", back_populates="tenant", cascade="all, delete-orphan"
    )
    evidence = relationship(
        "Evidence", back_populates="tenant", cascade="all, delete-orphan"
    )
    payment_settings = relationship(
        "PaymentSettings", back_populates="tenant", uselist=False, cascade="all, delete-orphan"
    )
    # Settings relationships
    settings_domains = relationship(
        "SettingsDomain", back_populates="tenant", cascade="all, delete")
    settings = relationship(
        "Setting", back_populates="tenant", cascade="all, delete")
    # Feature flag overrides
    feature_flag_overrides = relationship(
        "TenantFeatureFlagOverride", back_populates="tenant", cascade="all, delete-orphan")

    # Security relationships (Track A Phase 3)
    security_policies = relationship(
        "MerchantSecurityPolicy", back_populates="tenant", cascade="all, delete-orphan")
    security_events = relationship(
        "SecurityEvent", back_populates="tenant", cascade="all, delete-orphan")
    security_assessments = relationship(
        "SecurityAssessment", back_populates="tenant", cascade="all, delete-orphan")
    security_audit_logs = relationship(
        "SecurityAuditLog", back_populates="tenant", cascade="all, delete-orphan")
    security_alerts = relationship(
        "SecurityAlert", back_populates="tenant", cascade="all, delete-orphan")

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # New email field
    email = Column(String, nullable=True, unique=True, index=True)
