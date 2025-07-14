import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Table
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.app.db import Base


# Association table for variant option values and variants
variant_option_values_association = Table(
    'variant_option_values_association',
    Base.metadata,
    Column('variant_id', UUID(as_uuid=True),
           ForeignKey('product_variants.id')),
    Column('option_value_id', UUID(as_uuid=True),
           ForeignKey('variant_option_values.id'))
)


class VariantOption(Base):
    """
    Product variant options (e.g., Size, Color, Material)
    """
    __tablename__ = "variant_options"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey(
        "products.id"), nullable=False)
    name = Column(String, nullable=False)
    # COLOR, SIZE, MATERIAL, STYLE, OTHER
    type = Column(String, nullable=False)
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow,
                        onupdate=datetime.utcnow)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey(
        "tenants.id"), nullable=True)
    option_metadata = Column(JSONB, nullable=True)

    # Relationships
    product = relationship("Product", back_populates="variant_options")
    values = relationship("VariantOptionValue",
                          back_populates="option", cascade="all, delete-orphan")


class VariantOptionValue(Base):
    """
    Values for variant options (e.g., Small, Medium, Large for Size)
    """
    __tablename__ = "variant_option_values"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    option_id = Column(UUID(as_uuid=True), ForeignKey(
        "variant_options.id"), nullable=False)
    name = Column(String, nullable=False)
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow,
                        onupdate=datetime.utcnow)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey(
        "tenants.id"), nullable=True)
    option_value_metadata = Column(JSONB, nullable=True)

    # Relationships
    option = relationship("VariantOption", back_populates="values")
    variants = relationship(
        "ProductVariant", secondary=variant_option_values_association, back_populates="option_values")


class ProductVariant(Base):
    """
    Product variant model (e.g., Small Blue T-shirt)
    """
    __tablename__ = "product_variants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey(
        "products.id"), nullable=False)
    sku = Column(String, nullable=False, unique=True)
    name = Column(String, nullable=True)
    price = Column(Float, nullable=True)  # If null, use product price
    inventory_quantity = Column(Integer, nullable=False, default=0)
    image_url = Column(String, nullable=True)
    barcode = Column(String, nullable=True)
    weight = Column(Float, nullable=True)
    weight_unit = Column(String, nullable=True)
    # {"length": 10, "width": 5, "height": 2, "unit": "cm"}
    dimensions = Column(JSONB, nullable=True)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow,
                        onupdate=datetime.utcnow)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey(
        "tenants.id"), nullable=True)

    # Relationships
    product = relationship("Product", back_populates="variants")
    option_values = relationship(
        "VariantOptionValue", secondary=variant_option_values_association, back_populates="variants")
