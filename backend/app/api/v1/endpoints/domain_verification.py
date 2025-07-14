"""Domain verification API endpoints."""
from typing import Dict, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator

from app.app.api.deps import get_current_tenant, get_db
from app.app.models.tenant import Tenant
from app.app.services.domain_verification_service import (
    initiate_domain_verification, 
    verify_domain_txt_record,
    get_verification_instructions
)

router = APIRouter()


class DomainVerificationRequest(BaseModel):
    """Request body for initiating domain verification."""
    custom_domain: str

    @field_validator('custom_domain')
    @classmethod
    def validate_domain(cls, v: str) -> str:
        """Validate domain format."""
        if not v or len(v) < 3 or '.' not in v:
            raise ValueError("Invalid domain format")
        return v.lower()


@router.post("/verify/initiate", response_model=Dict[str, Any])
async def initiate_verification(
    request: DomainVerificationRequest,
    tenant: Tenant = Depends(get_current_tenant),
) -> Dict[str, Any]:
    """
    Initiate domain verification process.
    
    Generates a verification token and returns instructions for the merchant.
    """
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
        
    return await initiate_domain_verification(str(tenant.id), request.custom_domain)


@router.get("/verify/check", response_model=Dict[str, Any])
async def check_verification(
    tenant: Tenant = Depends(get_current_tenant),
) -> Dict[str, Any]:
    """
    Check domain verification status.
    
    Verifies if the DNS TXT record exists with the correct verification token.
    """
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
        
    return await verify_domain_txt_record(str(tenant.id))


@router.get("/verify/status", response_model=Dict[str, Any])
async def verification_status(
    tenant: Tenant = Depends(get_current_tenant),
) -> Dict[str, Any]:
    """
    Get domain verification status and instructions.
    """
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # If domain is already verified
    if tenant.domain_verified:
        return {
            "domain": tenant.custom_domain,
            "subdomain": tenant.subdomain,
            "platform_domain": f"{tenant.subdomain}.convocommerce.com",
            "status": "verified",
            "verification_date": tenant.domain_verification_attempts[-1].get("verified_at") if tenant.domain_verification_attempts else None
        }
    
    # If verification is in progress
    instructions = get_verification_instructions(tenant)
    if instructions:
        return instructions
    
    # No verification in progress
    return {
        "status": "not_initiated",
        "subdomain": tenant.subdomain,
        "platform_domain": f"{tenant.subdomain}.convocommerce.com",
        "message": "Domain verification has not been initiated"
    }
