import uuid

from sqlalchemy import JSON, Boolean, Column, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.app.db import Base


class StorefrontThemeVersion(Base):
    """
    Model for storing versioned theme configurations.
    Enables theme versioning, rollback, and change tracking.
    """

    __tablename__ = "storefront_theme_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    theme_id = Column(UUID(as_uuid=True), ForeignKey(
        "storefront_themes.id"), nullable=False)
    # e.g., "1.0.0", "2.1.3"
    version_number = Column(String(32), nullable=False)
    # Version name like "Classic Blue", "Modern Dark"
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Theme configuration at this version
    colors = Column(JSON, nullable=False, default=dict)
    typography = Column(JSON, nullable=False, default=dict)
    layout = Column(JSON, nullable=False, default=dict)
    component_styles = Column(JSON, nullable=False, default=dict)

    # Version metadata
    is_published = Column(Boolean, default=False)
    is_active = Column(Boolean, default=False)
    change_notes = Column(Text, nullable=True)
    created_by = Column(UUID(as_uuid=True),
                        ForeignKey("users.id"), nullable=True)

    # Relationships
    theme = relationship("StorefrontTheme", back_populates="versions")
    creator = relationship("User", back_populates="theme_versions_created")

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Constraints
    __table_args__ = (
        Index("idx_theme_version_theme", "theme_id"),
        Index("idx_theme_version_number", "theme_id", "version_number"),
    )

    def __repr__(self) -> str:
        return f"<StorefrontThemeVersion {self.name} v{self.version_number} ({self.id})>"
