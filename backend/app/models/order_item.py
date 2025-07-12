import uuid

from sqlalchemy import UUID, Column, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from backend.app.db import Base


class OrderItem(Base):
    """
    OrderItem SQLAlchemy model representing items within an order.
    This model matches the relationship used in the order_service.py
    and creates the appropriate database structure.
    """

    __tablename__ = "order_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    price = Column(Float, nullable=False)
    subtotal = Column(Float, nullable=False)

    # Relationships
    order = relationship("Order", back_populates="items")
    product = relationship("Product")

    # Timestamps
    created_at = Column(String, server_default=func.now())
    updated_at = Column(String, onupdate=func.now())
