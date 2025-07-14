"""
Merchant Admin Dashboard API endpoints.

Provides dashboard data and metrics for specific merchants.
All endpoints are scoped to the authenticated merchant's tenant.
"""

from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta

from app.api.deps import get_db
from app.core.security.clerk_multi_org import MultiOrgClerkTokenData as ClerkTokenData
from app.core.security.auth_deps import require_auth
from app.models.tenant import Tenant
from app.models.user import User
from app.models.order import Order
from app.models.product import Product
from app.schemas.admin.dashboard import (
    DashboardMetrics,
    RecentActivity,
    OrderMetrics,
    ProductMetrics,
    TenantOverview,
    UserMetrics,
    SecurityMetrics,
    PerformanceMetrics
)

router = APIRouter()


async def get_merchant_tenant(
    current_user: ClerkTokenData = Depends(require_auth),
    db: AsyncSession = Depends(get_db)
) -> Tenant:
    """
    Get the current merchant's tenant with proper validation.

    Ensures the authenticated user has access to the tenant.
    """
    # Get user from database
    user_query = select(User).where(User.id == current_user.sub)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if not user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not associated with any tenant"
        )

    # Get tenant
    tenant_query = select(Tenant).where(Tenant.id == user.tenant_id)
    tenant_result = await db.execute(tenant_query)
    tenant = tenant_result.scalar_one_or_none()

    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )

    if not tenant.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant is not active"
        )

    return tenant


@router.get("/metrics", response_model=DashboardMetrics)
async def get_dashboard_metrics(
    tenant: Tenant = Depends(get_merchant_tenant),
    db: AsyncSession = Depends(get_db)
) -> DashboardMetrics:
    """
    Get comprehensive dashboard metrics for the merchant.

    Returns sales, customer, product, and order metrics
    scoped to the authenticated merchant's tenant.
    """
    try:
        # Calculate date ranges
        now = datetime.utcnow()
        today = now.date()
        last_30_days = now - timedelta(days=30)
        last_7_days = now - timedelta(days=7)

        # Sales metrics
        total_sales_query = select(func.sum(Order.total_amount)).where(
            Order.tenant_id == tenant.id,
            Order.status.in_(["completed", "paid"]),
            Order.created_at >= last_30_days
        )
        total_sales_result = await db.execute(total_sales_query)
        total_sales = total_sales_result.scalar() or 0

        # Order metrics
        total_orders_query = select(func.count(Order.id)).where(
            Order.tenant_id == tenant.id,
            Order.created_at >= last_30_days
        )
        total_orders_result = await db.execute(total_orders_query)
        total_orders = total_orders_result.scalar() or 0

        # Product metrics
        total_products_query = select(func.count(Product.id)).where(
            Product.tenant_id == tenant.id,
            Product.is_active == True
        )
        total_products_result = await db.execute(total_products_query)
        total_products = total_products_result.scalar() or 0

        # Recent orders (last 7 days)
        recent_orders_query = select(Order).where(
            Order.tenant_id == tenant.id,
            Order.created_at >= last_7_days
        ).order_by(Order.created_at.desc()).limit(10)
        recent_orders_result = await db.execute(recent_orders_query)
        recent_orders = recent_orders_result.scalars().all()

        return DashboardMetrics(
            tenant_metrics=TenantOverview(
                total_tenants=1,
                active_tenants=1,
                verified_tenants=1,
                new_tenants=0,
                growth_rate=0.0
            ),
            user_metrics=UserMetrics(
                total_users=1,
                active_users=1,
                new_users=0,
                active_in_period=1,
                retention_rate=100.0
            ),
            order_metrics=OrderMetrics(
                total_orders=total_orders,
                completed_orders=total_orders,
                recent_orders=len(recent_orders),
                total_revenue=total_sales,
                avg_order_value=total_sales / total_orders if total_orders > 0 else 0,
                completion_rate=100.0
            ),
            product_metrics=ProductMetrics(
                total_products=total_products,
                active_products=total_products,
                new_products=0,
                total_inventory=0
            ),
            security_metrics=SecurityMetrics(
                successful_logins=0,
                failed_logins=0,
                security_violations=0,
                emergency_lockdowns=0,
                threat_level="LOW"
            ),
            performance_metrics=PerformanceMetrics(
                total_requests=0,
                avg_response_time=0.0,
                error_count=0,
                uptime_percentage=100.0
            ),
            last_updated=datetime.utcnow()
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching dashboard metrics: {str(e)}"
        )


@router.get("/recent-activity", response_model=RecentActivity)
async def get_recent_activity(
    tenant: Tenant = Depends(get_merchant_tenant),
    db: AsyncSession = Depends(get_db),
    limit: int = 10
) -> RecentActivity:
    """
    Get recent activity for the merchant's dashboard.

    Returns recent orders, products, and other activity
    scoped to the authenticated merchant's tenant.
    """
    try:
        # Get recent orders
        recent_orders_query = select(Order).where(
            Order.tenant_id == tenant.id
        ).order_by(Order.created_at.desc()).limit(limit)
        recent_orders_result = await db.execute(recent_orders_query)
        recent_orders = recent_orders_result.scalars().all()

        return RecentActivity(
            total_events=len(recent_orders),
            critical_events=0,
            warning_events=0,
            info_events=len(recent_orders),
            activities=[]
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching recent activity: {str(e)}"
        )
