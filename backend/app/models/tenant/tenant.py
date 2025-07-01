"""
Tenant model for multi-tenant platform.

This module defines the Tenant model which represents a merchant/seller in the system,
including their subdomain and optional custom domain configuration.
"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Table, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class Tenant(Base):
    """
    Tenant model representing a merchant/seller in the multi-tenant system.
    
    A tenant has its own subdomain and optionally a custom domain, as well as
    branding, settings, and other configurations specific to the tenant.
    """
    __tablename__ = "tenants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False, index=True)
    subdomain = Column(String(63), nullable=False, unique=True, index=True)
    custom_domain = Column(String(253), nullable=True, unique=True, index=True)
    
    # Admin user who owns this tenant
    admin_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    admin_user = relationship("User", back_populates="owned_tenants", foreign_keys=[admin_user_id])
    
    # Tenant status
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    
    # Branding
    display_name = Column(String(100), nullable=True)
    logo_url = Column(String(255), nullable=True)
    primary_color = Column(String(7), nullable=True)  # Hex color code
    secondary_color = Column(String(7), nullable=True)  # Hex color code
    
    # Contact info
    contact_email = Column(String(255), nullable=True)
    contact_phone = Column(String(20), nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships (to be extended as needed)
    # users = relationship("User", back_populates="tenant")
    
    def __repr__(self):
        return f"<Tenant {self.name} ({self.subdomain})>"
