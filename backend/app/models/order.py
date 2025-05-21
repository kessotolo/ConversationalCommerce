from sqlalchemy import Column, String, Enum, ForeignKey
from app.db import Base
import uuid
import enum

class OrderStatus(str, enum.Enum):
    pending = "pending"
    fulfilled = "fulfilled"
    cancelled = "cancelled"

class Order(Base):
    __tablename__ = "orders"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = Column(String, ForeignKey("products.id"))
    buyer_name = Column(String)
    buyer_phone = Column(String)
    order_source = Column(String)  # whatsapp or form
    status = Column(Enum(OrderStatus), default=OrderStatus.pending)
