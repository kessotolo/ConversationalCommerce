"""
Core enum type definitions.

This module centralizes all SQL enum type definitions to ensure they are
defined once and reused consistently throughout the application.
These enums are consumed by models and are also used by Alembic migrations.
"""
import enum
from sqlalchemy import Enum as SQLAlchemyEnum


class KYCStatus(str, enum.Enum):
    """KYC verification status enum."""
    NOT_STARTED = "NOT_STARTED"
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"


class PaymentMethodType(str, enum.Enum):
    """Payment method types enum."""
    CARD = "CARD"
    MOBILE_MONEY = "MOBILE_MONEY"
    BANK_TRANSFER = "BANK_TRANSFER"
    USSD = "USSD"


class OrderSource(str, enum.Enum):
    """Order source channel enum."""
    WHATSAPP = "whatsapp"
    WEBSITE = "website"
    INSTAGRAM = "instagram"


class OrderStatus(str, enum.Enum):
    """Order processing status enum."""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


# SQLAlchemy enum type objects with checkfirst=True to prevent duplication
# These are used by both models and Alembic migrations
KYCStatusEnum = SQLAlchemyEnum(
    KYCStatus,
    name="kycstatus",
    create_constraint=True,
    validate_strings=True,
    native_enum=True,
    length=255,
)

PaymentMethodTypeEnum = SQLAlchemyEnum(
    PaymentMethodType,
    name="paymentmethodtype",
    create_constraint=True,
    validate_strings=True,
    native_enum=True,
    length=255,
)

OrderSourceEnum = SQLAlchemyEnum(
    OrderSource,
    name="ordersource",
    create_constraint=True,
    validate_strings=True,
    native_enum=True,
    length=255,
)

OrderStatusEnum = SQLAlchemyEnum(
    OrderStatus,
    name="orderstatus",
    create_constraint=True,
    validate_strings=True,
    native_enum=True,
    length=255,
)
