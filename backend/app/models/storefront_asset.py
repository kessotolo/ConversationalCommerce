from sqlalchemy import Column, String, Integer, ForeignKey, Enum, DateTime, Boolean, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base
import uuid
import enum

class AssetType(enum.Enum):
    """Types of assets that can be stored"""
    IMAGE = "image"
    VIDEO = "video"
    DOCUMENT = "document"
    AUDIO = "audio"
    OTHER = "other"

class StorefrontAsset(Base):
    """
    Tenant-specific assets for storefront customization.
    Includes metadata, usage tracking, and optimization options.
    """
    __tablename__ = "storefront_assets"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    
    # Basic asset information
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=True)
    file_path = Column(String(512), nullable=False)  # Tenant-specific path
    file_size = Column(Integer, nullable=False)  # Size in bytes
    mime_type = Column(String(127), nullable=False)
    asset_type = Column(Enum(AssetType), nullable=False)
    
    # Asset metadata
    alt_text = Column(String(255), nullable=True)
    title = Column(String(255), nullable=True)
    description = Column(String(1000), nullable=True)
    metadata = Column(JSONB, nullable=False, default=lambda: {})  # For type-specific metadata (dimensions, duration, etc.)
    
    # Usage tracking
    usage_count = Column(Integer, nullable=False, default=0)
    usage_locations = Column(JSONB, nullable=False, default=lambda: [])  # Where this asset is used
    
    # Version tracking
    version = Column(Integer, nullable=False, default=1)
    parent_asset_id = Column(UUID(as_uuid=True), ForeignKey("storefront_assets.id"), nullable=True)  # For tracking asset versions
    
    # Status
    is_active = Column(Boolean, nullable=False, default=True)
    is_optimized = Column(Boolean, nullable=False, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    tenant = relationship("Tenant")
    parent_asset = relationship("StorefrontAsset", remote_side=[id])
    child_assets = relationship("StorefrontAsset", 
                               backref="parent", 
                               cascade="all, delete-orphan",
                               foreign_keys=[parent_asset_id])
    
    __table_args__ = (
        # Indexes for efficient asset retrieval
        Index("idx_asset_tenant", "tenant_id"),
        Index("idx_asset_type", "tenant_id", "asset_type"),
        Index("idx_asset_parent", "parent_asset_id"),
    )
