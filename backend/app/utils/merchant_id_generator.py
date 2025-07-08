"""
Merchant ID Generator Utility

This module provides utilities for generating merchant IDs, subdomains, and URLs
in a consistent and scalable manner.
"""

import uuid
import re
from typing import Tuple, Optional
from urllib.parse import quote


def generate_merchant_uuid() -> uuid.UUID:
    """
    Generate a new UUID for a merchant.

    Returns:
        A new UUID instance
    """
    return uuid.uuid4()


def generate_merchant_subdomain(merchant_uuid: uuid.UUID) -> str:
    """
    Generate a subdomain from a merchant UUID.

    Args:
        merchant_uuid: The merchant's UUID

    Returns:
        A 6-character subdomain string
    """
    return str(merchant_uuid)[:6]


def generate_merchant_url(subdomain: str, base_domain: str = "enwhe.io") -> str:
    """
    Generate a merchant's storefront URL.

    Args:
        subdomain: The merchant's subdomain
        base_domain: The base domain (default: enwhe.io)

    Returns:
        The complete storefront URL
    """
    return f"https://{subdomain}.{base_domain}"


def generate_whatsapp_url(phone_number: str, message: str = "") -> str:
    """
    Generate a WhatsApp deep link URL.

    Args:
        phone_number: The WhatsApp phone number (with country code)
        message: Optional pre-filled message

    Returns:
        WhatsApp deep link URL
    """
    # Remove any non-digit characters except +
    clean_phone = re.sub(r'[^\d+]', '', phone_number)

    # URL encode the message
    encoded_message = quote(message) if message else ""

    return f"https://wa.me/{clean_phone}?text={encoded_message}"


def generate_merchant_id_complete(merchant_name: str, phone_number: str) -> dict:
    """
    Generate a complete merchant ID package including UUID, subdomain, and URLs.

    Args:
        merchant_name: The merchant's business name
        phone_number: The merchant's phone number

    Returns:
        Dictionary containing all merchant ID information
    """
    # Generate UUID
    merchant_uuid = generate_merchant_uuid()

    # Generate subdomain
    subdomain = generate_merchant_subdomain(merchant_uuid)

    # Generate URLs
    storefront_url = generate_merchant_url(subdomain)
    whatsapp_url = generate_whatsapp_url(phone_number, f"Hi, I want to buy from {merchant_name}")

    return {
        "merchant_uuid": str(merchant_uuid),
        "subdomain": subdomain,
        "storefront_url": storefront_url,
        "whatsapp_number": phone_number,
        "whatsapp_url": whatsapp_url,
        "merchant_name": merchant_name
    }


def validate_merchant_subdomain(subdomain: str) -> Tuple[bool, Optional[str]]:
    """
    Validate a merchant subdomain.

    Args:
        subdomain: The subdomain to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    # Check length
    if len(subdomain) != 6:
        return False, "Subdomain must be exactly 6 characters"

    # Check if alphanumeric
    if not re.match(r'^[a-f0-9]{6}$', subdomain.lower()):
        return False, "Subdomain must contain only hexadecimal characters (a-f, 0-9)"

    return True, None


def generate_qr_code_url(merchant_url: str) -> str:
    """
    Generate a QR code URL for a merchant's storefront.

    Args:
        merchant_url: The merchant's storefront URL

    Returns:
        QR code URL (using a QR code service)
    """
    # Using Google Charts API for QR code generation
    encoded_url = quote(merchant_url)
    return f"https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl={encoded_url}"


# Example usage
if __name__ == "__main__":
    # Example merchant creation
    merchant_data = generate_merchant_id_complete(
        merchant_name="ABC Electronics",
        phone_number="+254700123456"
    )

    print("Merchant ID Package:")
    print(f"UUID: {merchant_data['merchant_uuid']}")
    print(f"Subdomain: {merchant_data['subdomain']}")
    print(f"Storefront URL: {merchant_data['storefront_url']}")
    print(f"WhatsApp URL: {merchant_data['whatsapp_url']}")
    print(f"QR Code URL: {generate_qr_code_url(merchant_data['storefront_url'])}")