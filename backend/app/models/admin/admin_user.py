"""
Admin User models for the Super Admin RBAC system.

This module defines the AdminUser and AdminUserRole models that extend the base
User model with Super Admin capabilities.
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db import Base


class AdminUser(Base):
    """
    AdminUser model for the Super Admin RBAC system.
    
    This model extends the base User model with Super Admin specific attributes.
    It represents users who have administrative capabilities across the platform.
    """
    __tablename__ = "admin_users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Link to the main users table
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True
    )
    
    # Admin user attributes
    is_active = Column(Boolean, default=True, nullable=False)
    is_super_admin = Column(Boolean, default=False, nullable=False)
    
    # Security settings
    require_2fa = Column(Boolean, default=False, nullable=False)
    allowed_ip_ranges = Column(JSONB)  # List of allowed IP ranges/CIDRs
    
    # Admin preferences
    preferences = Column(JSONB)  # User preferences for the admin interface
    
    # Last successful authentication
    last_login_at = Column(DateTime(timezone=True))
    last_login_ip = Column(String)
    
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
        return f"<AdminUser id={self.id} user_id={self.user_id}>"


class AdminUserRole(Base):
    """
    Association model between admin users and roles.
    
    This model associates roles with admin users, optionally scoped to specific tenants
    for tenant-scoped permissions.
    """
    __tablename__ = "admin_user_roles"
    __table_args__ = (
        # Ensure user + role + tenant_id combination is unique
        UniqueConstraint("admin_user_id", "role_id", "tenant_id", name="uq_admin_user_role_tenant"),
    )
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admin_user_id = Column(
        UUID(as_uuid=True),
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
    created_by_id = Column(UUID(as_uuid=True), nullable=True)  # Admin user who assigned this role
    
    # Relationships
    admin_user = relationship("AdminUser", back_populates="roles")
    role = relationship("Role", back_populates="admin_users")
    
    def __repr__(self):
        tenant_str = f" for tenant {self.tenant_id}" if self.tenant_id else ""
        return f"<AdminUserRole {self.admin_user_id}:{self.role.name}{tenant_str}>"
