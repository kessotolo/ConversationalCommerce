import uuid

from sqlalchemy import Column, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID

from app.app.db import Base


class SellerProfile(Base):
    __tablename__ = "seller_profiles"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    store_name = Column(String)
    slug = Column(String, unique=True)
    bio = Column(String)
    logo_url = Column(String)
    banner_url = Column(String)
