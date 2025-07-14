"""
Role models for the Super Admin RBAC system.

This module defines the Role and RoleHierarchy models which form the foundation
of the role-based access control system for platform administrators.
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
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db import Base


class Role(Base):
    """
    Role model for the Super Admin RBAC system.
    
    Roles define sets of permissions and can be assigned to admin users.
    Roles can inherit permissions from parent roles through the RoleHierarchy table.
    """
    __tablename__ = "admin_roles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False, unique=True)
    description = Column(Text)
    
    # Whether this role is a system role that cannot be modified/deleted
    is_system = Column(Boolean, default=False, nullable=False)
    
    # Whether this role is specific to a tenant or global across the platform
    is_tenant_scoped = Column(Boolean, default=False, nullable=False)
    
    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    permissions = relationship(
        "RolePermission",
        back_populates="role", 
        cascade="all, delete-orphan"
    )
    
    admin_users = relationship(
        "AdminUserRole",
        back_populates="role",
        cascade="all, delete-orphan"
    )
    
    # Role hierarchy relationships
    parent_relationships = relationship(
        "RoleHierarchy",
        foreign_keys="RoleHierarchy.child_role_id",
        back_populates="child_role",
        cascade="all, delete-orphan"
    )
    
    child_relationships = relationship(
        "RoleHierarchy",
        foreign_keys="RoleHierarchy.parent_role_id",
        back_populates="parent_role",
        cascade="all, delete-orphan"
    )
    
    def __repr__(self):
        return f"<Role {self.name}>"


class RoleHierarchy(Base):
    """
    Model representing the hierarchical relationship between roles.
    
    A child role inherits all permissions from its parent roles.
    """
    __tablename__ = "admin_role_hierarchy"
    __table_args__ = (
        UniqueConstraint("parent_role_id", "child_role_id", name="uq_role_hierarchy"),
    )
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    parent_role_id = Column(
        UUID(as_uuid=True),
        ForeignKey("admin_roles.id", ondelete="CASCADE"),
        nullable=False
    )
    child_role_id = Column(
        UUID(as_uuid=True),
        ForeignKey("admin_roles.id", ondelete="CASCADE"),
        nullable=False
    )
    
    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    parent_role = relationship(
        "Role",
        foreign_keys=[parent_role_id],
        back_populates="child_relationships"
    )
    
    child_role = relationship(
        "Role",
        foreign_keys=[child_role_id],
        back_populates="parent_relationships"
    )
    
    def __repr__(self):
        return f"<RoleHierarchy {self.parent_role.name} -> {self.child_role.name}>"
