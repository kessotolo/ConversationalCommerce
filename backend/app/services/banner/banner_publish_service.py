from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from datetime import datetime, timezone
from app.models.storefront_banner import StorefrontBanner, BannerStatus
from app.models.tenant import Tenant
from app.models.user import User
from app.services.storefront.permissions.storefront_permissions_service import StorefrontPermissionsService


async def publish_banner(db: Session, tenant_id, banner_id, user_id):
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

    # Get the banner
    banner = (
        db.query(StorefrontBanner)
        .filter(
            StorefrontBanner.id == banner_id, StorefrontBanner.tenant_id == tenant_id
        )
        .first()
    )
    if not banner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Banner not found"
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
            detail="You don't have permission to publish this banner",
        )

    # Set status to published and update timestamps
    banner.status = BannerStatus.PUBLISHED
    banner.published_at = datetime.now(timezone.utc)
    banner.published_by = user_id
    db.commit()
    db.refresh(banner)
    return banner
