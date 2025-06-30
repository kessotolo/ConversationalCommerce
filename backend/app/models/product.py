import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.db import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    description = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    inventory_quantity = Column(Integer, nullable=False, default=0)
    image_url = Column(String, nullable=True)
    seller_id = Column(UUID(as_uuid=True), ForeignKey(
        "users.id"), nullable=False)
    # Product type (PHYSICAL, DIGITAL, SERVICE, etc.)
    type = Column(String, nullable=True)
    # Product status (ACTIVE, DRAFT, ARCHIVED, etc.)
    status = Column(String, default="ACTIVE")
    # Track inventory flag
    track_inventory = Column(Boolean, default=True)
    # Short description for product cards/listings
    short_description = Column(String, nullable=True)
    # SKU (Stock Keeping Unit)
    sku = Column(String, nullable=True)
    # Barcode (UPC, EAN, etc.)
    barcode = Column(String, nullable=True)
    # Weight and dimensions
    weight = Column(Float, nullable=True)
    weight_unit = Column(String, default="kg", nullable=True)
    # {"length": 10, "width": 5, "height": 2, "unit": "cm"}
    dimensions = Column(JSONB, nullable=True)
    # Additional product metadata
    product_metadata = Column(JSONB, nullable=True)
    # SEO information
    # {"title": "SEO Title", "description": "SEO Description", "keywords": ["keyword1", "keyword2"]}
    seo = Column(JSONB, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow,
                        onupdate=datetime.utcnow)
    published_at = Column(DateTime, nullable=True)
    # Add fields expected by tests
    is_featured = Column(Boolean, default=False)
    show_on_storefront = Column(Boolean, default=True)
    show_on_whatsapp = Column(Boolean, default=True)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey(
        "tenants.id"), nullable=True)

    # Soft delete flag
    is_deleted = Column(Boolean, default=False)

    # Relationships
    complaints = relationship("Complaint", back_populates="product")
    # Variant relationships
    variants = relationship(
        "ProductVariant", back_populates="product", cascade="all, delete-orphan")
    variant_options = relationship(
        "VariantOption", back_populates="product", cascade="all, delete-orphan")
