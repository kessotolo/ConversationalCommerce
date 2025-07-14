from sqlalchemy.orm import Session
from typing import List, Dict, Any
from fastapi import HTTPException, status
from app.app.models.storefront_banner import StorefrontBanner
from app.app.models.tenant import Tenant
from app.app.models.user import User
from app.app.services.storefront.permissions.storefront_permissions_service import StorefrontPermissionsService


async def reorder_banners(db: Session, tenant_id, user_id, banner_order: List[Dict[str, Any]]):
    # Check if tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found"
        )

    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Check permission
    has_perm = await StorefrontPermissionsService.has_permission(
        db=db,
        tenant_id=tenant_id,
        user_id=user_id,
        required_permission="edit",
        section=None,
    )
    if not has_perm:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to reorder banners",
        )

    # Update display_order for each banner
    for idx, item in enumerate(banner_order):
        banner_id = item.get("id")
        banner = (
            db.query(StorefrontBanner)
            .filter(
                StorefrontBanner.id == banner_id,
                StorefrontBanner.tenant_id == tenant_id,
            )
            .first()
        )
        if banner:
            # Leave gaps for easier reordering
            banner.display_order = (idx + 1) * 10
    db.commit()

    # Return updated banners
    banners = db.query(StorefrontBanner).filter(
        StorefrontBanner.tenant_id == tenant_id).order_by(StorefrontBanner.display_order).all()
    return banners
