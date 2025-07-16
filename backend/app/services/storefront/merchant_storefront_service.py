"""
Merchant-specific Storefront Service Layer.

This service orchestrates storefront operations for customers with proper
merchant context validation and optimized for customer experience.

Phase 2 Track A: Create storefront service layer per merchant
"""

import uuid
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc, or_
from fastapi import HTTPException, status

from app.models.tenant import Tenant
from app.models.product import Product
from app.models.order import Order, OrderStatus, OrderSource
from app.models.cart import Cart
from app.models.storefront import StorefrontConfig
from app.services.merchant_id_service import merchant_id_service, MerchantIdType
from app.core.exceptions import ValidationError, ResourceNotFoundError


class StorefrontProductInfo:
    """Container for storefront product information."""

    def __init__(
        self,
        id: str,
        name: str,
        description: str,
        price: float,
        stock_quantity: int,
        category: Optional[str] = None,
        image_urls: List[str] = None,
        is_featured: bool = False,
        tags: List[str] = None,
        created_at: Optional[datetime] = None
    ):
        self.id = id
        self.name = name
        self.description = description
        self.price = price
        self.stock_quantity = stock_quantity
        self.category = category
        self.image_urls = image_urls or []
        self.is_featured = is_featured
        self.tags = tags or []
        self.created_at = created_at

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "price": self.price,
            "stock_quantity": self.stock_quantity,
            "category": self.category,
            "image_urls": self.image_urls,
            "is_featured": self.is_featured,
            "tags": self.tags,
            "in_stock": self.stock_quantity > 0,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class StorefrontInfo:
    """Container for storefront configuration and branding."""

    def __init__(
        self,
        merchant_id: str,
        business_name: str,
        subdomain: str,
        custom_domain: Optional[str] = None,
        storefront_config: Optional[Dict[str, Any]] = None,
        contact_info: Optional[Dict[str, Any]] = None,
        branding: Optional[Dict[str, Any]] = None,
        is_active: bool = True
    ):
        self.merchant_id = merchant_id
        self.business_name = business_name
        self.subdomain = subdomain
        self.custom_domain = custom_domain
        self.storefront_config = storefront_config or {}
        self.contact_info = contact_info or {}
        self.branding = branding or {}
        self.is_active = is_active

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "merchant_id": self.merchant_id,
            "business_name": self.business_name,
            "subdomain": self.subdomain,
            "custom_domain": self.custom_domain,
            "storefront_url": f"https://{self.subdomain}.enwhe.io",
            "custom_url": f"https://{self.custom_domain}" if self.custom_domain else None,
            "storefront_config": self.storefront_config,
            "contact_info": self.contact_info,
            "branding": self.branding,
            "is_active": self.is_active
        }


class MerchantStorefrontService:
    """
    Comprehensive merchant-scoped storefront service layer.

    Orchestrates all customer-facing operations with proper merchant context
    validation and optimized for customer experience.
    """

    def __init__(self, db: AsyncSession, merchant_id: str):
        self.db = db
        self.merchant_id = merchant_id
        self.tenant = None  # Will be loaded lazily

    async def _get_tenant(self) -> Tenant:
        """Get and cache tenant information."""
        if self.tenant is None:
            # Detect merchant ID type and query accordingly
            id_type = merchant_id_service.detect_merchant_id_type(
                self.merchant_id)

            if id_type == MerchantIdType.UUID:
                try:
                    tenant_uuid = uuid.UUID(self.merchant_id)
                    query = select(Tenant).where(Tenant.id == tenant_uuid)
                except ValueError:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid merchant ID format"
                    )
            else:
                # Treat as subdomain
                query = select(Tenant).where(
                    Tenant.subdomain == self.merchant_id)

            result = await self.db.execute(query)
            self.tenant = result.scalar_one_or_none()

            if not self.tenant:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Store '{self.merchant_id}' not found"
                )

            if not self.tenant.is_active:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Store is temporarily unavailable"
                )

        return self.tenant

    async def get_storefront_info(self) -> StorefrontInfo:
        """
        Get storefront information and configuration.

        Returns:
            StorefrontInfo containing store details and configuration
        """
        tenant = await self._get_tenant()

        # Get storefront configuration if available
        storefront_config = {}
        config_query = select(StorefrontConfig).where(
            StorefrontConfig.tenant_id == tenant.id)
        config_result = await self.db.execute(config_query)
        config = config_result.scalar_one_or_none()

        if config:
            storefront_config = {
                "theme_settings": config.theme_settings or {},
                "layout_config": config.layout_config or {},
                "meta_title": config.meta_title,
                "meta_description": config.meta_description,
                "social_links": config.social_links or {}
            }

        # Build contact info
        contact_info = {
            "phone_number": tenant.phone_number,
            "whatsapp_number": tenant.whatsapp_number,
            "email": tenant.email,
            "country_code": tenant.country_code
        }

        # Build branding info
        branding = {
            "business_name": tenant.name,
            "logo_url": storefront_config.get("theme_settings", {}).get("logo_url"),
            "primary_color": storefront_config.get("theme_settings", {}).get("primary_color"),
            "secondary_color": storefront_config.get("theme_settings", {}).get("secondary_color")
        }

        return StorefrontInfo(
            merchant_id=self.merchant_id,
            business_name=tenant.name,
            subdomain=tenant.subdomain,
            custom_domain=tenant.custom_domain,
            storefront_config=storefront_config,
            contact_info=contact_info,
            branding=branding,
            is_active=tenant.is_active
        )

    async def get_product_catalog(
        self,
        category: Optional[str] = None,
        search: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        limit: int = 20,
        offset: int = 0,
        featured_only: bool = False
    ) -> Tuple[List[StorefrontProductInfo], int]:
        """
        Get product catalog for storefront browsing.

        Args:
            category: Filter by product category
            search: Search query for product name/description
            sort_by: Sort field (name, price, created_at)
            sort_order: Sort direction (asc, desc)
            limit: Maximum number of products to return
            offset: Number of products to skip
            featured_only: Show only featured products

        Returns:
            Tuple of (product_list, total_count)
        """
        tenant = await self._get_tenant()

        # Build base query for active products only
        query = select(Product).where(
            and_(
                Product.tenant_id == tenant.id,
                Product.is_active == True,
                Product.stock_quantity > 0  # Only show in-stock products
            )
        )

        # Apply filters
        if category:
            query = query.where(Product.category == category)

        if search:
            search_term = f"%{search.lower()}%"
            query = query.where(
                or_(
                    Product.name.ilike(search_term),
                    Product.description.ilike(search_term),
                    Product.category.ilike(search_term)
                )
            )

        # Apply featured filter
        if featured_only:
            # Assuming there's a featured flag or we use created_at as proxy
            recent_cutoff = datetime.utcnow() - timedelta(days=30)
            query = query.where(Product.created_at >= recent_cutoff)

        # Get total count
        count_query = select(func.count(Product.id)
                             ).select_from(query.subquery())
        count_result = await self.db.execute(count_query)
        total_count = count_result.scalar()

        # Apply sorting
        if sort_by == "name":
            order_column = Product.name
        elif sort_by == "price":
            order_column = Product.price
        else:
            order_column = Product.created_at

        if sort_order == "asc":
            query = query.order_by(order_column.asc())
        else:
            query = query.order_by(order_column.desc())

        # Apply pagination
        query = query.limit(limit).offset(offset)

        # Execute query
        result = await self.db.execute(query)
        products = result.scalars().all()

        # Convert to StorefrontProductInfo
        product_infos = []
        for product in products:
            product_info = StorefrontProductInfo(
                id=str(product.id),
                name=product.name,
                description=product.description,
                price=float(product.price),
                stock_quantity=product.stock_quantity,
                category=product.category,
                image_urls=product.image_urls or [],
                is_featured=featured_only,  # Simplified logic
                tags=[],  # Would be enhanced with actual tags
                created_at=product.created_at
            )
            product_infos.append(product_info)

        return product_infos, total_count

    async def get_product_details(
        self,
        product_id: str
    ) -> StorefrontProductInfo:
        """
        Get detailed product information for product page.

        Args:
            product_id: Product ID to retrieve

        Returns:
            StorefrontProductInfo with detailed product data
        """
        tenant = await self._get_tenant()

        # Get product
        try:
            product_uuid = uuid.UUID(product_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid product ID format"
            )

        query = select(Product).where(
            and_(
                Product.id == product_uuid,
                Product.tenant_id == tenant.id,
                Product.is_active == True
            )
        )

        result = await self.db.execute(query)
        product = result.scalar_one_or_none()

        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )

        return StorefrontProductInfo(
            id=str(product.id),
            name=product.name,
            description=product.description,
            price=float(product.price),
            stock_quantity=product.stock_quantity,
            category=product.category,
            image_urls=product.image_urls or [],
            is_featured=False,  # Would be enhanced with actual featured logic
            tags=[],  # Would be enhanced with actual tags
            created_at=product.created_at
        )

    async def get_product_categories(self) -> List[str]:
        """
        Get all available product categories for the store.

        Returns:
            List of category names
        """
        tenant = await self._get_tenant()

        query = select(Product.category).where(
            and_(
                Product.tenant_id == tenant.id,
                Product.is_active == True,
                Product.category.isnot(None)
            )
        ).distinct()

        result = await self.db.execute(query)
        categories = [row[0] for row in result.fetchall() if row[0]]

        return sorted(categories)

    async def search_products(
        self,
        query: str,
        limit: int = 20,
        offset: int = 0
    ) -> Tuple[List[StorefrontProductInfo], int]:
        """
        Search products by name, description, or category.

        Args:
            query: Search query
            limit: Maximum number of results
            offset: Number of results to skip

        Returns:
            Tuple of (product_list, total_count)
        """
        return await self.get_product_catalog(
            search=query,
            limit=limit,
            offset=offset,
            sort_by="name",
            sort_order="asc"
        )

    async def get_featured_products(
        self,
        limit: int = 6
    ) -> List[StorefrontProductInfo]:
        """
        Get featured products for homepage display.

        Args:
            limit: Maximum number of featured products

        Returns:
            List of featured products
        """
        products, _ = await self.get_product_catalog(
            featured_only=True,
            limit=limit,
            sort_by="created_at",
            sort_order="desc"
        )

        return products

    async def create_customer_order(
        self,
        order_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create a new order from storefront (customer-initiated).

        Args:
            order_data: Order information from customer

        Returns:
            Dictionary containing order confirmation data
        """
        tenant = await self._get_tenant()

        # Validate product exists and is available
        try:
            product_id = uuid.UUID(order_data["product_id"])
        except (ValueError, KeyError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid product ID"
            )

        product_query = select(Product).where(
            and_(
                Product.id == product_id,
                Product.tenant_id == tenant.id,
                Product.is_active == True
            )
        )

        product_result = await self.db.execute(product_query)
        product = product_result.scalar_one_or_none()

        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )

        # Check stock availability
        requested_quantity = order_data.get("quantity", 1)
        if product.stock_quantity < requested_quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient stock available"
            )

        # Create order
        order = Order(
            id=uuid.uuid4(),
            tenant_id=tenant.id,
            product_id=product_id,
            buyer_name=order_data["buyer_name"],
            buyer_phone=order_data["buyer_phone"],
            buyer_email=order_data.get("buyer_email"),
            buyer_address=order_data.get("buyer_address"),
            quantity=requested_quantity,
            total_amount=float(product.price) * requested_quantity,
            status=OrderStatus.PENDING,
            order_source=OrderSource.website,
            notes=order_data.get("notes"),
            created_at=datetime.utcnow()
        )

        self.db.add(order)
        await self.db.commit()
        await self.db.refresh(order)

        # Update product stock
        product.stock_quantity -= requested_quantity
        await self.db.commit()

        return {
            "order_id": str(order.id),
            "status": order.status.value,
            "total_amount": float(order.total_amount),
            "product_name": product.name,
            "quantity": order.quantity,
            "buyer_name": order.buyer_name,
            "estimated_delivery": "2-3 business days",  # Would be enhanced
            "tracking_url": f"/orders/{order.id}/track",
            "payment_instructions": "Please contact us to complete payment",
            "merchant_contact": {
                "phone": tenant.phone_number,
                "whatsapp": tenant.whatsapp_number,
                "email": tenant.email
            }
        }

    async def track_customer_order(
        self,
        order_id: str,
        customer_phone: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Track order status for customer.

        Args:
            order_id: Order ID to track
            customer_phone: Customer phone for verification

        Returns:
            Dictionary containing order tracking information
        """
        tenant = await self._get_tenant()

        try:
            order_uuid = uuid.UUID(order_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid order ID format"
            )

        query = select(Order).where(
            and_(
                Order.id == order_uuid,
                Order.tenant_id == tenant.id
            )
        )

        # Add phone verification if provided
        if customer_phone:
            query = query.where(Order.buyer_phone == customer_phone)

        result = await self.db.execute(query)
        order = result.scalar_one_or_none()

        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found"
            )

        # Get product details
        product_query = select(Product).where(Product.id == order.product_id)
        product_result = await self.db.execute(product_query)
        product = product_result.scalar_one_or_none()

        return {
            "order_id": str(order.id),
            "status": order.status.value,
            "status_description": self._get_status_description(order.status),
            "total_amount": float(order.total_amount),
            "quantity": order.quantity,
            "product_name": product.name if product else "Unknown Product",
            "buyer_name": order.buyer_name,
            "created_at": order.created_at.isoformat() if order.created_at else None,
            "updated_at": order.updated_at.isoformat() if order.updated_at else None,
            "estimated_delivery": self._get_estimated_delivery(order.status),
            "merchant_contact": {
                "business_name": tenant.name,
                "phone": tenant.phone_number,
                "whatsapp": tenant.whatsapp_number,
                "email": tenant.email
            }
        }

    def _get_status_description(self, status: OrderStatus) -> str:
        """Get human-readable status description."""
        status_descriptions = {
            OrderStatus.PENDING: "Order received and being processed",
            OrderStatus.CONFIRMED: "Order confirmed and preparing for shipment",
            OrderStatus.PROCESSING: "Order is being prepared",
            OrderStatus.SHIPPED: "Order has been shipped",
            OrderStatus.DELIVERED: "Order has been delivered",
            OrderStatus.CANCELLED: "Order has been cancelled",
            OrderStatus.RETURNED: "Order has been returned"
        }
        return status_descriptions.get(status, "Unknown status")

    def _get_estimated_delivery(self, status: OrderStatus) -> str:
        """Get estimated delivery timeframe based on status."""
        delivery_estimates = {
            OrderStatus.PENDING: "2-3 business days",
            OrderStatus.CONFIRMED: "1-2 business days",
            OrderStatus.PROCESSING: "1-2 business days",
            OrderStatus.SHIPPED: "Within 24 hours",
            OrderStatus.DELIVERED: "Delivered",
            OrderStatus.CANCELLED: "N/A",
            OrderStatus.RETURNED: "N/A"
        }
        return delivery_estimates.get(status, "Contact merchant for details")


# Factory function for creating merchant storefront service
async def create_merchant_storefront_service(
    db: AsyncSession,
    merchant_id: str
) -> MerchantStorefrontService:
    """
    Factory function to create a merchant storefront service instance.

    Args:
        db: Database session
        merchant_id: Merchant identifier (UUID or subdomain)

    Returns:
        MerchantStorefrontService instance
    """
    return MerchantStorefrontService(db, merchant_id)
