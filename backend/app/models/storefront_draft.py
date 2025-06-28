import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base_class import Base


class StorefrontDraft(Base):
    """
    Draft version of storefront configuration for the editing workflow.
    Allows for making changes without affecting the published storefront.
    """

    __tablename__ = "storefront_drafts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    storefront_config_id = Column(
        UUID(as_uuid=True),
        ForeignKey("storefront_configs.id", ondelete="CASCADE"),
        nullable=False,
    )
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # Draft metadata
    name = Column(String(255), nullable=True)  # Optional draft name for identification
    expires_at = Column(DateTime(timezone=True), nullable=True)  # Auto-expiration date

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Full copy of the configuration data
    subdomain_name = Column(String(63), nullable=False)
    custom_domain = Column(String(255), nullable=True)

    # Storefront metadata
    meta_title = Column(String(255), nullable=True)
    meta_description = Column(String(500), nullable=True)

    # Theme configuration
    theme_settings = Column(JSONB, nullable=False, default=lambda: {})

    # Layout components
    layout_config = Column(JSONB, nullable=False, default=lambda: {})

    # Social links
    social_links = Column(JSONB, nullable=False, default=lambda: {})

    # Relationships
    storefront_config = relationship("StorefrontConfig", back_populates="drafts")

    __table_args__ = (Index("idx_draft_storefront_config", "storefront_config_id"),)
