import logging
import re
from typing import Optional, Tuple

import dns.resolver

logger = logging.getLogger(__name__)

# Reserved subdomains that should not be used by tenants
RESERVED_SUBDOMAINS = [
    "www",
    "api",
    "admin",
    "app",
    "auth",
    "billing",
    "blog",
    "dashboard",
    "docs",
    "help",
    "mail",
    "support",
    "store",
    "static",
    "media",
    "assets",
    "images",
    "files",
    "cdn",
    "internal",
    "system",
    "dev",
    "stage",
    "test",
    "production",
    "analytics",
    "metrics",
    "status",
    "health",
    "monitor",
]

# Valid subdomain regex pattern
# Allows alphanumeric characters and hyphens (not at start/end)
SUBDOMAIN_PATTERN = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$")

# Valid domain regex pattern
DOMAIN_PATTERN = re.compile(
    r"^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$"
)


def validate_subdomain(subdomain: str) -> Tuple[bool, Optional[str]]:
    """
    Validate a subdomain name based on DNS rules and reserved names.

    Args:
        subdomain: The subdomain name to validate

    Returns:
        Tuple containing (is_valid, error_message)
    """
    # Check length
    if not subdomain or len(subdomain) > 63:
        return False, "Subdomain must be between 1 and 63 characters"

    # Check if reserved
    if subdomain.lower() in RESERVED_SUBDOMAINS:
        return False, f"Subdomain '{subdomain}' is reserved and cannot be used"

    # Check pattern
    if not SUBDOMAIN_PATTERN.match(subdomain.lower()):
        return (
            False,
            "Subdomain can only contain lowercase letters, numbers, and hyphens (not at start/end)",
        )

    return True, None


def validate_domain(domain: str) -> Tuple[bool, Optional[str]]:
    """
    Validate a custom domain name based on DNS rules.

    Args:
        domain: The domain name to validate

    Returns:
        Tuple containing (is_valid, error_message)
    """
    # Check length
    if not domain or len(domain) > 253:
        return False, "Domain must be between 1 and 253 characters"

    # Check pattern
    if not DOMAIN_PATTERN.match(domain.lower()):
        return False, "Invalid domain format"

    return True, None


def verify_domain_dns(
    domain: str, verification_token: str
) -> Tuple[bool, Optional[str]]:
    """
    Verify that a domain has proper DNS configuration by checking for a TXT record.

    Args:
        domain: The domain to verify
        verification_token: The token that should be in the DNS record

    Returns:
        Tuple containing (is_verified, error_message)
    """
    try:
        # Look for TXT records
        answers = dns.resolver.resolve(f"_storefront-verification.{domain}", "TXT")

        # Check if our verification token is in any of the records
        for record in answers:
            txt_data = record.to_text().strip('"')
            if txt_data == verification_token:
                return True, None

        return False, "Verification token not found in DNS records"
    except dns.resolver.NXDOMAIN:
        return False, "Verification TXT record not found"
    except dns.resolver.NoAnswer:
        return False, "No TXT records found"
    except Exception as e:
        logger.error(f"Error verifying domain DNS: {str(e)}")
        return False, f"DNS verification error: {str(e)}"


def generate_verification_token(tenant_id: str, domain: str) -> str:
    """
    Generate a unique verification token for domain verification.

    Args:
        tenant_id: The tenant ID
        domain: The domain being verified

    Returns:
        A verification token string
    """
    import hashlib
    import time

    # Create a unique token based on tenant ID, domain and timestamp
    # Use the day to ensure token remains the same throughout the day
    data = f"{tenant_id}:{domain}:{int(time.time() // 86400)}"
    return f"storefront-verify-{hashlib.sha256(data.encode()).hexdigest()[:16]}"
