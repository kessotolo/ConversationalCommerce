import enum
import uuid

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.app.db.base_class import Base


class BannerType(enum.Enum):
    """Types of banners that can be displayed"""

    HERO = "hero"
    PROMOTIONAL = "promotional"
    ANNOUNCEMENT = "announcement"
    CATEGORY = "category"
    SEASONAL = "seasonal"
    CUSTOM = "custom"


class BannerPlacement(enum.Enum):
    """Locations where banners can be placed"""

    HEADER = "header"
    HOMEPAGE = "homepage"
    CATEGORY_PAGE = "category_page"
    PRODUCT_PAGE = "product_page"
    FOOTER = "footer"
    SIDEBAR = "sidebar"
    POPUP = "popup"


class StorefrontBanner(Base):
    """
    Banner configuration for storefront customization.
    Includes scheduling, targeting, and analytics data.
    """

    __tablename__ = "storefront_banners"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )

    # Banner information
    name = Column(String(255), nullable=False)
    banner_type = Column(Enum(BannerType, create_type=False), nullable=False, default=BannerType.CUSTOM)
    placement = Column(Enum(BannerPlacement, create_type=False), nullable=False)

    # Content
    title = Column(String(255), nullable=True)
    subtitle = Column(String(500), nullable=True)
    content = Column(String(1000), nullable=True)
    call_to_action = Column(String(255), nullable=True)
    link_url = Column(String(500), nullable=True)

    # Image/asset reference
    asset_id = Column(
        UUID(as_uuid=True), ForeignKey("storefront_assets.id"), nullable=True
    )

    # Design configuration
    design_settings = Column(JSONB, nullable=False, default=lambda: {})

    # Scheduling
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    priority = Column(
        Integer, nullable=False, default=0
    )  # Higher number = higher priority

    # Targeting
    targeting_rules = Column(JSONB, nullable=False, default=lambda: {})

    # Analytics data
    impressions = Column(Integer, nullable=False, default=0)
    clicks = Column(Integer, nullable=False, default=0)
    conversions = Column(Integer, nullable=False, default=0)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    tenant = relationship("Tenant")
    asset = relationship("StorefrontAsset")

    __table_args__ = (
        # Indexes for efficient banner management
        Index("idx_banner_tenant", "tenant_id"),
        Index("idx_banner_active_tenant", "tenant_id", "is_active"),
        Index("idx_banner_scheduling", "start_date", "end_date"),
        Index("idx_banner_placement", "tenant_id", "placement"),
    )
