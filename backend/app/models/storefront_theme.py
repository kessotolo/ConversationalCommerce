import uuid

from sqlalchemy import JSON, Boolean, Column, DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from backend.app.db import Base


class StorefrontTheme(Base):
    """
    Model for storing theme configurations for tenant storefronts.
    Includes color schemes, typography settings, layout configurations, and component styles.
    """

    __tablename__ = "storefront_themes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey(
        "tenants.id"), nullable=False)
    description = Column(String, nullable=True)
    is_default = Column(Boolean, default=False)

    # Theme properties stored as JSON objects
    colors = Column(
        JSON, nullable=False, default=dict
    )  # Primary, secondary, accent colors, etc.
    typography = Column(
        JSON, nullable=False, default=dict
    )  # Font families, sizes, weights
    layout = Column(
        JSON, nullable=False, default=dict
    )  # Spacing, container widths, etc.
    component_styles = Column(
        JSON, nullable=False, default=dict
    )  # Button styles, card styles, etc.

    # Relationships
    versions = relationship("ThemeVersion",
                            back_populates="theme", cascade="all, delete-orphan")

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Add index for tenant_id to optimize queries filtering by tenant
    __table_args__ = (
        # Index for quick theme lookup by tenant
        Index("idx_theme_tenant", "tenant_id"),
    )
