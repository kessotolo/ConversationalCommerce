"""
Two-Factor Authentication (2FA) models.

This module defines the models for managing Two-Factor Authentication,
including TOTP secrets, backup codes, and verification status.
"""

import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, JSON, Integer, Index
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship

from backend.app.db.base_class import Base


class TOTPSecret(Base):
    """
    Time-based One-Time Password (TOTP) secret for a user.

    Stores the encrypted secret key used for generating TOTP codes,
    along with metadata about when it was created and last used.
    """
    __tablename__ = "totp_secrets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey(
        "users.id"), nullable=False, unique=True)
    user = relationship("User", back_populates="totp_secret")

    # The secret key is encrypted at rest
    encrypted_secret = Column(String(128), nullable=False)

    # Algorithm and parameters
    algorithm = Column(String(10), nullable=False, default="SHA1")
    digits = Column(Integer, nullable=False, default=6)
    period = Column(Integer, nullable=False, default=30)

    # Status
    is_verified = Column(Boolean, nullable=False, default=False)
    is_enabled = Column(Boolean, nullable=False, default=False)

    # Recovery and backup
    # Hashed backup codes
    backup_codes = Column(ARRAY(String(10)), nullable=True)
    backup_codes_remaining = Column(Integer, nullable=False, default=0)

    # Audit fields
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    verified_at = Column(DateTime, nullable=True)
    last_used_at = Column(DateTime, nullable=True)

    # User info when created
    created_by_ip = Column(String(45), nullable=True)
    created_by_user_agent = Column(String(255), nullable=True)

    __table_args__ = (
        Index("ix_totp_secrets_user_id", user_id),
    )

    def __repr__(self):
        return f"<TOTPSecret user_id={self.user_id} verified={self.is_verified} enabled={self.is_enabled}>"


class AdminTOTPRequirement(Base):
    """
    Defines 2FA requirements for admin users.

    This table allows enforcing 2FA requirements based on role or other criteria.
    """
    __tablename__ = "admin_totp_requirements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # What this requirement applies to
    role_id = Column(UUID(as_uuid=True), ForeignKey(
        "admin_roles.id"), nullable=True)
    role = relationship("Role")

    # Tenant-specific or global
    tenant_id = Column(UUID(as_uuid=True), ForeignKey(
        "tenants.id"), nullable=True)
    tenant = relationship("Tenant")

    # Requirements
    is_required = Column(Boolean, nullable=False, default=True)
    grace_period_days = Column(Integer, nullable=False, default=7)

    # When this was set up
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_by = Column(UUID(as_uuid=True),
                        ForeignKey("users.id"), nullable=True)

    __table_args__ = (
        # Either role_id, tenant_id, or both must be specified
        # For NULL values, use a unique constraint with a where clause
        Index("ix_admin_totp_requirements_role_tenant",
              role_id, tenant_id, unique=True),
    )

    def __repr__(self):
        scope = "global"
        if self.role_id:
            scope = f"role:{self.role_id}"
        if self.tenant_id:
            scope = f"{scope}+tenant:{self.tenant_id}" if self.role_id else f"tenant:{self.tenant_id}"

        return f"<AdminTOTPRequirement {scope} required={self.is_required}>"
