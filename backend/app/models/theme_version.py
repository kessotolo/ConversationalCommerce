import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Index, String, Text, Boolean
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base_class import Base


class ThemeVersion(Base):
    """
    Model for storing theme versions to support rollback functionality.
    Each version contains a complete snapshot of theme configuration.
    """

    __tablename__ = "theme_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    theme_id = Column(
        UUID(as_uuid=True), ForeignKey("storefront_themes.id", ondelete="CASCADE"), nullable=False
    )
    tenant_id = Column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )

    # Version metadata
    version_number = Column(String(50), nullable=False)  # e.g., "1.0.0", "2.1.3"
    name = Column(String(255), nullable=False)  # User-friendly version name
    description = Column(Text, nullable=True)  # Change description

    # Complete theme snapshot
    colors = Column(JSONB, nullable=False)
    typography = Column(JSONB, nullable=False)
    layout = Column(JSONB, nullable=False)
    component_styles = Column(JSONB, nullable=False)

    # Version tracking
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    is_published = Column(Boolean, default=False)  # Whether this version was published

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    theme = relationship("StorefrontTheme", back_populates="versions")
    tenant = relationship("Tenant")
    creator = relationship("User")

    __table_args__ = (
        Index("idx_theme_version_theme", "theme_id"),
        Index("idx_theme_version_tenant", "tenant_id"),
        Index("idx_theme_version_created", "created_at"),
    )