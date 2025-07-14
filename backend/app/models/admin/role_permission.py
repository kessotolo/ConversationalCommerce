"""
Role Permission mapping model for the Super Admin RBAC system.

This module defines the relationship between roles and permissions.
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.app.db import Base


class RolePermission(Base):
    """
    Association model between roles and permissions.
    
    This model associates permissions with roles, optionally with tenant-specific
    conditions for tenant-scoped roles.
    """
    __tablename__ = "admin_role_permissions"
    __table_args__ = (
        # Ensure role + permission combination is unique
        UniqueConstraint("role_id", "permission_id", name="uq_role_permission"),
    )
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    role_id = Column(
        UUID(as_uuid=True),
        ForeignKey("admin_roles.id", ondelete="CASCADE"),
        nullable=False
    )
    permission_id = Column(
        UUID(as_uuid=True),
        ForeignKey("admin_permissions.id", ondelete="CASCADE"),
        nullable=False
    )
    
    # Optional condition that further restricts when this permission applies
    # This is a string representation of a lambda or simple expression
    condition = Column(Text)
    
    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    role = relationship("Role", back_populates="permissions")
    permission = relationship("Permission", back_populates="roles")
    
    def __repr__(self):
        return f"<RolePermission {self.role.name}:{self.permission.resource}:{self.permission.action}>"
