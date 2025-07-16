"""
Merchant-specific Admin Service Layer.

This service orchestrates admin operations for specific merchants with proper
tenant isolation and context validation.

Phase 2 Track A: Create admin service layer per merchant
"""

import uuid
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc
from fastapi import HTTPException, status

from app.core.security.merchant_auth import MerchantAuthContext
from app.models.tenant import Tenant
from app.models.user import User
from app.models.order import Order, OrderStatus
from app.models.product import Product
from app.models.team_member import TeamMember
from app.services.merchant_id_service import merchant_id_service
from app.services.order_service import OrderService
from app.services.settings_service import SettingsService
from app.core.exceptions import ValidationError, ResourceNotFoundError


class MerchantDashboardMetrics:
    """Container for merchant dashboard metrics."""

    def __init__(
        self,
        total_orders: int = 0,
        total_revenue: float = 0.0,
        total_products: int = 0,
        total_customers: int = 0,
        orders_this_month: int = 0,
        revenue_this_month: float = 0.0,
        orders_by_status: Dict[str, int] = None,
        recent_orders: List[Dict[str, Any]] = None,
        top_products: List[Dict[str, Any]] = None,
        revenue_trend: List[Dict[str, Any]] = None,
        order_trend: List[Dict[str, Any]] = None,
        performance_metrics: Dict[str, Any] = None
    ):
        self.total_orders = total_orders
        self.total_revenue = total_revenue
        self.total_products = total_products
        self.total_customers = total_customers
        self.orders_this_month = orders_this_month
        self.revenue_this_month = revenue_this_month
        self.orders_by_status = orders_by_status or {}
        self.recent_orders = recent_orders or []
        self.top_products = top_products or []
        self.revenue_trend = revenue_trend or []
        self.order_trend = order_trend or []
        self.performance_metrics = performance_metrics or {}

    def to_dict(self) -> Dict[str, Any]:
        """Convert metrics to dictionary."""
        return {
            "total_orders": self.total_orders,
            "total_revenue": self.total_revenue,
            "total_products": self.total_products,
            "total_customers": self.total_customers,
            "orders_this_month": self.orders_this_month,
            "revenue_this_month": self.revenue_this_month,
            "orders_by_status": self.orders_by_status,
            "recent_orders": self.recent_orders,
            "top_products": self.top_products,
            "revenue_trend": self.revenue_trend,
            "order_trend": self.order_trend,
            "performance_metrics": self.performance_metrics,
            "last_updated": datetime.utcnow().isoformat()
        }


class MerchantAdminService:
    """
    Comprehensive merchant-scoped admin service layer.

    Orchestrates all admin operations with proper merchant context validation
    and tenant isolation.
    """

    def __init__(self, db: AsyncSession, merchant_context: MerchantAuthContext):
        self.db = db
        self.context = merchant_context
        self.tenant = merchant_context.tenant
        self.merchant_id = merchant_context.merchant_id

        # Initialize dependent services
        self.order_service = OrderService(db)
        self.settings_service = SettingsService(db)

    async def get_dashboard_metrics(
        self,
        period_days: int = 30
    ) -> MerchantDashboardMetrics:
        """
        Get comprehensive dashboard metrics for the merchant.

        Args:
            period_days: Number of days to analyze for trends

        Returns:
            MerchantDashboardMetrics containing all dashboard data
        """
        # Calculate date ranges
        now = datetime.utcnow()
        period_start = now - timedelta(days=period_days)
        month_start = now.replace(
            day=1, hour=0, minute=0, second=0, microsecond=0)

        # Get basic counts
        total_orders = await self._get_total_orders()
        total_revenue = await self._get_total_revenue()
        total_products = await self._get_total_products()
        total_customers = await self._get_total_customers()

        # Get monthly metrics
        orders_this_month = await self._get_orders_count_since(month_start)
        revenue_this_month = await self._get_revenue_since(month_start)

        # Get orders by status
        orders_by_status = await self._get_orders_by_status()

        # Get recent orders (last 10)
        recent_orders = await self._get_recent_orders(limit=10)

        # Get top products
        top_products = await self._get_top_products(period_days)

        # Get trends
        revenue_trend = await self._get_revenue_trend(period_days)
        order_trend = await self._get_order_trend(period_days)

        # Get performance metrics
        performance_metrics = await self._get_performance_metrics(period_days)

        return MerchantDashboardMetrics(
            total_orders=total_orders,
            total_revenue=total_revenue,
            total_products=total_products,
            total_customers=total_customers,
            orders_this_month=orders_this_month,
            revenue_this_month=revenue_this_month,
            orders_by_status=orders_by_status,
            recent_orders=recent_orders,
            top_products=top_products,
            revenue_trend=revenue_trend,
            order_trend=order_trend,
            performance_metrics=performance_metrics
        )

    async def get_merchant_overview(self) -> Dict[str, Any]:
        """
        Get merchant overview information.

        Returns:
            Dictionary containing merchant overview data
        """
        # Get merchant context
        merchant_context = merchant_id_service.generate_merchant_context(
            self.merchant_id, self.tenant
        )

        # Get team member count
        team_members_count = await self._get_team_members_count()

        # Get recent activity
        recent_activity = await self._get_recent_activity()

        # Combine all data
        overview = {
            **merchant_context,
            "team_members_count": team_members_count,
            "recent_activity": recent_activity,
            "admin_access": {
                "user_id": self.context.user_data.user_id,
                "email": self.context.user_data.email,
                "roles": self.context.user_data.roles,
                "organization_source": self.context.user_data.organization_source,
                "is_merchant_owner": self.context.is_merchant_owner,
                "has_admin_access": self.context.user_data.is_admin(),
            }
        }

        return overview

    async def get_merchant_orders(
        self,
        status: Optional[OrderStatus] = None,
        limit: int = 100,
        offset: int = 0,
        search: Optional[str] = None
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        Get merchant orders with filtering and pagination.

        Args:
            status: Filter by order status
            limit: Maximum number of orders to return
            offset: Number of orders to skip
            search: Search query for buyer name/phone

        Returns:
            Tuple of (orders_list, total_count)
        """
        # Build query
        query = select(Order).where(Order.tenant_id == self.tenant.id)

        # Apply filters
        if status:
            query = query.where(Order.status == status)

        if search:
            search_term = f"%{search.lower()}%"
            query = query.where(
                (Order.buyer_name.ilike(search_term)) |
                (Order.buyer_phone.ilike(search_term))
            )

        # Get total count
        count_query = select(func.count(Order.id)
                             ).select_from(query.subquery())
        count_result = await self.db.execute(count_query)
        total_count = count_result.scalar()

        # Apply pagination and ordering
        query = query.order_by(desc(Order.created_at)
                               ).limit(limit).offset(offset)

        # Execute query
        result = await self.db.execute(query)
        orders = result.scalars().all()

        # Convert to dictionaries
        orders_data = []
        for order in orders:
            order_dict = {
                "id": str(order.id),
                "buyer_name": order.buyer_name,
                "buyer_phone": order.buyer_phone,
                "buyer_email": order.buyer_email,
                "total_amount": float(order.total_amount),
                "status": order.status.value if hasattr(order.status, 'value') else str(order.status),
                "order_source": order.order_source.value if hasattr(order.order_source, 'value') else str(order.order_source),
                "created_at": order.created_at.isoformat() if order.created_at else None,
                "updated_at": order.updated_at.isoformat() if order.updated_at else None,
            }
            orders_data.append(order_dict)

        return orders_data, total_count

    async def get_merchant_products(
        self,
        limit: int = 100,
        offset: int = 0,
        search: Optional[str] = None,
        category: Optional[str] = None
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        Get merchant products with filtering and pagination.

        Args:
            limit: Maximum number of products to return
            offset: Number of products to skip
            search: Search query for product name/description
            category: Filter by product category

        Returns:
            Tuple of (products_list, total_count)
        """
        # Build query
        query = select(Product).where(Product.tenant_id == self.tenant.id)

        # Apply filters
        if search:
            search_term = f"%{search.lower()}%"
            query = query.where(
                (Product.name.ilike(search_term)) |
                (Product.description.ilike(search_term))
            )

        if category:
            query = query.where(Product.category == category)

        # Get total count
        count_query = select(func.count(Product.id)
                             ).select_from(query.subquery())
        count_result = await self.db.execute(count_query)
        total_count = count_result.scalar()

        # Apply pagination and ordering
        query = query.order_by(desc(Product.created_at)
                               ).limit(limit).offset(offset)

        # Execute query
        result = await self.db.execute(query)
        products = result.scalars().all()

        # Convert to dictionaries
        products_data = []
        for product in products:
            product_dict = {
                "id": str(product.id),
                "name": product.name,
                "description": product.description,
                "price": float(product.price),
                "stock_quantity": product.stock_quantity,
                "category": product.category,
                "is_active": product.is_active,
                "image_urls": product.image_urls or [],
                "created_at": product.created_at.isoformat() if product.created_at else None,
                "updated_at": product.updated_at.isoformat() if product.updated_at else None,
            }
            products_data.append(product_dict)

        return products_data, total_count

    async def get_merchant_analytics(
        self,
        period_days: int = 30
    ) -> Dict[str, Any]:
        """
        Get comprehensive analytics for the merchant.

        Args:
            period_days: Number of days to analyze

        Returns:
            Dictionary containing analytics data
        """
        # Get dashboard metrics first
        metrics = await self.get_dashboard_metrics(period_days)

        # Add additional analytics
        conversion_metrics = await self._get_conversion_metrics(period_days)
        customer_metrics = await self._get_customer_metrics(period_days)
        product_analytics = await self._get_product_analytics(period_days)

        analytics = {
            **metrics.to_dict(),
            "conversion_metrics": conversion_metrics,
            "customer_metrics": customer_metrics,
            "product_analytics": product_analytics,
            "period_days": period_days,
            "generated_at": datetime.utcnow().isoformat()
        }

        return analytics

    # Private helper methods

    async def _get_total_orders(self) -> int:
        """Get total number of orders."""
        query = select(func.count(Order.id)).where(
            Order.tenant_id == self.tenant.id)
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def _get_total_revenue(self) -> float:
        """Get total revenue."""
        query = select(func.sum(Order.total_amount)).where(
            Order.tenant_id == self.tenant.id)
        result = await self.db.execute(query)
        return float(result.scalar() or 0)

    async def _get_total_products(self) -> int:
        """Get total number of products."""
        query = select(func.count(Product.id)).where(
            Product.tenant_id == self.tenant.id)
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def _get_total_customers(self) -> int:
        """Get total number of unique customers."""
        query = select(func.count(func.distinct(Order.buyer_phone))).where(
            Order.tenant_id == self.tenant.id
        )
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def _get_orders_count_since(self, since_date: datetime) -> int:
        """Get count of orders since a specific date."""
        query = select(func.count(Order.id)).where(
            and_(
                Order.tenant_id == self.tenant.id,
                Order.created_at >= since_date
            )
        )
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def _get_revenue_since(self, since_date: datetime) -> float:
        """Get revenue since a specific date."""
        query = select(func.sum(Order.total_amount)).where(
            and_(
                Order.tenant_id == self.tenant.id,
                Order.created_at >= since_date
            )
        )
        result = await self.db.execute(query)
        return float(result.scalar() or 0)

    async def _get_orders_by_status(self) -> Dict[str, int]:
        """Get order counts by status."""
        query = select(Order.status, func.count(Order.id)).where(
            Order.tenant_id == self.tenant.id
        ).group_by(Order.status)

        result = await self.db.execute(query)
        rows = result.all()

        status_counts = {}
        for status, count in rows:
            status_name = status.value if hasattr(
                status, 'value') else str(status)
            status_counts[status_name] = count

        return status_counts

    async def _get_recent_orders(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent orders."""
        query = select(Order).where(
            Order.tenant_id == self.tenant.id
        ).order_by(desc(Order.created_at)).limit(limit)

        result = await self.db.execute(query)
        orders = result.scalars().all()

        recent_orders = []
        for order in orders:
            order_dict = {
                "id": str(order.id),
                "buyer_name": order.buyer_name,
                "total_amount": float(order.total_amount),
                "status": order.status.value if hasattr(order.status, 'value') else str(order.status),
                "created_at": order.created_at.isoformat() if order.created_at else None,
            }
            recent_orders.append(order_dict)

        return recent_orders

    async def _get_top_products(self, period_days: int) -> List[Dict[str, Any]]:
        """Get top-selling products in the period."""
        period_start = datetime.utcnow() - timedelta(days=period_days)

        # This would need to be enhanced with order items
        # For now, return products ordered by created date
        query = select(Product).where(
            and_(
                Product.tenant_id == self.tenant.id,
                Product.created_at >= period_start
            )
        ).order_by(desc(Product.created_at)).limit(5)

        result = await self.db.execute(query)
        products = result.scalars().all()

        top_products = []
        for product in products:
            product_dict = {
                "id": str(product.id),
                "name": product.name,
                "price": float(product.price),
                "stock_quantity": product.stock_quantity,
                # Would add sales_count when order items are implemented
                "sales_count": 0
            }
            top_products.append(product_dict)

        return top_products

    async def _get_revenue_trend(self, period_days: int) -> List[Dict[str, Any]]:
        """Get revenue trend over the period."""
        # This is a simplified implementation
        # In practice, you'd group by day/week and calculate revenue for each period
        return []

    async def _get_order_trend(self, period_days: int) -> List[Dict[str, Any]]:
        """Get order count trend over the period."""
        # This is a simplified implementation
        # In practice, you'd group by day/week and count orders for each period
        return []

    async def _get_performance_metrics(self, period_days: int) -> Dict[str, Any]:
        """Get performance metrics."""
        total_orders = await self._get_total_orders()
        total_revenue = await self._get_total_revenue()

        return {
            "average_order_value": (total_revenue / total_orders) if total_orders > 0 else 0,
            "orders_per_day": total_orders / period_days if period_days > 0 else 0,
            "revenue_per_day": total_revenue / period_days if period_days > 0 else 0,
        }

    async def _get_team_members_count(self) -> int:
        """Get count of team members."""
        query = select(func.count(TeamMember.id)).where(
            TeamMember.tenant_id == self.tenant.id
        )
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def _get_recent_activity(self) -> List[Dict[str, Any]]:
        """Get recent activity for the merchant."""
        # This would be enhanced with an activity log system
        # For now, return recent orders as activity
        recent_orders = await self._get_recent_orders(limit=5)

        activity = []
        for order in recent_orders:
            activity.append({
                "type": "order_created",
                "description": f"New order from {order['buyer_name']}",
                "timestamp": order["created_at"],
                "reference_id": order["id"]
            })

        return activity

    async def _get_conversion_metrics(self, period_days: int) -> Dict[str, Any]:
        """Get conversion metrics."""
        # Placeholder for conversion metrics
        return {
            "conversion_rate": 0.0,
            "cart_abandonment_rate": 0.0,
            "returning_customers": 0
        }

    async def _get_customer_metrics(self, period_days: int) -> Dict[str, Any]:
        """Get customer metrics."""
        total_customers = await self._get_total_customers()

        return {
            "total_customers": total_customers,
            "new_customers": 0,  # Would need customer creation tracking
            "customer_lifetime_value": 0.0,
            "repeat_customer_rate": 0.0
        }

    async def _get_product_analytics(self, period_days: int) -> Dict[str, Any]:
        """Get product analytics."""
        total_products = await self._get_total_products()

        return {
            "total_products": total_products,
            "active_products": total_products,  # Would need active/inactive tracking
            "out_of_stock_products": 0,
            "low_stock_products": 0
        }


# Factory function for creating merchant admin service
async def create_merchant_admin_service(
    db: AsyncSession,
    merchant_context: MerchantAuthContext
) -> MerchantAdminService:
    """
    Factory function to create a merchant admin service instance.

    Args:
        db: Database session
        merchant_context: Authenticated merchant context

    Returns:
        MerchantAdminService instance
    """
    return MerchantAdminService(db, merchant_context)
