import enum
import uuid

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from backend.app.db.base_class import Base


class ComponentType(enum.Enum):
    """Types of UI components that can be used in the storefront"""

    HERO = "hero"
    CAROUSEL = "carousel"
    PRODUCT_GRID = "product_grid"
    PRODUCT_LIST = "product_list"
    FEATURED_PRODUCTS = "featured_products"
    CATEGORY_SHOWCASE = "category_showcase"
    TEXT_BLOCK = "text_block"
    IMAGE_BLOCK = "image_block"
    VIDEO_BLOCK = "video_block"
    TESTIMONIALS = "testimonials"
    NEWSLETTER_SIGNUP = "newsletter_signup"
    CONTACT_FORM = "contact_form"
    CALL_TO_ACTION = "call_to_action"
    SOCIAL_FEED = "social_feed"
    CUSTOM = "custom"


class ComponentPlacement(enum.Enum):
    """Valid placement locations for components"""

    HEADER = "header"
    MAIN = "main"
    SIDEBAR = "sidebar"
    FOOTER = "footer"
    POPUP = "popup"
    PRODUCT_PAGE = "product_page"
    CATEGORY_PAGE = "category_page"
    CHECKOUT = "checkout"


class StorefrontComponent(Base):
    """
    Reusable UI component for storefront layouts.
    Defines component properties, constraints, and configuration options.
    """

    __tablename__ = "storefront_components"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )

    # Component identification
    name = Column(String(255), nullable=False)
    component_type = Column(Enum(ComponentType, create_type=False), nullable=False)

    # Configuration
    properties = Column(JSONB, nullable=False, default=lambda: {})
    constraints = Column(JSONB, nullable=False, default=lambda: {})
    allowed_placements = Column(JSONB, nullable=False, default=lambda: [])

    # Version management
    version = Column(String(50), nullable=False, default="1.0.0")
    is_active = Column(Boolean, nullable=False, default=True)

    # Component configuration schema for validation
    property_schema = Column(JSONB, nullable=False, default=lambda: {})

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    tenant = relationship("Tenant")

    __table_args__ = (
        # Indexes for efficient component management
        Index("idx_component_tenant", "tenant_id"),
        Index("idx_component_type", "tenant_id", "component_type"),
    )
