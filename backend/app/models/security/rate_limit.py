"""
Rate limiting and brute force protection models.

This module defines the models for:
- Tracking login attempts and failures
- Managing account lockouts
- Storing IP-based rate limits
"""

import uuid
import enum
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Enum, Index, CheckConstraint, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class LoginAttemptResult(str, enum.Enum):
    """Result of a login attempt."""
    SUCCESS = "success"
    FAILED_PASSWORD = "failed_password"
    FAILED_2FA = "failed_2fa"
    LOCKED_OUT = "locked_out"
    RATE_LIMITED = "rate_limited"
    SUSPICIOUS = "suspicious"
    INVALID_USER = "invalid_user"


class LoginAttempt(Base):
    """
    Record of a login attempt.

    Tracks successful and failed login attempts for security monitoring
    and brute force protection.
    """
    __tablename__ = "login_attempts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # User information (may be null for invalid usernames)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    # Store the username even if user doesn't exist
    username = Column(String(255), nullable=False)

    # Request metadata
    ip_address = Column(String(45), nullable=False)
    user_agent = Column(String(512), nullable=True)

    # Authentication context
    tenant_id = Column(UUID(as_uuid=True), ForeignKey(
        "tenants.id"), nullable=True)
    is_admin_portal = Column(Boolean, nullable=False, default=False)

    # Result
    result = Column(Enum(LoginAttemptResult), nullable=False)

    # Additional details as JSON
    details = Column(JSONB, nullable=True)

    # Timestamps
    timestamp = Column(DateTime(timezone=True), nullable=False,
                       default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User")
    tenant = relationship("Tenant")

    __table_args__ = (
        # Indexes for efficient lookups and analysis
        Index('ix_login_attempts_user_id', user_id),
        Index('ix_login_attempts_username', username),
        Index('ix_login_attempts_ip_address', ip_address),
        Index('ix_login_attempts_timestamp', timestamp),
        Index('ix_login_attempts_result', result),
        Index('ix_login_attempts_tenant_id', tenant_id),
    )

    def __repr__(self):
        return f"<LoginAttempt username={self.username} ip={self.ip_address} result={self.result}>"


class AccountLockout(Base):
    """
    Account lockout record.

    Tracks when an account is locked due to suspicious activity
    or repeated failed login attempts.
    """
    __tablename__ = "account_lockouts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # User information
    user_id = Column(UUID(as_uuid=True), ForeignKey(
        "users.id"), nullable=False)

    # Lockout details
    # e.g., "failed_attempts", "suspicious_activity"
    reason = Column(String(50), nullable=False)
    locked_at = Column(DateTime(timezone=True), nullable=False,
                       default=lambda: datetime.now(timezone.utc))
    # Null for manual unlock required
    expires_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    # Who locked and unlocked the account
    locked_by_system = Column(Boolean, nullable=False,
                              default=True)  # True if automatic
    locked_by_user_id = Column(UUID(as_uuid=True), ForeignKey(
        "users.id"), nullable=True)  # Admin who locked
    unlocked_by_user_id = Column(UUID(as_uuid=True), ForeignKey(
        "users.id"), nullable=True)  # Admin who unlocked
    unlocked_at = Column(DateTime(timezone=True), nullable=True)

    # Additional context
    triggering_ip = Column(String(45), nullable=True)
    # Number of failed attempts that triggered lockout
    failed_attempts = Column(Integer, nullable=True)
    # Additional context about the lockout
    details = Column(JSONB, nullable=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    locked_by = relationship("User", foreign_keys=[locked_by_user_id])
    unlocked_by = relationship("User", foreign_keys=[unlocked_by_user_id])

    __table_args__ = (
        # Indexes
        Index('ix_account_lockouts_user_id', user_id),
        Index('ix_account_lockouts_is_active', is_active),
        Index('ix_account_lockouts_locked_at', locked_at),
    )

    def __repr__(self):
        status = "active" if self.is_active else "inactive"
        return f"<AccountLockout user_id={self.user_id} reason={self.reason} status={status}>"


class RateLimitRule(Base):
    """
    Rate limiting rule configuration.

    Defines rules for rate limiting various actions based on
    IP address, user, or other factors.
    """
    __tablename__ = "rate_limit_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Rule identification
    name = Column(String(100), nullable=False, unique=True)
    # API endpoint pattern or null for global
    endpoint = Column(String(255), nullable=True)

    # Limits
    requests_per_second = Column(Integer, nullable=True)
    requests_per_minute = Column(Integer, nullable=True)
    requests_per_hour = Column(Integer, nullable=True)

    # What happens when limit is exceeded
    block_duration_seconds = Column(Integer, nullable=False, default=60)

    # Whether rule is active
    is_active = Column(Boolean, nullable=False, default=True)

    # Scope and exemptions
    applies_to_admins = Column(Boolean, nullable=False, default=True)
    applies_to_authenticated = Column(Boolean, nullable=False, default=True)
    applies_to_anonymous = Column(Boolean, nullable=False, default=True)

    # Creation and update info
    created_at = Column(DateTime(timezone=True), nullable=False,
                        default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False,
                        default=lambda: datetime.now(timezone.utc))
    created_by = Column(UUID(as_uuid=True),
                        ForeignKey("users.id"), nullable=True)

    # Relationships
    creator = relationship("User")

    __table_args__ = (
        # Ensure at least one rate limit is defined
        CheckConstraint('requests_per_second IS NOT NULL OR requests_per_minute IS NOT NULL OR requests_per_hour IS NOT NULL',
                        name='chk_rate_limit_rules_has_limit'),
        # Indexes
        Index('ix_rate_limit_rules_endpoint', endpoint),
        Index('ix_rate_limit_rules_is_active', is_active),
    )

    def __repr__(self):
        limits = []
        if self.requests_per_second:
            limits.append(f"{self.requests_per_second}/s")
        if self.requests_per_minute:
            limits.append(f"{self.requests_per_minute}/m")
        if self.requests_per_hour:
            limits.append(f"{self.requests_per_hour}/h")

        limits_str = ", ".join(limits)
        endpoint = self.endpoint or "global"

        return f"<RateLimitRule name={self.name} endpoint={endpoint} limits={limits_str}>"


class RateLimitEntry(Base):
    """
    Rate limit tracking entry.

    Records rate limit violations and blocks for IPs and users.
    """
    __tablename__ = "rate_limit_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # What is being rate limited
    ip_address = Column(String(45), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Which rule triggered this
    rule_id = Column(UUID(as_uuid=True), ForeignKey(
        "rate_limit_rules.id"), nullable=False)

    # Current count and status
    request_count = Column(Integer, nullable=False, default=1)
    is_blocked = Column(Boolean, nullable=False, default=False)

    # Timeframe
    window_start = Column(DateTime(timezone=True), nullable=False,
                          default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=False)

    # Additional context
    path = Column(String(512), nullable=True)
    details = Column(JSONB, nullable=True)

    # Relationships
    user = relationship("User")
    rule = relationship("RateLimitRule")

    __table_args__ = (
        # Unique constraint to prevent duplicate entries for same IP/user/rule
        UniqueConstraint('ip_address', 'user_id', 'rule_id',
                         name='uq_rate_limit_entries_ip_user_rule'),
        # Indexes
        Index('ix_rate_limit_entries_ip_address', ip_address),
        Index('ix_rate_limit_entries_user_id', user_id),
        Index('ix_rate_limit_entries_is_blocked', is_blocked),
        Index('ix_rate_limit_entries_expires_at', expires_at),
    )

    def __repr__(self):
        target = f"ip={self.ip_address}"
        if self.user_id:
            target += f", user_id={self.user_id}"

        return f"<RateLimitEntry {target} rule={self.rule.name} count={self.request_count} blocked={self.is_blocked}>"
