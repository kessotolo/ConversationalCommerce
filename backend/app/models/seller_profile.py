from sqlalchemy import Column, String, ForeignKey
from app.db import Base
import uuid


class SellerProfile(Base):
    __tablename__ = "seller_profiles"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"))
    store_name = Column(String)
    slug = Column(String, unique=True)
    bio = Column(String)
    logo_url = Column(String)
    banner_url = Column(String)
    whatsapp_number = Column(String, nullable=True)
    instagram_handle = Column(String, nullable=True)
    facebook_page = Column(String, nullable=True)
    tiktok_handle = Column(String, nullable=True)
