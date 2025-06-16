import enum
import uuid

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base_class import Base


class LogoVariant(enum.Enum):
    """Types of logo variants that can be used"""

    PRIMARY = "primary"
    SECONDARY = "secondary"
    DARK = "dark"
    LIGHT = "light"
    MONOCHROME = "monochrome"
    FAVICON = "favicon"
    MOBILE = "mobile"


class StorefrontLogo(Base):
    """
    Logo configuration for storefront branding.
    Includes multiple variants for different contexts and display scenarios.
    """

    __tablename__ = "storefront_logos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )

    # Logo information
    variant = Column(Enum(LogoVariant), nullable=False, default=LogoVariant.PRIMARY)
    is_active = Column(Boolean, nullable=False, default=True)

    # Asset reference
    asset_id = Column(
        UUID(as_uuid=True), ForeignKey("storefront_assets.id"), nullable=False
    )

    # Display settings
    display_settings = Column(
        JSONB,
        nullable=False,
        default=lambda: {
            "maxWidth": "200px",
            "maxHeight": "80px",
            "padding": "0",
            "backgroundColor": "transparent",
        },
    )

    # Alt text and accessibility
    alt_text = Column(String(255), nullable=False, default="Company Logo")

    # Responsive behavior
    responsive_settings = Column(
        JSONB,
        nullable=False,
        default=lambda: {
            "mobile": {"maxWidth": "150px", "maxHeight": "60px"},
            "tablet": {"maxWidth": "180px", "maxHeight": "70px"},
            "desktop": {"maxWidth": "200px", "maxHeight": "80px"},
        },
    )

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    tenant = relationship("Tenant")
    asset = relationship("StorefrontAsset")

    __table_args__ = (
        # Only one active logo per variant per tenant
        Index(
            "idx_unique_active_logo_variant",
            "tenant_id",
            "variant",
            "is_active",
            unique=True,
            postgresql_where=is_active,
        ),
        # General indexes
        Index("idx_logo_tenant", "tenant_id"),
        Index("idx_logo_variant", "tenant_id", "variant"),
    )
