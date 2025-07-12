import ipaddress
import re
from decimal import Decimal

from pydantic import root_validator, validator

from backend.app.schemas.payment.payment import (
    ManualPaymentProof,
    PaymentInitializeRequest,
    PaymentProviderConfig,
)

# Enhanced validation functions for payment schemas


# Currency code validation
def validate_currency_code(cls, v):
    """Validate that the currency code is an ISO 4217 three-letter code"""
    if not isinstance(v, str) or not re.match(r"^[A-Z]{3}$", v):
        raise ValueError(
            "Currency code must be a valid 3-letter ISO code (e.g., USD, NGN)"
        )
    return v


# Amount validation
def validate_amount(cls, v):
    """Validate that the amount is positive and has appropriate precision"""
    min_value = Decimal("0.01")
    max_value = Decimal("100000000")  # Set appropriate max value

    if not isinstance(v, (int, float, Decimal)):
        raise ValueError("Amount must be a number")

    amount = Decimal(str(v))

    if amount < min_value:
        raise ValueError(f"Amount must be at least {min_value}")

    if amount > max_value:
        raise ValueError(f"Amount exceeds maximum allowed value of {max_value}")

    # Limit to 2 decimal places
    if amount.as_tuple().exponent < -2:
        raise ValueError("Amount cannot have more than 2 decimal places")

    return float(amount)


# Email validation with additional checks
def validate_email(cls, v):
    """Validate email with additional security checks"""
    if not v:
        raise ValueError("Email is required")

    if len(v) > 255:
        raise ValueError("Email is too long")

    # Basic pattern check (Pydantic has its own validation too)
    if not re.match(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", v):
        raise ValueError("Invalid email format")

    # Check for common disposable email domains
    disposable_domains = {"mailinator.com", "guerrillamail.com", "tempmail.com"}
    domain = v.split("@")[-1].lower()
    if domain in disposable_domains:
        raise ValueError("Disposable email accounts are not allowed")

    return v


# Phone number validation
def validate_phone(cls, v):
    """Validate phone number format"""
    if not v:
        return v  # Allow None/empty

    # Remove all non-digit characters for standardization
    digits_only = re.sub(r"\D", "", v)

    # Check reasonable length
    if len(digits_only) < 7 or len(digits_only) > 15:
        raise ValueError("Phone number must have between 7 and 15 digits")

    # Format properly for storage
    return digits_only


# Reference validation
def validate_reference(cls, v):
    """Validate payment reference format"""
    if not v:
        raise ValueError("Reference is required")

    if len(v) > 100:
        raise ValueError("Reference is too long")

    # Allow only alphanumeric and some special characters
    if not re.match(r"^[a-zA-Z0-9_\-\.]{3,100}$", v):
        raise ValueError("Reference contains invalid characters")

    return v


# URL validation with security checks
def validate_url(cls, v):
    """Validate URL with security checks"""
    if not v:
        return v  # Allow None/empty

    if len(v) > 2083:  # Max URL length for most browsers
        raise ValueError("URL is too long")

    # Check URL format
    if not re.match(r"^https?://", v, re.IGNORECASE):
        raise ValueError("URL must start with http:// or https://")

    # Disallow non-HTTP protocols
    if re.match(r"^(javascript|data|file|vbscript):", v, re.IGNORECASE):
        raise ValueError("URL contains prohibited protocol")

    # Additional security checks could be added here

    return v


# Metadata validation
def validate_metadata(cls, v):
    """Validate metadata structure and content"""
    if not v:
        return {}  # Default to empty dict

    if not isinstance(v, dict):
        raise ValueError("Metadata must be an object")

    if len(v) > 20:  # Limit number of fields
        raise ValueError("Too many metadata fields")

    # Check each key/value
    for key, value in list(v.items()):
        # Validate keys
        if not isinstance(key, str):
            raise ValueError("Metadata keys must be strings")

        if len(key) > 40:
            raise ValueError("Metadata key too long")

        if not re.match(r"^[a-zA-Z0-9_\-\.]{1,40}$", key):
            raise ValueError(f"Invalid metadata key: {key}")

        # Clean values - no nested objects for simplicity
        if isinstance(value, (dict, list)):
            v[key] = str(value)

        # Limit value length
        if isinstance(value, str) and len(value) > 500:
            v[key] = value[:500]

    return v


# IP Address validation
def validate_ip_address(cls, v):
    """Validate IP address format"""
    if not v:
        return v  # Allow None/empty

    try:
        ipaddress.ip_address(v)
        return v
    except ValueError:
        raise ValueError("Invalid IP address format")


# Adds additional validation methods to payment request schema
class EnhancedPaymentInitializeRequest(PaymentInitializeRequest):
    """Enhanced payment initialization request with additional validation"""

    # Validate the amount
    @validator("amount")
    def validate_payment_amount(cls, v):
        if not v or not hasattr(v, "value"):
            raise ValueError("Payment amount is required")

        validate_amount(cls, v.value)
        validate_currency_code(cls, v.currency)
        return v

    # Validate customer email
    @validator("customer_email")
    def validate_customer_email(cls, v):
        return validate_email(cls, v)

    # Validate customer phone
    @validator("customer_phone")
    def validate_customer_phone(cls, v):
        return validate_phone(cls, v)

    # Validate redirect URL
    @validator("redirect_url")
    def validate_redirect_url(cls, v):
        return validate_url(cls, v)

    # Validate metadata
    @validator("metadata")
    def validate_payment_metadata(cls, v):
        return validate_metadata(cls, v)

    # Additional cross-field validation
    @root_validator
    def validate_payment_request(cls, values):
        # Check that order_id is consistent with metadata if present
        order_id = values.get("order_id")
        metadata = values.get("metadata", {})

        if order_id and metadata and "order_id" in metadata:
            if metadata["order_id"] != order_id:
                raise ValueError("Inconsistent order ID in metadata")

        return values


# Enhanced validation for manual payment proof
class EnhancedManualPaymentProof(ManualPaymentProof):
    """Enhanced manual payment proof with additional validation"""

    # Validate reference
    @validator("reference")
    def validate_payment_reference(cls, v):
        return validate_reference(cls, v)

    # Validate transfer date
    @validator("transfer_date")
    def validate_transfer_date(cls, v):
        # Check if date format is valid (YYYY-MM-DD)
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", v):
            raise ValueError("Invalid date format. Use YYYY-MM-DD")

        # Could add additional checks for reasonableness of date here

        return v

    # Validate screenshot URL
    @validator("screenshot_url")
    def validate_screenshot_url(cls, v):
        return validate_url(cls, v)

    # Validate notes - prevent XSS and other injection attacks
    @validator("notes")
    def validate_notes(cls, v):
        if not v:
            return v

        if len(v) > 1000:
            raise ValueError("Notes are too long")

        # Strip potentially dangerous HTML/script content
        v = re.sub(r"<[^>]*?>", "", v)

        return v


# Enhanced validation for provider configuration
class EnhancedPaymentProviderConfig(PaymentProviderConfig):
    """Enhanced provider configuration with additional validation"""

    # Validate API keys to ensure they meet minimum complexity requirements
    @validator("credentials")
    def validate_credentials(cls, v):
        if not v:
            raise ValueError("Provider credentials are required")

        # Check public key
        if not v.public_key or len(v.public_key) < 10:
            raise ValueError("Public key must be at least 10 characters")

        # Check secret key if provided (might be masked with asterisks)
        if v.secret_key and not v.secret_key.startswith("*"):
            if len(v.secret_key) < 20:
                raise ValueError("Secret key must be at least 20 characters")

        # Check encryption key if provided
        if v.encryption_key and not v.encryption_key.startswith("*"):
            if len(v.encryption_key) < 16:
                raise ValueError("Encryption key must be at least 16 characters")

        return v
