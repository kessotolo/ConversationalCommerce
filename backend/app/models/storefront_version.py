import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.app.db.base_class import Base


class StorefrontVersion(Base):
    """
    Versioned snapshots of storefront configurations for historical tracking.
    Enables version comparison, restoration, and audit capabilities.
    """

    __tablename__ = "storefront_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    storefront_config_id = Column(
        UUID(as_uuid=True),
        ForeignKey("storefront_configs.id", ondelete="CASCADE"),
        nullable=False,
    )
    version_number = Column(Integer, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # Version metadata
    change_summary = Column(String(255), nullable=True)
    change_description = Column(Text, nullable=True)
    tags = Column(JSONB, nullable=False, default=lambda: [])

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Complete snapshot of configuration at this version point
    configuration_snapshot = Column(JSONB, nullable=False)

    # Relationships
    storefront_config = relationship("StorefrontConfig")

    __table_args__ = (
        # Ensure version numbers are unique per storefront config
        Index(
            "idx_unique_storefront_version",
            "storefront_config_id",
            "version_number",
            unique=True,
        ),
        # Index for efficient version retrieval
        Index("idx_storefront_version_created", "storefront_config_id", "created_at"),
    )
