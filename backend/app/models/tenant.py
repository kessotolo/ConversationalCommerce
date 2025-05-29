from sqlalchemy import Column, String, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db import Base
import uuid

class Tenant(Base):
    """
    Model for storing tenant information for the multi-tenant architecture.
    Each tenant represents a separate storefront with its own themes, products, etc.
    """
    __tablename__ = "tenants"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    subdomain = Column(String, nullable=False, unique=True)
    custom_domain = Column(String, nullable=True, unique=True)
    
    # Settings and configuration
    is_active = Column(Boolean, default=True)
    settings = Column(UUID(as_uuid=True), nullable=True)  # JSON settings would be better
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
