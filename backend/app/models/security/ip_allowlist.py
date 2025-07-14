"""
IP Allowlisting models for administrative access restrictions.

This module defines the models for managing IP-based access controls,
including allowlists for specific admin users, roles, or global settings.
"""

import uuid
import ipaddress
from datetime import datetime, timezone
from typing import Optional, List

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, UniqueConstraint, Index, Integer
from sqlalchemy.dialects.postgresql import UUID, CIDR, ARRAY
from sqlalchemy.orm import relationship

from app.app.db.base_class import Base


class IPAllowlistEntry(Base):
    """
    IP address or CIDR range entry for the allowlist.

    Each entry represents a specific IP address or CIDR range that is allowed
    to access the admin interface, with optional time restrictions.
    """
    __tablename__ = "ip_allowlist_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # IP address or CIDR range (stored as CIDR type in PostgreSQL)
    ip_range = Column(CIDR, nullable=False)

    # Optional description for this entry
    description = Column(String(255), nullable=True)

    # Time restrictions
    expires_at = Column(DateTime(timezone=True), nullable=True)

    # Status
    is_active = Column(Boolean, nullable=False, default=True)

    # What this allowlist entry applies to
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    role_id = Column(UUID(as_uuid=True), ForeignKey(
        "admin_roles.id"), nullable=True)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey(
        "tenants.id"), nullable=True)

    # If all fields are NULL, this is a global allowlist entry
    is_global = Column(Boolean, nullable=False, default=False)

    # Audit fields
    created_at = Column(DateTime(timezone=True), nullable=False,
                        default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False,
                        default=lambda: datetime.now(timezone.utc))
    created_by = Column(UUID(as_uuid=True), ForeignKey(
        "users.id"), nullable=False)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    role = relationship("Role")
    tenant = relationship("Tenant")
    creator = relationship("User", foreign_keys=[created_by])

    __table_args__ = (
        # Ensure IP ranges don't overlap for the same scope
        UniqueConstraint('ip_range', 'user_id', 'role_id',
                         'tenant_id', 'is_global', name='uq_ip_allowlist_scope'),
        # Indexes for efficient lookups
        Index('ix_ip_allowlist_entries_user_id', user_id),
        Index('ix_ip_allowlist_entries_role_id', role_id),
        Index('ix_ip_allowlist_entries_tenant_id', tenant_id),
        Index('ix_ip_allowlist_entries_is_global', is_global),
        Index('ix_ip_allowlist_entries_is_active', is_active),
    )

    def __repr__(self):
        scope = "global" if self.is_global else ""
        if self.user_id:
            scope = f"user:{self.user_id}"
        elif self.role_id:
            scope = f"role:{self.role_id}"
        elif self.tenant_id:
            scope = f"tenant:{self.tenant_id}"

        return f"<IPAllowlistEntry {self.ip_range} scope={scope} active={self.is_active}>"


class IPAllowlistSetting(Base):
    """
    Global and scope-specific settings for IP allowlisting.

    Defines whether IP allowlisting is enforced for different scopes
    (global, tenant, role, etc.) and related configuration options.
    """
    __tablename__ = "ip_allowlist_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # What these settings apply to (NULL for global)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey(
        "tenants.id"), nullable=True)
    role_id = Column(UUID(as_uuid=True), ForeignKey(
        "admin_roles.id"), nullable=True)

    # Settings
    is_enforced = Column(Boolean, nullable=False, default=False)
    allow_temporary_bypass = Column(Boolean, nullable=False, default=True)
    temporary_bypass_duration_minutes = Column(
        Integer, nullable=False, default=60)

    # Geolocation settings (optional)
    # ISO country codes to restrict to
    geo_restrict_countries = Column(ARRAY(String(2)), nullable=True)
    # ISO country codes to block
    geo_block_countries = Column(ARRAY(String(2)), nullable=True)

    # Audit fields
    created_at = Column(DateTime(timezone=True), nullable=False,
                        default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False,
                        default=lambda: datetime.now(timezone.utc))
    created_by = Column(UUID(as_uuid=True), ForeignKey(
        "users.id"), nullable=False)
    updated_by = Column(UUID(as_uuid=True), ForeignKey(
        "users.id"), nullable=False)

    # Relationships
    tenant = relationship("Tenant")
    role = relationship("Role")
    creator = relationship("User", foreign_keys=[created_by])
    updater = relationship("User", foreign_keys=[updated_by])

    __table_args__ = (
        # Ensure only one setting per scope
        UniqueConstraint('tenant_id', 'role_id',
                         name='uq_ip_allowlist_setting_scope'),
        # Indexes
        Index('ix_ip_allowlist_settings_tenant_id', tenant_id),
        Index('ix_ip_allowlist_settings_role_id', role_id),
        Index('ix_ip_allowlist_settings_is_enforced', is_enforced),
    )

    def __repr__(self):
        scope = "global"
        if self.tenant_id:
            scope = f"tenant:{self.tenant_id}"
        if self.role_id:
            scope = f"{scope}+role:{self.role_id}" if self.tenant_id else f"role:{self.role_id}"

        return f"<IPAllowlistSetting scope={scope} enforced={self.is_enforced}>"


class IPTemporaryBypass(Base):
    """
    Temporary bypass records for IP allowlisting.

    Tracks instances where a user has been granted temporary access
    from an IP address not on the allowlist.
    """
    __tablename__ = "ip_temporary_bypasses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # User and IP information
    user_id = Column(UUID(as_uuid=True), ForeignKey(
        "users.id"), nullable=False)
    ip_address = Column(String(45), nullable=False)  # IPv4/IPv6 address

    # Time restrictions
    created_at = Column(DateTime(timezone=True), nullable=False,
                        default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=False)

    # Additional context
    reason = Column(String(255), nullable=True)
    user_agent = Column(String(255), nullable=True)

    # Verification method
    # email, sms, etc.
    verification_method = Column(String(50), nullable=False)

    # Relationships
    user = relationship("User")

    __table_args__ = (
        # Indexes for efficient lookups
        Index('ix_ip_temporary_bypasses_user_id', user_id),
        Index('ix_ip_temporary_bypasses_ip_address', ip_address),
        Index('ix_ip_temporary_bypasses_expires_at', expires_at),
    )

    def __repr__(self):
        return f"<IPTemporaryBypass user_id={self.user_id} ip={self.ip_address} expires={self.expires_at}>"
