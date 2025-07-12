import uuid
from sqlalchemy import Column, DateTime, String, Boolean, ForeignKey, JSON, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from backend.app.db import Base
import enum


class PaymentMethodType(enum.Enum):
    CARD = "CARD"
    MOBILE_MONEY = "MOBILE_MONEY"
    BANK_TRANSFER = "BANK_TRANSFER"
    USSD = "USSD"


class SavedPaymentMethod(Base):
    __tablename__ = "saved_payment_methods"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id = Column(UUID(as_uuid=True), ForeignKey(
        "customers.id"), nullable=False, index=True)
    type = Column(Enum(PaymentMethodType, create_type=False), nullable=False)
    details = Column(JSON, nullable=False)  # Encrypted JSON
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
