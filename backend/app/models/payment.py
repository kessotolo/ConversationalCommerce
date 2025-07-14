from datetime import datetime, timezone
import uuid

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID

from app.app.core.security.payment_security import (
    decrypt_sensitive_data,
    encrypt_sensitive_data,
)
from app.app.db.base_class import Base


class Payment(Base):
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey(
        "orders.id"), nullable=False, index=True)
    reference = Column(String(255), nullable=False, unique=True, index=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(3), nullable=False)
    provider = Column(String(50), nullable=False)
    status = Column(String(50), nullable=False)
    customer_email = Column(String(255), nullable=False)
    customer_name = Column(String(255), nullable=True)
    payment_method = Column(String(50), nullable=True)
    transaction_date = Column(String(50), nullable=True)
    provider_reference = Column(String(255), nullable=True)
    # Renamed from metadata to avoid SQLAlchemy reserved attribute conflict
    payment_metadata = Column(JSON, nullable=True)
    verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))
    idempotency_key = Column(
        String(255), nullable=True, unique=True, index=True)
    # Store client IP for security
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)  # Store client user agent
    risk_score = Column(Float, nullable=True)  # Optional risk assessment score

    # Relationships
    order = relationship("Order", back_populates="payments")
    manual_proof = relationship(
        "ManualPaymentProof", back_populates="payment", uselist=False
    )

    # Audit trail for changes
    audit_log = relationship("PaymentAuditLog", back_populates="payment")


class PaymentAuditLog(Base):
    """Audit log for payment changes to detect suspicious activity"""

    __tablename__ = "payment_audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    payment_id = Column(UUID(as_uuid=True), ForeignKey(
        "payments.id"), nullable=False)
    action = Column(String(50), nullable=False)  # CREATE, UPDATE, VERIFY, etc.
    previous_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey(
        "users.id"), nullable=True)  # Who made the change
    ip_address = Column(String(45), nullable=True)
    changes = Column(JSON, nullable=True)  # What was changed
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    payment = relationship("Payment", back_populates="audit_log")
    user = relationship("User")


class ManualPaymentProof(Base):
    __tablename__ = "manual_payment_proofs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    payment_id = Column(UUID(as_uuid=True), ForeignKey(
        "payments.id"), nullable=False, unique=True)
    reference = Column(String(255), nullable=False)
    transfer_date = Column(String(10), nullable=False)  # YYYY-MM-DD
    bank_name = Column(String(255), nullable=True)
    account_name = Column(String(255), nullable=True)
    screenshot_url = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    payment = relationship("Payment", back_populates="manual_proof")


class ProviderConfiguration(Base):
    __tablename__ = "payment_provider_configurations"

    id = Column(Integer, primary_key=True)
    settings_id = Column(Integer, ForeignKey(
        "payment_settings.id"), nullable=False)
    provider = Column(String(50), nullable=False)
    enabled = Column(Boolean, default=False)
    is_default = Column(Boolean, default=False)

    # Store encrypted API keys
    _public_key = Column(String(1000), nullable=True)
    _secret_key = Column(String(1000), nullable=True)
    _encryption_key = Column(String(1000), nullable=True)

    # Access to encrypted fields with auto encryption/decryption
    @hybrid_property
    def public_key(self) -> str:
        return decrypt_sensitive_data(self._public_key) if self._public_key else None

    @public_key.setter
    def public_key(self, value: str) -> None:
        self._public_key = encrypt_sensitive_data(value) if value else None

    @hybrid_property
    def secret_key(self) -> str:
        return decrypt_sensitive_data(self._secret_key) if self._secret_key else None

    @secret_key.setter
    def secret_key(self, value: str) -> None:
        self._secret_key = encrypt_sensitive_data(value) if value else None

    @hybrid_property
    def encryption_key(self) -> str:
        return (
            decrypt_sensitive_data(self._encryption_key)
            if self._encryption_key
            else None
        )

    @encryption_key.setter
    def encryption_key(self, value: str) -> None:
        self._encryption_key = encrypt_sensitive_data(value) if value else None

    # Webhook settings
    webhook_secret = Column(String(1000), nullable=True)
    webhook_url = Column(String(500), nullable=True)

    # Additional provider-specific settings
    additional_settings = Column(JSON, nullable=True)

    # When keys were last changed - for key rotation policy
    keys_last_rotated = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    settings = relationship("PaymentSettings", back_populates="providers")


class PaymentSettings(Base):
    __tablename__ = "payment_settings"

    id = Column(Integer, primary_key=True)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"),
                       nullable=False, unique=True)
    online_payments_enabled = Column(Boolean, default=False)
    platform_fee_percentage = Column(Float, default=5.0)
    auto_calculate_payout = Column(Boolean, default=True)
    fraud_detection_enabled = Column(Boolean, default=True)
    rate_limiting_enabled = Column(Boolean, default=True)
    webhook_security_enabled = Column(Boolean, default=True)

    # Bank transfer details - sensitive data encrypted
    _bank_name = Column(String(500), nullable=True)
    _account_name = Column(String(500), nullable=True)
    _account_number = Column(String(500), nullable=True)
    bank_instructions = Column(Text, nullable=True)

    # Access to encrypted fields with auto encryption/decryption
    @hybrid_property
    def bank_name(self) -> str:
        return decrypt_sensitive_data(self._bank_name) if self._bank_name else None

    @bank_name.setter
    def bank_name(self, value: str) -> None:
        self._bank_name = encrypt_sensitive_data(value) if value else None

    @hybrid_property
    def account_name(self) -> str:
        return (
            decrypt_sensitive_data(
                self._account_name) if self._account_name else None
        )

    @account_name.setter
    def account_name(self, value: str) -> None:
        self._account_name = encrypt_sensitive_data(value) if value else None

    @hybrid_property
    def account_number(self) -> str:
        return (
            decrypt_sensitive_data(self._account_number)
            if self._account_number
            else None
        )

    @account_number.setter
    def account_number(self, value: str) -> None:
        self._account_number = encrypt_sensitive_data(value) if value else None

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    tenant = relationship("Tenant", back_populates="payment_settings")
    providers = relationship(
        "ProviderConfiguration", back_populates="settings", cascade="all, delete-orphan"
    )


class RateLimitLog(Base):
    """Track rate limits for payment endpoints to prevent abuse"""

    __tablename__ = "payment_rate_limit_logs"

    id = Column(Integer, primary_key=True)
    ip_address = Column(String(45), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey(
        "users.id"), nullable=True, index=True)
    endpoint = Column(String(255), nullable=False)
    request_count = Column(Integer, default=1)
    first_request_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc))
    last_request_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User")


class PaymentSplitRule(Base):
    """Rules for splitting payments between platform and sellers"""

    __tablename__ = "payment_split_rules"

    id = Column(Integer, primary_key=True)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey(
        "tenants.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    platform_percentage = Column(Float, nullable=False)
    platform_flat_fee = Column(Float, default=0.0)
    # account (seller) or subaccount (platform)
    bearer = Column(String(20), default="account")

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    tenant = relationship("Tenant")
