from sqlalchemy import Column, String, Float, ForeignKey, DateTime, Boolean, Numeric, Integer, Index
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid

from app.db.base_class import Base


class Product(Base):
    __tablename__ = "products"
    
    # Define table indexes for better query performance
    __table_args__ = (
        Index('idx_product_seller', 'seller_id'),
        Index('idx_product_price', 'price'),
        Index('idx_product_featured', 'is_featured'),
        Index('idx_product_storefront', 'show_on_storefront'),
        Index('idx_product_deleted', 'is_deleted')
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    description = Column(String, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    image_url = Column(String, nullable=True)
    seller_id = Column(UUID(as_uuid=True), ForeignKey(
        "users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow,
                        onupdate=datetime.utcnow)
    # New fields for channel toggles and social media
    show_on_storefront = Column(Boolean, default=True)
    show_on_whatsapp = Column(Boolean, default=True)
    show_on_instagram = Column(Boolean, default=False)
    whatsapp_caption = Column(String, nullable=True)
    storefront_url = Column(String, nullable=True)
    video_url = Column(String, nullable=True)
    whatsapp_status_url = Column(String, nullable=True)
    instagram_story_url = Column(String, nullable=True)
    is_deleted = Column(Boolean, default=False)
    is_featured = Column(Boolean, default=False)
    # Version column for optimistic locking - prevents concurrent modifications
    version = Column(Integer, default=0, nullable=False)
