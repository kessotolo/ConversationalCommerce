import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    String,
    Text
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db import Base


class PaymentMethodType(str, enum.Enum):
    credit_card = "credit_card"
    debit_card = "debit_card"
    mobile_money = "mobile_money"
    bank_account = "bank_account"
    paypal = "paypal"
    apple_pay = "apple_pay"
    google_pay = "google_pay"
    other = "other"


class PaymentMethod(Base):
    """Model for saved payment methods."""
    __tablename__ = "payment_methods"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    tenant_id = Column(UUID(as_uuid=True), nullable=False, index=True)

    # Payment details
    payment_type = Column(
        Enum(PaymentMethodType), nullable=False)
    nickname = Column(String)  # User-defined name for this payment method

    # Provider-specific details (tokenized/encrypted as needed)
    # Payment provider (e.g., Stripe, PayPal)
    provider = Column(String, nullable=False)
    provider_token = Column(String, nullable=False)  # Token from provider
    provider_payment_id = Column(String)  # ID from provider

    # Display-safe details (last 4 digits, expiry date, etc.)
    display_name = Column(String)  # E.g., "Visa ending in 4242"
    last_four = Column(String)  # Last 4 digits of card/account
    expiry_date = Column(String)  # MM/YY format for cards
    billing_address = Column(JSONB)  # Billing address details

    # Settings
    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)

    # Metadata
    payment_metadata = Column(JSONB)  # Additional data from payment provider

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_used_at = Column(DateTime(timezone=True))
