"""
Feature flag model for managing feature availability across tenants.

This module defines the FeatureFlag model and TenantFeatureFlagOverride model
for managing feature flags globally and per-tenant.
"""

import uuid
from typing import Optional, Dict, Any, List

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, JSON, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from backend.app.db.base_class import Base


class FeatureFlag(Base):
    """
    Global feature flag definition.

    A feature flag represents a feature that can be enabled or disabled globally
    or overridden at the tenant level.
    """
    __tablename__ = "feature_flags"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    key = Column(String(100), nullable=False, unique=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)

    # Default state (can be overridden by tenant)
    is_enabled = Column(Boolean, default=False, nullable=False)

    # Feature type (e.g., "ui", "api", "integration")
    feature_type = Column(String(50), nullable=False)

    # Additional configuration (JSON)
    config = Column(JSON, nullable=True)

    # Tenant overrides
    tenant_overrides = relationship(
        "TenantFeatureFlagOverride", back_populates="feature_flag")

    # Audit fields
    created_by = Column(UUID(as_uuid=True),
                        ForeignKey("users.id"), nullable=True)
    updated_by = Column(UUID(as_uuid=True),
                        ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now())

    def __repr__(self):
        return f"<FeatureFlag {self.key} ({self.is_enabled})>"


class TenantFeatureFlagOverride(Base):
    """
    Tenant-specific override for a feature flag.

    This allows individual tenants to have different settings for features
    compared to the global default.
    """
    __tablename__ = "tenant_feature_flag_overrides"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Relationships
    feature_flag_id = Column(UUID(as_uuid=True), ForeignKey(
        "feature_flags.id"), nullable=False)
    feature_flag = relationship(
        "FeatureFlag", back_populates="tenant_overrides")

    tenant_id = Column(UUID(as_uuid=True), ForeignKey(
        "tenants.id"), nullable=False)
    tenant = relationship("Tenant", back_populates="feature_flag_overrides")

    # Override state
    is_enabled = Column(Boolean, nullable=False)

    # Custom configuration overrides (JSON)
    config_override = Column(JSON, nullable=True)

    # Audit fields
    created_by = Column(UUID(as_uuid=True),
                        ForeignKey("users.id"), nullable=True)
    updated_by = Column(UUID(as_uuid=True),
                        ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now())

    __table_args__ = (
        # Ensure one override per tenant per feature flag
        UniqueConstraint("tenant_id", "feature_flag_id",
                         name="tenant_feature_flag_uc"),
    )

    def __repr__(self):
        return f"<TenantFeatureFlagOverride {self.tenant_id} - {self.feature_flag_id} ({self.is_enabled})>"
