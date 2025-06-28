from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class PaymentProvider(str, Enum):
    PAYSTACK = "paystack"
    FLUTTERWAVE = "flutterwave"
    MANUAL = "MANUAL"
    MPESA = "mpesa"
    STRIPE = "stripe"


class PaymentMethod(str, Enum):
    CARD = "CARD"
    MOBILE_MONEY = "MOBILE_MONEY"
    BANK_TRANSFER = "BANK_TRANSFER"
    CASH_ON_DELIVERY = "CASH_ON_DELIVERY"
    USSD = "USSD"


class PaymentStatus(str, Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"
    PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED"


class Money(BaseModel):
    value: float = Field(..., description="The monetary value", json_schema_extra={"example": 100.00})
    currency: str = Field(..., description="Currency code", json_schema_extra={"example": "USD"})


class ProviderCredentials(BaseModel):
    public_key: str = Field(...,
                            description="Public API key for the payment provider")
    secret_key: str = Field(...,
                            description="Secret API key for the payment provider")
    encryption_key: Optional[str] = Field(
        None, description="Encryption key (for Flutterwave)"
    )


class PaymentProviderConfig(BaseModel):
    provider: PaymentProvider = Field(..., description="Payment provider type")
    enabled: bool = Field(..., description="Whether this provider is enabled")
    credentials: ProviderCredentials = Field(
        ..., description="Provider API credentials"
    )
    is_default: Optional[bool] = Field(
        False, description="Whether this is the default provider"
    )
    test_mode: Optional[bool] = Field(
        False, description="Enable test mode for this provider"
    )


class BankAccountDetails(BaseModel):
    bank_name: str = Field(..., description="Bank name")
    account_name: str = Field(..., description="Account holder name")
    account_number: str = Field(..., description="Account number")
    instructions: Optional[str] = Field(
        None, description="Additional instructions for transfers"
    )


class PaymentSettings(BaseModel):
    online_payments_enabled: bool = Field(
        ..., description="Whether online payments are enabled"
    )
    providers: List[PaymentProviderConfig] = Field(
        ..., description="Configured payment providers"
    )
    bank_transfer_details: Optional[BankAccountDetails] = Field(
        None, description="Bank details for transfers"
    )
    platform_fee_percentage: float = Field(
        ..., description="Platform fee percentage", json_schema_extra={"example": 5.0}
    )
    auto_calculate_payout: bool = Field(
        ..., description="Whether to auto-calculate payouts"
    )
    fraud_detection_enabled: bool = Field(
        True, description="Enable fraud detection for this seller"
    )
    rate_limiting_enabled: bool = Field(
        True, description="Enable rate limiting for this seller"
    )
    webhook_security_enabled: bool = Field(
        True, description="Enable webhook security for this seller"
    )


class TransactionFee(BaseModel):
    percentage: float = Field(..., description="Fee percentage", json_schema_extra={"example": 1.5})
    fixed_amount: Optional[Money] = Field(
        None, description="Fixed fee amount if applicable"
    )
    calculated_fee: Money = Field(...,
                                  description="Total calculated fee amount")


class PaymentInitializeRequest(BaseModel):
    order_id: str = Field(..., description="ID of the order being paid for")
    amount: Money = Field(..., description="Amount to be paid")
    customer_email: str = Field(..., description="Customer email")
    customer_name: str = Field(..., description="Customer name")
    customer_phone: Optional[str] = Field(
        None, description="Customer phone number")
    provider: PaymentProvider = Field(...,
                                      description="Payment provider to use")
    redirect_url: Optional[str] = Field(
        None, description="URL to redirect after payment"
    )
    metadata: Optional[Dict[str, Any]] = Field(
        {}, description="Additional metadata")


class PaymentInitializeResponse(BaseModel):
    checkout_url: Optional[str] = Field(
        None, description="URL for hosted checkout")
    reference: str = Field(..., description="Payment reference/transaction ID")
    access_code: Optional[str] = Field(
        None, description="Access code (Paystack specific)"
    )
    payment_link: Optional[str] = Field(
        None, description="Payment link to share")


class PaymentInitializeResponseWithWrapper(BaseModel):
    payment: PaymentInitializeResponse = Field(
        ..., description="Payment initialization data"
    )


class ManualPaymentProof(BaseModel):
    reference: str = Field(...,
                           description="Payment reference or transaction ID")
    transfer_date: str = Field(...,
                               description="Date of transfer (YYYY-MM-DD)")
    bank_name: Optional[str] = Field(
        None, description="Bank used for transfer")
    account_name: Optional[str] = Field(
        None, description="Account name used for transfer"
    )
    screenshot_url: Optional[str] = Field(
        None, description="URL to payment screenshot")
    notes: Optional[str] = Field(None, description="Additional notes")


class PaymentVerificationResponse(BaseModel):
    success: bool = Field(...,
                          description="Whether verification was successful")
    reference: str = Field(..., description="Payment reference/transaction ID")
    amount: Money = Field(..., description="Amount that was paid")
    provider: PaymentProvider = Field(..., description="Payment provider used")
    provider_reference: Optional[str] = Field(
        None, description="Provider's transaction reference"
    )
    transaction_date: str = Field(...,
                                  description="Transaction date (ISO format)")
    metadata: Optional[Dict[str, Any]] = Field(
        {}, description="Additional metadata")
    customer: Optional[Dict[str, str]] = Field(
        None, description="Customer information")
    payment_method: Optional[PaymentMethod] = Field(
        None, description="Payment method used"
    )
    fees: Optional[TransactionFee] = Field(
        None, description="Transaction fees")


class PaymentVerificationResponseWithWrapper(BaseModel):
    verification: PaymentVerificationResponse = Field(
        ..., description="Payment verification data"
    )


class PaymentWebhookEvent(BaseModel):
    provider: PaymentProvider = Field(
        ..., description="Payment provider that sent the event"
    )
    event_type: str = Field(..., description="Type of event")
    data: Dict[str, Any] = Field(..., description="Event data")
    signature: Optional[str] = Field(
        None, description="Event signature for validation")


class PaymentSettingsResponseWithWrapper(BaseModel):
    settings: PaymentSettings = Field(..., description="Payment settings data")
