import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_tenant_id, get_db
from backend.app.schemas.storefront import (
    DomainVerificationResponse,
    DomainVerificationStatusResponse,
    StorefrontConfigCreate,
    StorefrontConfigResponse,
    StorefrontConfigUpdate,
    StorefrontStatusUpdate,
    ThemeVariationsResponse,
)
from backend.app.services import storefront_service

router = APIRouter()


@router.post("/", response_model=StorefrontConfigResponse)
async def create_storefront_config(
    data: StorefrontConfigCreate,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """
    Create a new storefront configuration for a tenant.
    """
    return await storefront_service.create_storefront_config(
        db=db,
        tenant_id=tenant_id,
        subdomain=data.subdomain_name,
        custom_domain=data.custom_domain,
        meta_title=data.meta_title,
        meta_description=data.meta_description,
        theme_settings=data.theme_settings,
        layout_config=data.layout_config,
        social_links=data.social_links,
    )


@router.get("/", response_model=StorefrontConfigResponse)
async def get_storefront_config(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id), db: Session = Depends(get_db)
):
    """
    Get the storefront configuration for the current tenant.
    """
    config = await storefront_service.get_storefront_config(db, tenant_id)
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Storefront configuration not found",
        )
    return config


@router.put("/", response_model=StorefrontConfigResponse)
async def update_storefront_config(
    data: StorefrontConfigUpdate,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """
    Update the storefront configuration for the current tenant.
    """
    return await storefront_service.update_storefront_config(
        db=db,
        tenant_id=tenant_id,
        subdomain=data.subdomain_name,
        custom_domain=data.custom_domain,
        meta_title=data.meta_title,
        meta_description=data.meta_description,
        theme_settings=data.theme_settings,
        layout_config=data.layout_config,
        social_links=data.social_links,
    )


@router.post("/domain/verify", response_model=DomainVerificationResponse)
async def request_domain_verification(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id), db: Session = Depends(get_db)
):
    """
    Get domain verification instructions for the current tenant.
    """
    token, instructions = await storefront_service.verify_custom_domain(db, tenant_id)
    return {"token": token, "instructions": instructions}


@router.get("/domain/verify/status", response_model=DomainVerificationStatusResponse)
async def check_domain_verification_status(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id), db: Session = Depends(get_db)
):
    """
    Check the verification status of the custom domain for the current tenant.
    """
    config = await storefront_service.get_storefront_config(db, tenant_id)
    if not config or not config.custom_domain:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No custom domain configured",
        )

    is_verified = await storefront_service.check_domain_verification(db, tenant_id)
    return {"is_verified": is_verified, "domain": config.custom_domain}


@router.put("/status", response_model=dict)
async def update_storefront_status(
    data: StorefrontStatusUpdate,
    tenant_id: uuid.UUID = Depends(get_current_tenant_id),
    db: Session = Depends(get_db),
):
    """
    Enable or disable the storefront for the current tenant.
    """
    if data.enabled:
        tenant = await storefront_service.enable_storefront(db, tenant_id)
    else:
        tenant = await storefront_service.disable_storefront(db, tenant_id)

    return {"status": "success", "storefront_enabled": tenant.storefront_enabled}


@router.get("/themes", response_model=ThemeVariationsResponse)
async def get_available_themes(
    tenant_id: uuid.UUID = Depends(get_current_tenant_id), db: Session = Depends(get_db)
):
    """
    Get available theme variations for the tenant.
    """
    themes = await storefront_service.get_available_themes(db, tenant_id)
    return {"themes": themes}
