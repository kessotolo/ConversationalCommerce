from sqlalchemy import Column, String, Float, ForeignKey, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid

from app.db.base_class import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    description = Column(String, nullable=False)
    price = Column(Float, nullable=False)
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
