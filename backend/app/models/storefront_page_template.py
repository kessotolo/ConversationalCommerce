from sqlalchemy import Column, String, ForeignKey, Boolean, Integer, DateTime, Enum, Index, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base
import uuid
import enum

class PageType(enum.Enum):
    """Types of pages that can be created in the storefront"""
    HOME = "home"
    PRODUCT = "product"
    CATEGORY = "category"
    ABOUT = "about"
    CONTACT = "contact"
    CUSTOM = "custom"
    CHECKOUT = "checkout"
    CART = "cart"
    ACCOUNT = "account"
    POLICY = "policy"

class StorefrontPageTemplate(Base):
    """
    Template for different page types in the storefront.
    Defines structure, layout, and available component slots.
    """
    __tablename__ = "storefront_page_templates"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    
    # Template identification
    name = Column(String(255), nullable=False)
    page_type = Column(Enum(PageType), nullable=False)
    description = Column(Text, nullable=True)
    
    # Template configuration
    layout_structure = Column(JSONB, nullable=False, default=lambda: {
        "sections": [
            {
                "id": "header",
                "allowedComponents": ["HEADER"]
            },
            {
                "id": "main",
                "allowedComponents": ["*"]
            },
            {
                "id": "footer",
                "allowedComponents": ["FOOTER"]
            }
        ]
    })
    
    # Component slots and configurations
    component_slots = Column(JSONB, nullable=False, default=lambda: [])
    
    # Inheritance
    parent_template_id = Column(UUID(as_uuid=True), ForeignKey("storefront_page_templates.id"), nullable=True)
    inheritance_rules = Column(JSONB, nullable=False, default=lambda: {
        "override": [],
        "extend": []
    })
    
    # Usage
    is_system = Column(Boolean, nullable=False, default=False)  # System templates cannot be deleted
    is_active = Column(Boolean, nullable=False, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    tenant = relationship("Tenant")
    parent_template = relationship("StorefrontPageTemplate", remote_side=[id])
    child_templates = relationship("StorefrontPageTemplate", 
                                  backref="parent", 
                                  foreign_keys=[parent_template_id])
    
    __table_args__ = (
        # Indexes for efficient template management
        Index("idx_template_tenant", "tenant_id"),
        Index("idx_template_type", "tenant_id", "page_type"),
        Index("idx_template_parent", "parent_template_id"),
    )
