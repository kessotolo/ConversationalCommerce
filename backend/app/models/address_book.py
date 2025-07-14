import uuid
from sqlalchemy import Column, DateTime, String, Boolean, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.app.db import Base


class AddressBook(Base):
    __tablename__ = "address_book"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id = Column(UUID(as_uuid=True), ForeignKey(
        "customers.id"), nullable=False, index=True)
    street = Column(String, nullable=False)
    city = Column(String, nullable=False)
    state = Column(String, nullable=True)
    postal_code = Column(String, nullable=True)
    country = Column(String, nullable=False, default="Kenya")
    apartment = Column(String, nullable=True)
    landmark = Column(String, nullable=True)
    # {"latitude": float, "longitude": float}
    coordinates = Column(JSON, nullable=True)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
