import io
from typing import List, Optional

import qrcode
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.app.core.logging import logger

from backend.app.api import deps
from backend.app.core.security.clerk_multi_org import MultiOrgClerkTokenData as ClerkTokenData
from backend.app.models.product import Product
from backend.app.models.tenant import Tenant
from backend.app.services.share_service import share_service

router = APIRouter()


@router.get("/whatsapp-link")
def whatsapp_share_link(
    product_id: str,
    campaign: str = Query("product_share", description="UTM campaign name"),
    source: str = Query("whatsapp", description="UTM source"),
    medium: str = Query("share", description="UTM medium"),
    db: Session = Depends(deps.get_db),
    user: ClerkTokenData = Depends(deps.get_current_user),
):
    """
    Generate a WhatsApp share link for a product with UTM tracking.
    Only works for verified tenants.
    """
    try:
        result = share_service.generate_whatsapp_share_link(
            db=db,
            product_id=product_id,
            tenant_id=user.tenant_id,
            user_id=user.sub,
            campaign=campaign,
            source=source,
            medium=medium,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to generate share link: {str(e)}"
        )


@router.get("/instagram-share")
def instagram_share(
    product_id: str,
    campaign: str = Query("product_share", description="UTM campaign name"),
    source: str = Query("instagram", description="UTM source"),
    medium: str = Query("share", description="UTM medium"),
    db: Session = Depends(deps.get_db),
    user: ClerkTokenData = Depends(deps.get_current_user),
):
    """
    Generate Instagram sharing information for a product.
    Returns sharing instructions and links due to Instagram API limitations.
    Only works for verified tenants.
    """
    try:
        result = share_service.generate_instagram_share(
            db=db,
            product_id=product_id,
            tenant_id=user.tenant_id,
            user_id=user.sub,
            campaign=campaign,
            source=source,
            medium=medium,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to generate Instagram share info: {str(e)}"
        )


@router.get("/facebook-link")
def facebook_share_link(
    product_id: str,
    campaign: str = Query("product_share", description="UTM campaign name"),
    source: str = Query("facebook", description="UTM source"),
    medium: str = Query("share", description="UTM medium"),
    hashtag: Optional[str] = Query(
        None, description="Optional hashtag for the Facebook share"
    ),
    db: Session = Depends(deps.get_db),
    user: ClerkTokenData = Depends(deps.get_current_user),
):
    """
    Generate a Facebook share link for a product with UTM tracking.
    Only works for verified tenants.
    """
    try:
        result = share_service.generate_facebook_share_link(
            db=db,
            product_id=product_id,
            tenant_id=user.tenant_id,
            user_id=user.sub,
            campaign=campaign,
            source=source,
            medium=medium,
            hashtag=hashtag,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to generate Facebook share link: {str(e)}"
        )


@router.get("/tiktok-share")
def tiktok_share(
    product_id: str,
    campaign: str = Query("product_share", description="UTM campaign name"),
    source: str = Query("tiktok", description="UTM source"),
    medium: str = Query("share", description="UTM medium"),
    db: Session = Depends(deps.get_db),
    user: ClerkTokenData = Depends(deps.get_current_user),
):
    """
    Generate TikTok sharing information for a product.
    Returns sharing instructions and profile link due to TikTok API limitations.
    Only works for verified tenants.
    """
    try:
        result = share_service.generate_tiktok_share(
            db=db,
            product_id=product_id,
            tenant_id=user.tenant_id,
            user_id=user.sub,
            campaign=campaign,
            source=source,
            medium=medium,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to generate TikTok share info: {str(e)}"
        )


@router.get("/twitter-link")
def twitter_share_link(
    product_id: str,
    campaign: str = Query("product_share", description="UTM campaign name"),
    source: str = Query("twitter", description="UTM source"),
    medium: str = Query("share", description="UTM medium"),
    hashtags: Optional[List[str]] = Query(
        None, description="Optional hashtags for the Twitter share"
    ),
    via: Optional[str] = Query(
        None, description="Optional Twitter handle to attribute the share to"
    ),
    db: Session = Depends(deps.get_db),
    user: ClerkTokenData = Depends(deps.get_current_user),
):
    """
    Generate a Twitter share link for a product with UTM tracking.
    Only works for verified tenants.
    """
    try:
        result = share_service.generate_twitter_share_link(
            db=db,
            product_id=product_id,
            tenant_id=user.tenant_id,
            user_id=user.sub,
            campaign=campaign,
            source=source,
            medium=medium,
            hashtags=hashtags,
            via=via,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to generate Twitter share link: {str(e)}"
        )


@router.get("/telegram-link")
def telegram_share_link(
    product_id: str,
    campaign: str = Query("product_share", description="UTM campaign name"),
    source: str = Query("telegram", description="UTM source"),
    medium: str = Query("share", description="UTM medium"),
    db: Session = Depends(deps.get_db),
    user: ClerkTokenData = Depends(deps.get_current_user),
):
    """
    Generate a Telegram share link for a product with UTM tracking.
    Only works for verified tenants.
    """
    try:
        result = share_service.generate_telegram_share_link(
            db=db,
            product_id=product_id,
            tenant_id=user.tenant_id,
            user_id=user.sub,
            campaign=campaign,
            source=source,
            medium=medium,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to generate Telegram share link: {str(e)}"
        )


@router.get("/all-platforms")
def all_platforms_share(
    product_id: str,
    platforms: Optional[List[str]] = Query(
        None,
        description="List of platforms to generate links for. If not provided, generates for all available platforms.",
    ),
    campaign: str = Query(
        "product_share", description="Base UTM campaign name"),
    db: Session = Depends(deps.get_db),
    user: ClerkTokenData = Depends(deps.get_current_user),
):
    """
    Generate sharing links for multiple platforms at once.
    Only works for verified tenants.

    Available platforms: whatsapp, instagram, facebook, tiktok, twitter, telegram
    """
    try:
        result = share_service.generate_share_links(
            db=db,
            product_id=product_id,
            tenant_id=user.tenant_id,
            user_id=user.sub,
            platforms=platforms,
            campaign=campaign,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to generate share links: {str(e)}"
        )


@router.get("/qr-code")
def generate_qr_code(
    product_id: str,
    size: int = Query(10, ge=1, le=20, description="QR code size in modules"),
    logo: bool = Query(
        False, description="Include tenant logo in QR code if available"
    ),
    db: Session = Depends(deps.get_db),
    user: ClerkTokenData = Depends(deps.get_current_user),
):
    """
    Generate a QR code for a product (only for verified tenants).

    Optionally include the tenant's logo in the center of the QR code.
    """
    try:
        # Get product and verify tenant
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
        if not tenant or not tenant.is_verified:
            raise HTTPException(
                status_code=403, detail="Tenant is not verified")

        # Generate QR code with higher error correction for logo support
        error_correction = (
            qrcode.constants.ERROR_CORRECT_H
            if logo
            else qrcode.constants.ERROR_CORRECT_M
        )
        qr = qrcode.QRCode(
            version=1,
            error_correction=error_correction,
            box_size=size,
            border=4,
        )

        # Generate UTM URL for QR code
        from urllib.parse import urlencode

        utm_params = {
            "utm_source": "qr_code",
            "utm_medium": "offline",
            "utm_campaign": "product_qr",
        }
        base_url = (
            product.storefront_url or f"https://yourstore.com/products/{product.id}"
        )
        tracking_url = f"{base_url}?{urlencode(utm_params)}"

        qr.add_data(tracking_url)
        qr.make(fit=True)

        # Create image
        img = qr.make_image(fill_color="black", back_color="white")

        # Add logo if requested and tenant has a logo URL
        if logo and hasattr(tenant, "logo_url") and tenant.logo_url:
            try:
                from io import BytesIO

                import requests
                from PIL import Image

                # Convert to RGBA for logo overlay
                img = img.convert("RGBA")

                # Download logo
                response = requests.get(tenant.logo_url)
                logo_img = Image.open(BytesIO(response.content))

                # Resize logo to appropriate size (25% of QR code)
                qr_width, qr_height = img.size
                logo_size = min(qr_width, qr_height) // 4
                logo_img = logo_img.resize((logo_size, logo_size))

                # Calculate position to paste logo (center)
                position = ((qr_width - logo_size) // 2,
                            (qr_height - logo_size) // 2)

                # Paste logo onto QR code
                img.paste(
                    logo_img, position, logo_img if logo_img.mode == "RGBA" else None
                )
            except Exception as logo_error:
                # If logo fails, continue without it
                logger.error(
                    f"Failed to add logo to QR code: {str(logo_error)}")

        # Convert to bytes
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format="PNG")
        img_byte_arr.seek(0)

        # Log the QR code generation
        try:
            from backend.app.services.audit_service import create_audit_log

            create_audit_log(
                db=db,
                user_id=user.sub,
                action="generate_qr",
                resource_type="Product",
                resource_id=product_id,
                details={"size": size, "logo": logo, "utm_params": utm_params},
            )
        except Exception as e:
            logger.error(f"Failed to log QR code generation: {str(e)}")

        return StreamingResponse(img_byte_arr, media_type="image/png")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to generate QR code: {str(e)}"
        )
