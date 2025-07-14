"""
Admin User models for the Super Admin RBAC system.

This module defines the AdminUser and AdminUserRole models that extend the base
User model with Super Admin capabilities and Clerk Organizations integration.
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.app.db import Base


class AdminUser(Base):
    """
    AdminUser model for the Super Admin RBAC system.

    This model represents users who have administrative capabilities across the platform.
    It integrates with Clerk Organizations for authentication and authorization.
    """
    __tablename__ = "admin_users"

    # Use Clerk user ID as primary key for direct integration
    id = Column(String, primary_key=True)  # Clerk user ID

    # Basic user information from Clerk
    email = Column(String, nullable=False, unique=True)

    # Admin user attributes
    is_active = Column(Boolean, default=True, nullable=False)
    is_super_admin = Column(Boolean, default=False, nullable=False)

    # Clerk Organizations integration
    clerk_organization_id = Column(
        String, nullable=True)  # Clerk organization ID
    # Role within the organization
    clerk_organization_role = Column(String, nullable=True)

    # Security settings
    require_2fa = Column(Boolean, default=False, nullable=False)
    allowed_ip_ranges = Column(JSONB)  # List of allowed IP ranges/CIDRs

    # Admin preferences
    preferences = Column(JSONB)  # User preferences for the admin interface

    # Last successful authentication
    last_login_at = Column(DateTime(timezone=True))
    last_login_ip = Column(String)

    # Session management
    session_timeout_minutes = Column(Integer, default=60)  # Default 1 hour
    last_activity_at = Column(DateTime(timezone=True))

    # Security tracking
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    password_changed_at = Column(DateTime(timezone=True), nullable=True)

    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    roles = relationship(
        "AdminUserRole",
        back_populates="admin_user",
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<AdminUser id={self.id} email={self.email} org={self.clerk_organization_id}>"

    def is_session_expired(self) -> bool:
        """Check if the user's session has expired."""
        if not self.last_activity_at:
            return True

        from datetime import datetime, timezone, timedelta
        timeout_delta = timedelta(minutes=self.session_timeout_minutes)
        return datetime.now(timezone.utc) - self.last_activity_at > timeout_delta

    def is_account_locked(self) -> bool:
        """Check if the account is locked due to failed login attempts."""
        if not self.locked_until:
            return False

        from datetime import datetime, timezone
        return datetime.now(timezone.utc) < self.locked_until

    def update_activity(self):
        """Update the last activity timestamp."""
        from datetime import datetime, timezone
        self.last_activity_at = datetime.now(timezone.utc)


class AdminUserRole(Base):
    """
    Association model between admin users and roles.

    This model associates roles with admin users, optionally scoped to specific tenants
    for tenant-scoped permissions.
    """
    __tablename__ = "admin_user_roles"
    __table_args__ = (
        # Ensure user + role + tenant_id combination is unique
        UniqueConstraint("admin_user_id", "role_id", "tenant_id",
                         name="uq_admin_user_role_tenant"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admin_user_id = Column(
        String,  # Changed to String to match AdminUser.id
        ForeignKey("admin_users.id", ondelete="CASCADE"),
        nullable=False
    )
    role_id = Column(
        UUID(as_uuid=True),
        ForeignKey("admin_roles.id", ondelete="CASCADE"),
        nullable=False
    )

    # Optional tenant_id for tenant-scoped roles
    tenant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=True
    )

    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    # Admin user who assigned this role
    created_by_id = Column(String, nullable=True)

    # Relationships
    admin_user = relationship("AdminUser", back_populates="roles")
    role = relationship("Role", back_populates="admin_users")

    def __repr__(self):
        tenant_str = f" for tenant {self.tenant_id}" if self.tenant_id else ""
        return f"<AdminUserRole {self.admin_user_id}:{self.role.name}{tenant_str}>"
