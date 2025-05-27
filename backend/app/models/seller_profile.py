from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.db import Base
import uuid


class SellerProfile(Base):
    __tablename__ = "seller_profiles"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    store_name = Column(String)
    slug = Column(String, unique=True)
    bio = Column(String)
    logo_url = Column(String)
    banner_url = Column(String)
    whatsapp_number = Column(String, nullable=True)
    instagram_handle = Column(String, nullable=True)
    facebook_page = Column(String, nullable=True)
    tiktok_handle = Column(String, nullable=True)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey(
        "tenants.id"), nullable=False)
