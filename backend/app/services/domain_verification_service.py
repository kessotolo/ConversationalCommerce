"""
Domain verification service for the ConversationalCommerce platform.

This service handles domain verification token generation and verification of DNS records
for merchants connecting custom domains to their storefronts.
"""

import secrets
import string
import logging
from datetime import datetime
from typing import Dict, Any, Optional
import dns.resolver
from fastapi import HTTPException

from app.app.api.deps import get_db
from app.app.models.tenant import Tenant

logger = logging.getLogger(__name__)

# Constants
VERIFICATION_TOKEN_LENGTH = 24
DNS_TXT_RECORD_PREFIX = "convocommerce-verify="
DNS_VERIFICATION_TIMEOUT_HOURS = 48


def generate_verification_token() -> str:
    """Generate a random verification token for domain verification."""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(VERIFICATION_TOKEN_LENGTH))


async def initiate_domain_verification(tenant_id: str, custom_domain: str) -> Dict[str, Any]:
    """
    Initiate domain verification process for a tenant.

    Args:
        tenant_id: UUID of the tenant
        custom_domain: Custom domain to verify

    Returns:
        Dictionary with verification instructions
    """
    async with get_db() as session:
        tenant = await session.get(Tenant, tenant_id)
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")

        # Generate a new verification token
        token = generate_verification_token()
        tenant.domain_verification_token = token

        # Store custom domain if provided
        if custom_domain:
            tenant.custom_domain = custom_domain

        # Track verification attempt
        verification_attempt = {
            "timestamp": datetime.utcnow().isoformat(),
            "token": token,
            "domain": custom_domain,
            "status": "initiated"
        }

        if not tenant.domain_verification_attempts:
            tenant.domain_verification_attempts = [verification_attempt]
        else:
            tenant.domain_verification_attempts.append(verification_attempt)

        await session.commit()

        # Prepare verification instructions
        txt_record = f"{DNS_TXT_RECORD_PREFIX}{token}"
        instructions = {
            "verification_token": token,
            "txt_record": txt_record,
            "domain": custom_domain,
            "subdomain": tenant.subdomain,
            "platform_domain": f"{tenant.subdomain}.convocommerce.com",
            "instructions": {
                "txt_verification": f"Add a TXT record to {custom_domain} with value: {txt_record}",
                "cname_setup": f"Add a CNAME record pointing from {custom_domain} to {tenant.subdomain}.convocommerce.com"
            },
            "timeout_hours": DNS_VERIFICATION_TIMEOUT_HOURS
        }

        return instructions


async def verify_domain_txt_record(tenant_id: str) -> Dict[str, Any]:
    """
    Check if the DNS TXT record for domain verification exists.

    Args:
        tenant_id: UUID of the tenant

    Returns:
        Dictionary with verification status
    """
    async with get_db() as session:
        tenant = await session.get(Tenant, tenant_id)
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")

        if not tenant.custom_domain:
            raise HTTPException(
                status_code=400, detail="No custom domain to verify")

        if not tenant.domain_verification_token:
            raise HTTPException(
                status_code=400, detail="No verification token found")

        # Check DNS records
        domain = tenant.custom_domain
        token = tenant.domain_verification_token
        expected_txt = f"{DNS_TXT_RECORD_PREFIX}{token}"

        verification_status = {
            "timestamp": datetime.utcnow().isoformat(),
            "domain": domain,
            "token": token,
            "verified": False,
            "message": "Verification failed"
        }

        try:
            answers = dns.resolver.resolve(domain, 'TXT')

            for rdata in answers:
                for txt_string in rdata.strings:
                    txt_record = txt_string.decode('utf-8')
                    if txt_record == expected_txt:
                        # Update tenant verification status
                        tenant.domain_verified = True

                        # Update verification attempt
                        if tenant.domain_verification_attempts:
                            tenant.domain_verification_attempts[-1]["status"] = "verified"
                            tenant.domain_verification_attempts[-1]["verified_at"] = datetime.utcnow(
                            ).isoformat()

                        await session.commit()

                        verification_status["verified"] = True
                        verification_status["message"] = "Domain successfully verified"
                        return verification_status

            # If we got here, we didn't find the expected TXT record
            if tenant.domain_verification_attempts:
                tenant.domain_verification_attempts[-1]["status"] = "failed"
                tenant.domain_verification_attempts[-1]["checked_at"] = datetime.utcnow(
                ).isoformat()

            await session.commit()
            verification_status[
                "message"] = f"TXT record not found or doesn't match expected value: {expected_txt}"

        except dns.resolver.NXDOMAIN:
            verification_status["message"] = f"Domain {domain} does not exist"
        except dns.resolver.NoAnswer:
            verification_status["message"] = f"No TXT records found for {domain}"
        except dns.resolver.Timeout:
            verification_status["message"] = f"DNS lookup timed out for {domain}"
        except Exception as e:
            verification_status["message"] = f"Error checking DNS: {str(e)}"
            logger.error(f"Domain verification error: {str(e)}")

        return verification_status


def get_verification_instructions(tenant: Tenant) -> Optional[Dict[str, Any]]:
    """
    Get domain verification instructions for a tenant with existing verification token.

    Args:
        tenant: Tenant object

    Returns:
        Dictionary with verification instructions or None if no verification in progress
    """
    if not tenant.domain_verification_token or not tenant.custom_domain:
        return None

    txt_record = f"{DNS_TXT_RECORD_PREFIX}{tenant.domain_verification_token}"

    return {
        "verification_token": tenant.domain_verification_token,
        "txt_record": txt_record,
        "domain": tenant.custom_domain,
        "subdomain": tenant.subdomain,
        "platform_domain": f"{tenant.subdomain}.convocommerce.com",
        "instructions": {
            "txt_verification": f"Add a TXT record to {tenant.custom_domain} with value: {txt_record}",
            "cname_setup": f"Add a CNAME record pointing from {tenant.custom_domain} to {tenant.subdomain}.convocommerce.com"
        },
        "verification_status": "pending" if not tenant.domain_verified else "verified",
        "timeout_hours": DNS_VERIFICATION_TIMEOUT_HOURS
    }
