"""
Tenant resolver API routes.

This module provides API endpoints for resolving tenants from domains and subdomains.
"""

from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.app.db.session import get_db
from app.app.services.tenant.service import TenantService
from app.app.core.config.settings import Settings, get_settings


router = APIRouter(prefix="/api/tenant", tags=["tenant-resolver"])


@router.get("/resolve", response_model=Dict[str, Any])
async def resolve_tenant(
    hostname: str = Query(..., description="The hostname to resolve (subdomain.yourplatform.com or custom domain)"),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings)
):
    """
    Resolve a tenant from a hostname (either subdomain or custom domain).
    
    This endpoint is used by the frontend middleware to determine which tenant
    context to use based on the current domain.
    """
    tenant_service = TenantService()
    
    # Get base domain from settings
    base_domain = settings.BASE_DOMAIN
    
    # Resolve tenant
    tenant = await tenant_service.resolve_tenant_by_hostname(
        db=db,
        hostname=hostname,
        base_domain=base_domain
    )
    
    # Return 404 if tenant not found
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No tenant found for hostname: {hostname}"
        )
    
    # Check if tenant is active
    if not tenant.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This tenant has been deactivated"
        )
    
    # Return tenant data
    return {
        "id": str(tenant.id),
        "name": tenant.name,
        "subdomain": tenant.subdomain,
        "custom_domain": tenant.custom_domain,
        "display_name": tenant.display_name or tenant.name,
        "branding": {
            "logo_url": tenant.logo_url,
            "primary_color": tenant.primary_color,
            "secondary_color": tenant.secondary_color,
        }
    }


@router.get("/subdomain/{subdomain}", response_model=Dict[str, Any])
async def check_subdomain_availability(
    subdomain: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Check if a subdomain is available for registration.
    
    This endpoint can be used during the signup process to validate
    subdomain availability in real-time.
    """
    tenant_service = TenantService()
    
    # Normalize subdomain
    normalized_subdomain = subdomain.lower().strip()
    
    # Check if subdomain meets requirements (alphanumeric with hyphens, no spaces)
    import re
    if not re.match(r'^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$', normalized_subdomain):
        return {
            "available": False,
            "reason": "Subdomain must be alphanumeric with optional hyphens (no spaces), starting and ending with alphanumeric characters"
        }
    
    # Check if subdomain is reserved
    reserved_subdomains = ["www", "admin", "api", "app", "dashboard", "mail", "smtp", 
                          "webmail", "support", "help", "billing", "payment", "store"]
    if normalized_subdomain in reserved_subdomains:
        return {
            "available": False,
            "reason": "This subdomain is reserved"
        }
    
    # Check if subdomain exists
    existing = await tenant_service.get_tenant_by_subdomain(
        db=db, 
        subdomain=normalized_subdomain
    )
    
    return {
        "available": existing is None,
        "reason": "This subdomain is already taken" if existing else None
    }
