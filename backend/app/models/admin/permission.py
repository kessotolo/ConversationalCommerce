"""
Permission models for the Super Admin RBAC system.

This module defines the Permission and PermissionScope models which represent
the actions that can be performed on resources throughout the platform.
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from backend.app.db import Base


class PermissionScope(str, enum.Enum):
    """
    Enum representing the scope of a permission.
    
    - GLOBAL: Permission applies across the entire platform
    - TENANT: Permission applies only within the scope of a tenant
    - SELF: Permission applies only to resources owned by the user
    """
    GLOBAL = "global"
    TENANT = "tenant"
    SELF = "self"


class Permission(Base):
    """
    Permission model for the Super Admin RBAC system.
    
    A permission represents an action that can be performed on a resource.
    Permissions are assigned to roles, which are then assigned to users.
    """
    __tablename__ = "admin_permissions"
    __table_args__ = (
        # Ensure resource + action + scope combination is unique
        UniqueConstraint(
            "resource", "action", "scope", 
            name="uq_permission_resource_action_scope"
        ),
    )
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # The resource being acted upon (e.g., "user", "tenant", "order")
    resource = Column(String, nullable=False)
    
    # The action being performed (e.g., "create", "read", "update", "delete")
    action = Column(String, nullable=False)
    
    # The scope of the permission
    scope = Column(
        Enum(PermissionScope, create_type=False),
        nullable=False,
        default=PermissionScope.TENANT
    )
    
    # Description of what this permission allows
    description = Column(Text, nullable=False)
    
    # Whether this permission is a system permission that cannot be modified
    is_system = Column(Boolean, default=False, nullable=False)
    
    # Conditional expression that must be satisfied for the permission to be granted
    # This is a string representation of a lambda or simple expression
    condition = Column(Text)
    
    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    roles = relationship(
        "RolePermission",
        back_populates="permission",
        cascade="all, delete-orphan"
    )
    
    def __repr__(self):
        return f"<Permission {self.resource}:{self.action}:{self.scope}>"
