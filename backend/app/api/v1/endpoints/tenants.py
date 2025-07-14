"""
Tenant API endpoints with subdomain management.

Provides tenant CRUD operations and subdomain availability checking
with Shopify-style auto-incrementing suffixes.
"""

from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.app.api.deps import get_db, get_current_tenant_id
from app.app.models.tenant import Tenant
from app.app.schemas.tenant import TenantOut, TenantCreate, TenantUpdate
from app.app.services.tenant.service import TenantService
from app.app.services.tenant.subdomain_service import SubdomainService

router = APIRouter()


@router.get("/check-subdomain", response_model=Dict[str, Any])
async def check_subdomain_availability(
    subdomain: str = Query(..., description="Subdomain to check"),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Check if a subdomain is available for tenant registration.

    Returns availability status and suggested alternatives if taken.
    Follows Shopify-style subdomain assignment logic.
    """
    subdomain_service = SubdomainService()

    try:
        # Check availability
        is_available, suggested_subdomain, reason = await subdomain_service.check_subdomain_availability(
            db, subdomain
        )

        return {
            "subdomain": subdomain,
            "available": is_available,
            "suggested_subdomain": suggested_subdomain,
            "reason": reason,
            "full_url": f"{suggested_subdomain}.enwhe.io" if suggested_subdomain else None
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error checking subdomain availability: {str(e)}"
        )


@router.post("/", response_model=TenantOut)
async def create_tenant(
    tenant_data: TenantCreate,
    db: AsyncSession = Depends(get_db)
) -> TenantOut:
    """
    Create a new tenant with automatic subdomain assignment.

    Uses Shopify-style subdomain logic with auto-incrementing suffixes
    for duplicate names.
    """
    tenant_service = TenantService()
    subdomain_service = SubdomainService()

    try:
        # Assign subdomain with automatic handling of duplicates
        assigned_subdomain = await subdomain_service.assign_subdomain(
            db, tenant_data.subdomain
        )

        # Create tenant with assigned subdomain
        tenant = await tenant_service.create_tenant(
            db=db,
            name=tenant_data.businessName,
            subdomain=assigned_subdomain,
            phone_number=tenant_data.phoneNumber,
            whatsapp_number=tenant_data.whatsappNumber or tenant_data.phoneNumber,
            email=tenant_data.storeEmail,
            is_active=True
        )

        return TenantOut.model_validate(tenant)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating tenant: {str(e)}"
        )


@router.get("/me", response_model=TenantOut)
async def get_my_tenant(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
) -> TenantOut:
    """
    Get the current tenant information.
    """
    tenant_query = select(Tenant).where(Tenant.id == tenant_id)
    tenant_result = await db.execute(tenant_query)
    tenant = tenant_result.scalar_one_or_none()

    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )

    return TenantOut.model_validate(tenant)


@router.put("/me", response_model=TenantOut)
async def update_my_tenant(
    tenant_update: TenantUpdate,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_current_tenant_id),
) -> TenantOut:
    """
    Update the current tenant information.
    """
    tenant_service = TenantService()
    subdomain_service = SubdomainService()

    try:
        # If subdomain is being updated, validate it
        if tenant_update.subdomain:
            # Check if subdomain is available (excluding current tenant)
            is_available, suggested, reason = await subdomain_service.check_subdomain_availability(
                db, tenant_update.subdomain
            )

            if not is_available:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Subdomain is not available: {reason}"
                )

        # Update tenant
        tenant = await tenant_service.update_tenant(
            db=db,
            tenant_id=tenant_id,
            **tenant_update.model_dump(exclude_unset=True)
        )

        return TenantOut.model_validate(tenant)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating tenant: {str(e)}"
        )


@router.get("/subdomain/{subdomain}", response_model=Dict[str, Any])
async def get_tenant_by_subdomain(
    subdomain: str,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get tenant information by subdomain.

    Used for storefront routing and tenant resolution.
    """
    subdomain_service = SubdomainService()

    try:
        tenant = await subdomain_service.get_tenant_by_subdomain(db, subdomain)

        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )

        return {
            "id": str(tenant.id),
            "name": tenant.name,
            "subdomain": tenant.subdomain,
            "display_name": tenant.display_name or tenant.name,
            "is_active": tenant.is_active,
            "store_url": f"{tenant.subdomain}.enwhe.io",
            "admin_url": f"admin.enwhe.io/store/{tenant.subdomain}/"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching tenant: {str(e)}"
        )
