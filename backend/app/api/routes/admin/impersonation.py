"""
Admin impersonation API routes.

This module provides API endpoints for super admin impersonation of tenant owners.
"""

from typing import Dict, Any
from datetime import timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.session import get_db
from backend.app.models.admin.admin_user import AdminUser
from backend.app.services.admin.impersonation.service import ImpersonationService
from backend.app.services.tenant.service import TenantService
from backend.app.services.admin.auth.dependencies import get_current_super_admin
from backend.app.core.config.settings import Settings, get_settings


router = APIRouter(prefix="/admin/impersonation", tags=["admin-impersonation"])


@router.post("/token/{tenant_id}", response_model=Dict[str, Any])
async def create_impersonation_token(
    tenant_id: UUID,
    admin_user: AdminUser = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings)
):
    """
    Create an impersonation token for a super admin to impersonate a tenant owner.
    
    This endpoint is only accessible to super admins and creates a short-lived
    token that can be used to log in as the tenant owner.
    """
    # Create impersonation service
    impersonation_service = ImpersonationService(settings)
    
    # Create token
    token = await impersonation_service.create_impersonation_token(
        db=db,
        admin_user_id=admin_user.user_id,
        tenant_id=tenant_id,
        expires_delta=timedelta(minutes=30)  # Short-lived token
    )
    
    # Get tenant information
    tenant_service = TenantService()
    tenant = await tenant_service.get_tenant_by_id(db, tenant_id=tenant_id)
    
    # Return token and tenant information
    return {
        "token": token,
        "expires_in": 1800,  # 30 minutes in seconds
        "tenant": {
            "id": str(tenant.id),
            "name": tenant.name,
            "subdomain": tenant.subdomain,
            "custom_domain": tenant.custom_domain,
            "impersonation_url": _get_impersonation_url(tenant, settings, token)
        }
    }


@router.post("/verify", response_model=Dict[str, Any])
async def verify_impersonation_token(
    token_data: Dict[str, str] = Body(...),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings)
):
    """
    Verify an impersonation token.
    
    This endpoint is used by the tenant frontend to verify impersonation tokens
    and establish the super admin's session as the tenant owner.
    """
    # Get token from request
    token = token_data.get("token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Impersonation token is required"
        )
    
    # Create impersonation service
    impersonation_service = ImpersonationService(settings)
    
    # Verify token
    try:
        payload = await impersonation_service.verify_impersonation_token(db=db, token=token)
        
        # Get tenant information
        tenant_service = TenantService()
        tenant = await tenant_service.get_tenant_by_id(
            db, tenant_id=UUID(payload["imp_tenant"])
        )
        
        # Return success with tenant and admin information
        return {
            "valid": True,
            "tenant_id": payload["imp_tenant"],
            "admin_user_id": payload["sub"],
            "expires_at": payload["exp"],
            "tenant": {
                "id": str(tenant.id),
                "name": tenant.name,
                "subdomain": tenant.subdomain
            }
        }
    except Exception as e:
        # Return failure
        return {
            "valid": False,
            "error": str(e)
        }


@router.post("/end", response_model=Dict[str, Any])
async def end_impersonation(
    token_data: Dict[str, str] = Body(...),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings)
):
    """
    End an impersonation session.
    
    This endpoint is used to explicitly end an impersonation session
    and record this action for audit purposes.
    """
    # Get token from request
    token = token_data.get("token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Impersonation token is required"
        )
    
    # Create impersonation service
    impersonation_service = ImpersonationService(settings)
    
    # End impersonation session
    await impersonation_service.end_impersonation_session(db=db, token=token)
    
    # Return success
    return {"message": "Impersonation session ended successfully"}


def _get_impersonation_url(tenant, settings, token):
    """
    Generate the impersonation URL for a tenant.
    
    Args:
        tenant: The tenant to impersonate
        settings: Application settings
        token: Impersonation token
        
    Returns:
        Impersonation URL
    """
    # Determine the base URL for the tenant
    if tenant.custom_domain:
        base_url = f"https://{tenant.custom_domain}"
    else:
        base_domain = settings.BASE_DOMAIN
        base_url = f"https://{tenant.subdomain}.{base_domain}"
    
    # Append the impersonation path and token
    return f"{base_url}/api/auth/impersonate?token={token}"
