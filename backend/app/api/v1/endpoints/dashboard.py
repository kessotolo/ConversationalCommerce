from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select

from app.core.security.clerk import ClerkTokenData
from app.core.security.dependencies import require_auth
from app.api.deps import get_current_tenant_id, get_db
from app.schemas.dashboard import DashboardStatsResponse
from app.models.user import User
from app.models.order import Order

router = APIRouter()


@router.get("/dashboard")
async def get_dashboard(user: ClerkTokenData = Depends(require_auth)):
    return {
        "message": "Welcome to your dashboard",
        "user_id": user.sub,
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
        users_query = select(func.count(User.id)).where(User.tenant_id == tenant_id)
        users_result = await db.execute(users_query)
        total_users = users_result.scalar() or 0

        # Count total orders for this tenant
        orders_query = select(func.count(Order.id)).where(Order.tenant_id == tenant_id)
        orders_result = await db.execute(orders_query)
        total_orders = orders_result.scalar() or 0

        # Calculate total revenue from orders for this tenant
        revenue_query = select(func.coalesce(func.sum(Order.total_amount), 0.0)).where(
            Order.tenant_id == tenant_id,
            Order.status != 'cancelled'  # Exclude cancelled orders from revenue
        )
        revenue_result = await db.execute(revenue_query)
        total_revenue = float(revenue_result.scalar() or 0.0)

        # Return the stats
        return DashboardStatsResponse(
            totalUsers=total_users,
            totalOrders=total_orders,
            totalRevenue=total_revenue
        )
    except Exception as e:
        # Log the error but return zeros instead of failing
        # This ensures new tenants get a graceful empty dashboard
        # rather than an error
        print(f"Error fetching dashboard stats: {str(e)}")
        return DashboardStatsResponse(
            totalUsers=0,
            totalOrders=0,
            totalRevenue=0.0
        )
