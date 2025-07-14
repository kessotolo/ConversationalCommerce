from app.app.core.logging import logger
import base64
import hashlib
import hmac
import os
from datetime import datetime
from typing import Any, Dict, Optional

import jwt
import requests
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from app.app.core.config.settings import get_settings
settings = get_settings()


# Environment variable or settings-based encryption key
# In production, use a proper key management system


def get_encryption_key() -> bytes:
    """Get the encryption key from settings"""
    key = getattr(settings, "PAYMENT_ENCRYPTION_KEY", None)
    if not key:
        raise ValueError("Payment encryption key is not set")

    # If key is a string, derive a proper key using PBKDF2
    if isinstance(key, str):
        salt = getattr(settings, "PAYMENT_ENCRYPTION_SALT",
                       "changeme").encode()
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        return base64.urlsafe_b64encode(kdf.derive(key.encode()))
    return key


# Encrypt sensitive data


def encrypt_sensitive_data(data: str) -> str:
    """Encrypt sensitive data using Fernet symmetric encryption"""
    if not data:
        return data

    try:
        key = get_encryption_key()
        f = Fernet(key)
        return f.encrypt(data.encode()).decode()
    except Exception as e:
        logger.error(f"Encryption error: {str(e)}")
        raise ValueError("Failed to encrypt sensitive data")


# Decrypt sensitive data


def decrypt_sensitive_data(encrypted_data: str) -> str:
    """Decrypt sensitive data using Fernet symmetric encryption"""
    if not encrypted_data:
        return encrypted_data

    try:
        key = get_encryption_key()
        f = Fernet(key)
        return f.decrypt(encrypted_data.encode()).decode()
    except Exception as e:
        logger.error(f"Decryption error: {str(e)}")
        raise ValueError("Failed to decrypt sensitive data")


# Verify Paystack webhook signature


def verify_paystack_signature(payload: bytes, signature: str) -> bool:
    """Verify Paystack webhook signature"""
    if not signature or not payload:
        return False

    try:
        secret = getattr(settings, "PAYSTACK_SECRET_KEY", None)
        if not secret:
            logger.error("PAYSTACK_SECRET_KEY is not set in settings")
            return False
        computed_hash = hmac.new(
            secret.encode("utf-8"), payload, digestmod=hashlib.sha512
        ).hexdigest()

        return hmac.compare_digest(computed_hash, signature)
    except Exception as e:
        logger.error(f"Paystack signature verification failed: {str(e)}")
        return False


# Verify Flutterwave webhook signature


def verify_flutterwave_signature(payload: bytes, signature: str) -> bool:
    """Verify Flutterwave webhook signature"""
    if not signature or not payload:
        return False

    try:
        secret = getattr(settings, "FLUTTERWAVE_SECRET_KEY", None)
        if not secret:
            logger.error("FLUTTERWAVE_SECRET_KEY is not set in settings")
            return False

        # Flutterwave verification varies by implementation
        # This is a simplified example - adapt to actual Flutterwave requirements
        data_to_verify = payload.decode("utf-8") + secret
        computed_hash = hashlib.sha256(data_to_verify.encode()).hexdigest()

        return hmac.compare_digest(computed_hash, signature)
    except Exception as e:
        logger.error(f"Flutterwave signature verification failed: {str(e)}")
        return False


# Generate idempotency key for preventing duplicate payments


def generate_idempotency_key(
    order_id: str, amount: float, timestamp: Optional[datetime] = None
) -> str:
    """Generate an idempotency key to prevent duplicate payment processing"""
    if timestamp is None:
        timestamp = datetime.utcnow()

    # Create a unique string based on order details
    unique_str = f"{order_id}:{amount}:{timestamp.isoformat()}"

    # Hash the string to create the key
    return hashlib.sha256(unique_str.encode()).hexdigest()


# Mask sensitive data for logging


def mask_sensitive_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """Mask sensitive payment data for logging purposes"""
    sensitive_fields = [
        "card_number",
        "cvv",
        "expiry",
        "password",
        "pin",
        "secret_key",
        "access_code",
        "authorization_code",
        "account_number",
    ]

    masked_data = data.copy()

    for field in sensitive_fields:
        if field in masked_data and masked_data[field]:
            if isinstance(masked_data[field], str):
                # Keep first 6 and last 4 for card numbers, mask the rest
                if field == "card_number" and len(masked_data[field]) > 10:
                    masked_data[field] = (
                        masked_data[field][:6]
                        + "*" * (len(masked_data[field]) - 10)
                        + masked_data[field][-4:]
                    )
                else:
                    # For other fields, just show first and last character
                    if len(masked_data[field]) > 2:
                        masked_data[field] = (
                            masked_data[field][0]
                            + "*" * (len(masked_data[field]) - 2)
                            + masked_data[field][-1]
                        )
                    else:
                        masked_data[field] = "*" * len(masked_data[field])

    return masked_data


# Validate payment amount to prevent tampering


def validate_payment_amount(
    expected: float, actual: float, tolerance: float = 0.01
) -> bool:
    """
    Validate that the payment amount matches the expected amount within a small tolerance
    to account for currency conversion or rounding issues
    """
    return abs(expected - actual) <= tolerance


# Secure random token generator for one-time verification links


def generate_secure_token(length: int = 32) -> str:
    """Generate a cryptographically secure random token"""
    return base64.urlsafe_b64encode(os.urandom(length)).decode("utf-8")


# --- Secure Payment Reference/Token Utilities ---


PAYMENT_REF_SECRET = getattr(settings, "PAYMENT_REF_SECRET", "changeme")

# Generate a signed payment reference (HMAC or JWT)


def generate_payment_reference(
    order_id: str, tenant_id: str, timestamp: Optional[int] = None
) -> str:
    if not timestamp:
        timestamp = int(datetime.utcnow().timestamp())
    payload = {"order_id": order_id, "tenant_id": tenant_id, "ts": timestamp}
    token = jwt.encode(payload, PAYMENT_REF_SECRET, algorithm="HS256")
    return token


# Verify a signed payment reference


def verify_payment_reference(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, PAYMENT_REF_SECRET, algorithms=["HS256"])
        return payload
    except Exception as e:
        logger.warning(f"Invalid payment reference: {e}")
        return None


# --- Enforce Minimum TLS Version for Outbound Requests ---


def get_tls12_session() -> requests.Session:
    """Return a requests session that enforces TLS 1.2+"""
    from requests.adapters import HTTPAdapter
    from urllib3.util.ssl_ import create_urllib3_context

    class TLS12Adapter(HTTPAdapter):
        def init_poolmanager(self, *args, **kwargs):
            ctx = create_urllib3_context()
            ctx.minimum_version = getattr(
                getattr(ctx, "TLSVersion", ctx), "TLSv1_2", None
            )
            kwargs["ssl_context"] = ctx
            return super().init_poolmanager(*args, **kwargs)

    session = requests.Session()
    session.mount("https://", TLS12Adapter())
    return session


# --- Payment Risk Scoring ---


def calculate_payment_risk(
    amount: float,
    user_id: Optional[str],
    ip_address: Optional[str],
    user_agent: Optional[str],
    recent_attempts: int = 0,
    country_mismatch: bool = False,
    ip_reputation_score: float = 0.0,
) -> float:
    """
    Calculate a risk score for a payment attempt (0-1, higher is riskier)
    """
    score = 0.0
    # High amount
    if amount > 1000:
        score += 0.2
    if amount > 5000:
        score += 0.2
    # Velocity
    if recent_attempts > 3:
        score += 0.2
    if recent_attempts > 10:
        score += 0.3
    # IP reputation
    if ip_reputation_score > 0.7:
        score += 0.2
    # Country mismatch
    if country_mismatch:
        score += 0.2
    # User agent anomaly (e.g., empty or known bad)
    if not user_agent or user_agent.lower() in [
        "curl",
        "python-requests",
        "httpclient",
    ]:
        score += 0.1
    return min(score, 1.0)
