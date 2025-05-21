from sqlalchemy import Column, String, Float, Boolean, ForeignKey
from app.db import Base
import uuid

class Product(Base):
    __tablename__ = "products"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    description = Column(String)
    price = Column(Float, nullable=False)
    available = Column(Boolean, default=True)
    seller_id = Column(String, ForeignKey("seller_profiles.id"))
