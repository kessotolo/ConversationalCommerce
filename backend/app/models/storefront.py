import enum
import uuid

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from backend.app.db.base_class import Base


class StorefrontStatus(enum.Enum):
    """Status enum for storefront configurations"""

    DRAFT = "draft"
    PUBLISHED = "published"
    SCHEDULED = "scheduled"
    ARCHIVED = "archived"


class StorefrontConfig(Base):
    """Configuration for tenant-specific storefronts."""

    __tablename__ = "storefront_configs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    subdomain_name = Column(String(63), nullable=False)
    custom_domain = Column(String(255), nullable=True)
    domain_verified = Column(Boolean, default=False)

    # Publishing workflow fields
    status = Column(
        Enum(StorefrontStatus, create_type=False), default=StorefrontStatus.DRAFT, nullable=False
    )
    published_at = Column(DateTime(timezone=True), nullable=True)
    scheduled_publish_at = Column(DateTime(timezone=True), nullable=True)
    published_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Storefront metadata
    meta_title = Column(String(255), nullable=True)
    meta_description = Column(String(500), nullable=True)

    # Theme configuration
    theme_settings = Column(JSONB, nullable=False, default=lambda: {})

    # Relationships
    tenant = relationship("Tenant", back_populates="storefront_config")
    drafts = relationship(
        "StorefrontDraft",
        back_populates="storefront_config",
        cascade="all, delete-orphan",
    )

    # Layout components - structured as JSON with component types and their configurations
    layout_config = Column(
        JSONB,
        nullable=False,
        default=lambda: {
            "hero": {"enabled": True, "type": "banner", "content": []},
            "featured_products": {
                "enabled": True,
                "title": "Featured Products",
                "limit": 8,
            },
            "categories": {"enabled": True, "display_mode": "grid"},
            "about": {"enabled": True, "content": ""},
        },
    )

    # Social links
    social_links = Column(
        JSONB,
        nullable=False,
        default=lambda: {
            "whatsapp": "",
            "instagram": "",
            "facebook": "",
            "twitter": "",
            "tiktok": "",
        },
    )

    __table_args__ = (
        UniqueConstraint("subdomain_name", name="uq_storefront_subdomain"),
        UniqueConstraint("custom_domain", name="uq_storefront_custom_domain"),
        UniqueConstraint("tenant_id", name="uq_tenant_storefront_config"),
        Index("idx_tenant_storefront", "tenant_id"),
    )
