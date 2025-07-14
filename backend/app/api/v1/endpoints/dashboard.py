from fastapi import APIRouter, Depends, Request, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select

from app.app.core.security.clerk_multi_org import MultiOrgClerkTokenData as ClerkTokenData
from app.app.core.security.auth_deps import require_auth
from app.app.api.deps import get_current_tenant_id, get_db
from app.app.schemas.dashboard import DashboardStatsResponse
from app.app.models.user import User
from app.app.models.order import Order
from app.app.models.product import Product
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/dashboard")
async def get_dashboard(user: ClerkTokenData = Depends(require_auth)):
    return {
        "message": "Welcome to your dashboard",
        "user_id": user.user_id,
        "email": user.email,
    }


@router.get("/dashboard/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    tenant_id: str = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Get dashboard statistics for the current tenant.
    Returns actual metrics for existing tenants or zeros for new tenants.
    """
    try:
        # Count total users for this tenant
        users_query = select(func.count(User.id)).where(
            User.tenant_id == tenant_id)
        users_result = await db.execute(users_query)
        total_users = users_result.scalar() or 0

        # Count total orders for this tenant
        orders_query = select(func.count(Order.id)).where(
            Order.tenant_id == tenant_id)
        orders_result = await db.execute(orders_query)
        total_orders = orders_result.scalar() or 0

        # Calculate total revenue for this tenant
        revenue_query = select(func.coalesce(func.sum(Order.total_amount), 0)).where(
            Order.tenant_id == tenant_id,
            Order.status.in_(["completed", "shipped", "delivered"])
        )
        revenue_result = await db.execute(revenue_query)
        total_revenue = float(revenue_result.scalar() or 0)

        # Count total products for this tenant
        products_query = select(func.count(Product.id)).where(
            Product.tenant_id == tenant_id)
        products_result = await db.execute(products_query)
        total_products = products_result.scalar() or 0

        return DashboardStatsResponse(
            totalUsers=total_users,
            totalOrders=total_orders,
            totalRevenue=total_revenue,
            totalProducts=total_products,
            revenueGrowth=0.0,  # Placeholder for growth calculation
            ordersGrowth=0.0,
            productsGrowth=0.0,
            customersGrowth=0.0
        )
    except Exception as e:
        logger.error(f"Error fetching dashboard stats: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to fetch dashboard stats")


@router.get("/dashboard/stats/dev", response_model=DashboardStatsResponse)
async def get_dashboard_stats_dev():
    """
    Development endpoint that returns mock dashboard stats without authentication.
    This is for testing purposes only.
    """
    return DashboardStatsResponse(
        totalUsers=42,
        totalOrders=156,
        totalRevenue=2847.50,
        totalProducts=23,
        revenueGrowth=12.5,
        ordersGrowth=8.3,
        productsGrowth=15.2,
        customersGrowth=6.7
    )
