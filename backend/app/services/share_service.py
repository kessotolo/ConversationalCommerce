import logging
from typing import Any, Dict, List
from urllib.parse import urlencode

from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.tenant import Tenant
from app.services.audit_service import create_audit_log
from app.utils.social_links import (
    generate_facebook_share_link,
    generate_instagram_share,
    generate_telegram_share_link,
    generate_tiktok_share,
    generate_twitter_share_link,
    generate_whatsapp_link,
)
from app.core.exceptions import AppError

logger = logging.getLogger(__name__)


class ShareServiceError(AppError):
    pass


class ShareService:
    def _get_product_and_verify_tenant(
        self, db: Session, product_id: str, tenant_id: str
    ) -> tuple[Product, Tenant]:
        """
        Helper method to get product and verify tenant.
        Raises ValueError if product not found or tenant not verified.
        """
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise ShareServiceError("Product not found")

        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            raise ShareServiceError("Tenant not found")

        if not tenant.is_verified:
            raise ShareServiceError(
                "Tenant is not verified for sharing features")

        return product, tenant

    def _get_utm_url(
        self,
        product: Product,
        campaign: str = "product_share",
        source: str = "social",
        medium: str = "share",
    ) -> tuple[str, Dict[str, str]]:
        """
        Generate a URL with UTM parameters for tracking.

        Returns:
            Tuple of (utm_url, utm_params)
        """
        # Generate UTM parameters
        utm_params = {
            "utm_source": source,
            "utm_medium": medium,
            "utm_campaign": campaign,
        }

        # Get base URL (prefer storefront URL if available)
        base_url = (
            product.storefront_url or f"https://yourstore.com/products/{product.id}"
        )

        # Add UTM parameters to URL
        utm_url = f"{base_url}?{urlencode(utm_params)}"

        return utm_url, utm_params

    def _log_share_event(
        self,
        db: Session,
        user_id: str,
        product_id: str,
        platform: str,
        campaign: str,
        utm_params: Dict[str, str],
    ) -> None:
        """
        Log a share event to the audit log.
        """
        try:
            create_audit_log(
                db=db,
                user_id=user_id,
                action="share",
                resource_type="Product",
                resource_id=product_id,
                details={
                    "type": platform,
                    "campaign": campaign,
                    "utm_params": utm_params,
                },
            )
        except Exception as e:
            logger.error(f"Failed to log share event: {str(e)}")

    def generate_whatsapp_share_link(
        self,
        db: Session,
        product_id: str,
        tenant_id: str,
        user_id: str,
        campaign: str = "product_share",
        source: str = "whatsapp",
        medium: str = "share",
    ) -> Dict[str, str]:
        """
        Generate a WhatsApp share link with UTM tracking for a product.
        Only works for verified tenants.
        """
        # Get product and verify tenant
        product, tenant = self._get_product_and_verify_tenant(
            db, product_id, tenant_id)

        # Generate UTM URL
        utm_url, utm_params = self._get_utm_url(
            product, campaign, source, medium)

        # Generate WhatsApp share link
        caption = f"Check out this product: {product.name}! {utm_url}"
        whatsapp_link = generate_whatsapp_link(
            tenant.whatsapp_number or "", product.name, caption
        )

        # Log the share event
        self._log_share_event(db, user_id, product_id,
                              "whatsapp", campaign, utm_params)

        return {
            "platform": "whatsapp",
            "link": whatsapp_link,
            "utm_url": utm_url,
            "campaign": campaign,
        }

    def generate_instagram_share(
        self,
        db: Session,
        product_id: str,
        tenant_id: str,
        user_id: str,
        campaign: str = "product_share",
        source: str = "instagram",
        medium: str = "share",
    ) -> Dict[str, Any]:
        """
        Generate Instagram sharing information for a product.
        Due to Instagram limitations, returns sharing instructions and links.
        """
        # Get product and verify tenant
        product, tenant = self._get_product_and_verify_tenant(
            db, product_id, tenant_id)

        # Generate UTM URL
        utm_url, utm_params = self._get_utm_url(
            product, campaign, source, medium)

        # Get Instagram handle from tenant
        instagram_handle = tenant.instagram_handle or ""

        # Generate caption
        caption = f"Check out {product.name}! Link in bio: {utm_url}"

        # Generate Instagram sharing info
        instagram_info = generate_instagram_share(
            instagram_handle=instagram_handle,
            caption=caption,
            image_url=product.image_url if hasattr(
                product, "image_url") else None,
        )

        # Log the share event
        self._log_share_event(
            db, user_id, product_id, "instagram", campaign, utm_params
        )

        return {
            "platform": "instagram",
            **instagram_info,
            "utm_url": utm_url,
            "campaign": campaign,
        }

    def generate_facebook_share_link(
        self,
        db: Session,
        product_id: str,
        tenant_id: str,
        user_id: str,
        campaign: str = "product_share",
        source: str = "facebook",
        medium: str = "share",
        hashtag: str = None,
    ) -> Dict[str, str]:
        """
        Generate a Facebook share link with UTM tracking for a product.
        """
        # Get product and verify tenant
        product, tenant = self._get_product_and_verify_tenant(
            db, product_id, tenant_id)

        # Generate UTM URL
        utm_url, utm_params = self._get_utm_url(
            product, campaign, source, medium)

        # Generate quote text
        quote = f"Check out this product: {product.name}!"

        # Generate Facebook share link
        facebook_link = generate_facebook_share_link(
            url=utm_url, quote=quote, hashtag=hashtag
        )

        # Log the share event
        self._log_share_event(db, user_id, product_id,
                              "facebook", campaign, utm_params)

        return {
            "platform": "facebook",
            "link": facebook_link,
            "utm_url": utm_url,
            "campaign": campaign,
        }

    def generate_tiktok_share(
        self,
        db: Session,
        product_id: str,
        tenant_id: str,
        user_id: str,
        campaign: str = "product_share",
        source: str = "tiktok",
        medium: str = "share",
    ) -> Dict[str, Any]:
        """
        Generate TikTok sharing information for a product.
        Due to TikTok limitations, returns sharing instructions and profile link.
        """
        # Get product and verify tenant
        product, tenant = self._get_product_and_verify_tenant(
            db, product_id, tenant_id)

        # Generate UTM URL
        utm_url, utm_params = self._get_utm_url(
            product, campaign, source, medium)

        # Get TikTok handle from tenant
        tiktok_handle = tenant.tiktok_handle or ""

        # Generate caption
        caption = f"Check out {product.name}! Link in bio: {utm_url}"

        # Generate TikTok sharing info
        tiktok_info = generate_tiktok_share(
            tiktok_handle=tiktok_handle, caption=caption
        )

        # Log the share event
        self._log_share_event(db, user_id, product_id,
                              "tiktok", campaign, utm_params)

        return {
            "platform": "tiktok",
            **tiktok_info,
            "utm_url": utm_url,
            "campaign": campaign,
        }

    def generate_twitter_share_link(
        self,
        db: Session,
        product_id: str,
        tenant_id: str,
        user_id: str,
        campaign: str = "product_share",
        source: str = "twitter",
        medium: str = "share",
        hashtags: List[str] = None,
        via: str = None,
    ) -> Dict[str, str]:
        """
        Generate a Twitter share link with UTM tracking for a product.
        """
        # Get product and verify tenant
        product, tenant = self._get_product_and_verify_tenant(
            db, product_id, tenant_id)

        # Generate UTM URL
        utm_url, utm_params = self._get_utm_url(
            product, campaign, source, medium)

        # Generate text
        text = f"Check out this product: {product.name}!"

        # Generate Twitter share link
        twitter_link = generate_twitter_share_link(
            url=utm_url, text=text, hashtags=hashtags or [], via=via
        )

        # Log the share event
        self._log_share_event(db, user_id, product_id,
                              "twitter", campaign, utm_params)

        return {
            "platform": "twitter",
            "link": twitter_link,
            "utm_url": utm_url,
            "campaign": campaign,
        }

    def generate_telegram_share_link(
        self,
        db: Session,
        product_id: str,
        tenant_id: str,
        user_id: str,
        campaign: str = "product_share",
        source: str = "telegram",
        medium: str = "share",
    ) -> Dict[str, str]:
        """
        Generate a Telegram share link with UTM tracking for a product.
        """
        # Get product and verify tenant
        product, tenant = self._get_product_and_verify_tenant(
            db, product_id, tenant_id)

        # Generate UTM URL
        utm_url, utm_params = self._get_utm_url(
            product, campaign, source, medium)

        # Generate text
        text = f"Check out this product: {product.name}!"

        # Generate Telegram share link
        telegram_link = generate_telegram_share_link(url=utm_url, text=text)

        # Log the share event
        self._log_share_event(db, user_id, product_id,
                              "telegram", campaign, utm_params)

        return {
            "platform": "telegram",
            "link": telegram_link,
            "utm_url": utm_url,
            "campaign": campaign,
        }

    def generate_share_links(
        self,
        db: Session,
        product_id: str,
        tenant_id: str,
        user_id: str,
        platforms: List[str] = None,
        campaign: str = "product_share",
    ) -> Dict[str, Any]:
        """
        Generate sharing links for multiple platforms at once.

        Args:
            platforms: List of platforms to generate links for. If None, generates links for all available platforms.

        Returns:
            Dictionary with share links for each platform
        """
        available_platforms = {
            "whatsapp": self.generate_whatsapp_share_link,
            "instagram": self.generate_instagram_share,
            "facebook": self.generate_facebook_share_link,
            "tiktok": self.generate_tiktok_share,
            "twitter": self.generate_twitter_share_link,
            "telegram": self.generate_telegram_share_link,
        }

        # If no platforms specified, use all available
        if not platforms:
            platforms = list(available_platforms.keys())

        # Check if all requested platforms are valid
        invalid_platforms = [
            p for p in platforms if p not in available_platforms]
        if invalid_platforms:
            raise ShareServiceError(
                f"Invalid platforms: {', '.join(invalid_platforms)}")

        # Generate links for each platform
        result = {}
        for platform in platforms:
            try:
                generator = available_platforms[platform]
                result[platform] = generator(
                    db=db,
                    product_id=product_id,
                    tenant_id=tenant_id,
                    user_id=user_id,
                    campaign=f"{campaign}_{platform}",
                    source=platform,
                    medium="share",
                )
            except Exception as e:
                logger.error(
                    f"Failed to generate {platform} share link: {str(e)}")
                result[platform] = {"error": str(e)}

        return result


share_service = ShareService()
