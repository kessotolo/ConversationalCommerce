"""
Super Admin Dashboard API endpoints for unified dashboard experience.
Provides comprehensive metrics, KPIs, system health, and real-time data.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, func, desc, and_
from sqlalchemy.orm import selectinload

from backend.app.core.security.dependencies import get_current_super_admin
from backend.app.models.admin.admin_user import AdminUser
from backend.app.db.async_session import get_async_db
from backend.app.models.tenant import Tenant
from backend.app.models.user import User
from backend.app.models.order import Order
from backend.app.models.product import Product
from backend.app.models.audit.audit_log import AuditLog
from backend.app.schemas.admin.dashboard import (
    DashboardMetrics,
    SystemHealthMetrics,
    ActivityFeedItem,
    TenantOverview,
    RecentActivity,
    DashboardKPIs,
    GlobalSearchResult,
    UserMetrics,
    OrderMetrics,
    ProductMetrics,
    SecurityMetrics,
    PerformanceMetrics,
    AlertSummary
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/metrics", response_model=DashboardMetrics)
async def get_dashboard_metrics(
    current_admin: AdminUser = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_async_db),
    days: int = Query(default=30, ge=1, le=365,
                      description="Number of days to analyze")
):
    """
    Get comprehensive dashboard metrics including KPIs, system health, and performance data.
    """
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)

    # Get basic tenant metrics
    tenant_query = await db.execute(
        text("""
            SELECT
                COUNT(*) as total_tenants,
                COUNT(CASE WHEN is_active = true THEN 1 END) as active_tenants,
                COUNT(CASE WHEN is_verified = true THEN 1 END) as verified_tenants,
                COUNT(CASE WHEN created_at >= :start_date THEN 1 END) as new_tenants
            FROM tenants
        """),
        {"start_date": start_date}
    )
    tenant_metrics = tenant_query.fetchone()

    # Get user metrics
    user_query = await db.execute(
        text("""
            SELECT
                COUNT(*) as total_users,
                COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
                COUNT(CASE WHEN created_at >= :start_date THEN 1 END) as new_users,
                COUNT(CASE WHEN last_login >= :start_date THEN 1 END) as active_in_period
            FROM users
        """),
        {"start_date": start_date}
    )
    user_metrics = user_query.fetchone()

    # Get order metrics
    order_query = await db.execute(
        text("""
            SELECT
                COUNT(*) as total_orders,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
                COUNT(CASE WHEN created_at >= :start_date THEN 1 END) as recent_orders,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN total_amount END), 0) as total_revenue,
                COALESCE(AVG(CASE WHEN status = 'completed' THEN total_amount END), 0) as avg_order_value
            FROM orders
        """),
        {"start_date": start_date}
    )
    order_metrics = order_query.fetchone()

    # Get product metrics
    product_query = await db.execute(
        text("""
            SELECT
                COUNT(*) as total_products,
                COUNT(CASE WHEN is_active = true THEN 1 END) as active_products,
                COUNT(CASE WHEN created_at >= :start_date THEN 1 END) as new_products,
                COALESCE(SUM(inventory_quantity), 0) as total_inventory
            FROM products
        """),
        {"start_date": start_date}
    )
    product_metrics = product_query.fetchone()

    # Get security metrics
    security_query = await db.execute(
        text("""
            SELECT
                COUNT(CASE WHEN event_type = 'authentication' AND details->>'success' = 'true' THEN 1 END) as successful_logins,
                COUNT(CASE WHEN event_type = 'authentication' AND details->>'success' = 'false' THEN 1 END) as failed_logins,
                COUNT(CASE WHEN event_type = 'security_violation' THEN 1 END) as security_violations,
                COUNT(CASE WHEN event_type = 'emergency_lockdown' THEN 1 END) as emergency_lockdowns
            FROM audit_logs
            WHERE created_at >= :start_date
        """),
        {"start_date": start_date}
    )
    security_metrics = security_query.fetchone()

    # Get performance metrics (simplified - in production, use monitoring tools)
    performance_query = await db.execute(
        text("""
            SELECT
                COUNT(*) as total_requests,
                AVG(CASE WHEN details->>'response_time' IS NOT NULL
                    THEN CAST(details->>'response_time' AS FLOAT) END) as avg_response_time,
                COUNT(CASE WHEN details->>'status_code' LIKE '5%' THEN 1 END) as error_count
            FROM audit_logs
            WHERE created_at >= :start_date AND event_type = 'api_request'
        """),
        {"start_date": start_date}
    )
    performance_metrics = performance_query.fetchone()

    # Calculate growth rates
    previous_start = start_date - timedelta(days=days)
    previous_tenant_query = await db.execute(
        text("""
            SELECT COUNT(*) as previous_tenants
            FROM tenants
            WHERE created_at >= :start_date AND created_at < :end_date
        """),
        {"start_date": previous_start, "end_date": start_date}
    )
    previous_tenant_count = previous_tenant_query.scalar() or 0

    tenant_growth_rate = 0
    if previous_tenant_count > 0:
        tenant_growth_rate = ((tenant_metrics.new_tenants -
                              previous_tenant_count) / previous_tenant_count) * 100

    return DashboardMetrics(
        tenant_metrics=TenantOverview(
            total_tenants=tenant_metrics.total_tenants,
            active_tenants=tenant_metrics.active_tenants,
            verified_tenants=tenant_metrics.verified_tenants,
            new_tenants=tenant_metrics.new_tenants,
            growth_rate=tenant_growth_rate
        ),
        user_metrics=UserMetrics(
            total_users=user_metrics.total_users,
            active_users=user_metrics.active_users,
            new_users=user_metrics.new_users,
            active_in_period=user_metrics.active_in_period,
            retention_rate=0.0  # Calculate based on your business logic
        ),
        order_metrics=OrderMetrics(
            total_orders=order_metrics.total_orders,
            completed_orders=order_metrics.completed_orders,
            recent_orders=order_metrics.recent_orders,
            total_revenue=float(order_metrics.total_revenue),
            avg_order_value=float(order_metrics.avg_order_value),
            completion_rate=(order_metrics.completed_orders /
                             max(order_metrics.total_orders, 1)) * 100
        ),
        product_metrics=ProductMetrics(
            total_products=product_metrics.total_products,
            active_products=product_metrics.active_products,
            new_products=product_metrics.new_products,
            total_inventory=product_metrics.total_inventory
        ),
        security_metrics=SecurityMetrics(
            successful_logins=security_metrics.successful_logins,
            failed_logins=security_metrics.failed_logins,
            security_violations=security_metrics.security_violations,
            emergency_lockdowns=security_metrics.emergency_lockdowns,
            threat_level="LOW"  # Calculate based on security events
        ),
        performance_metrics=PerformanceMetrics(
            total_requests=performance_metrics.total_requests or 0,
            avg_response_time=performance_metrics.avg_response_time or 0.0,
            error_count=performance_metrics.error_count or 0,
            uptime_percentage=99.9  # Calculate from monitoring data
        ),
        last_updated=datetime.utcnow()
    )


@router.get("/kpis", response_model=DashboardKPIs)
async def get_dashboard_kpis(
    current_admin: AdminUser = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get key performance indicators for the dashboard.
    """
    # Get critical KPIs
    kpi_query = await db.execute(
        text("""
            WITH daily_metrics AS (
                SELECT
                    DATE(created_at) as date,
                    COUNT(DISTINCT CASE WHEN table_name = 'tenants' THEN id END) as daily_tenants,
                    COUNT(DISTINCT CASE WHEN table_name = 'users' THEN id END) as daily_users,
                    COUNT(DISTINCT CASE WHEN table_name = 'orders' THEN id END) as daily_orders,
                    SUM(CASE WHEN table_name = 'orders' AND details->>'total_amount' IS NOT NULL
                        THEN CAST(details->>'total_amount' AS DECIMAL) END) as daily_revenue
                FROM audit_logs
                WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
                GROUP BY DATE(created_at)
            )
            SELECT
                COALESCE(AVG(daily_tenants), 0) as avg_daily_tenants,
                COALESCE(AVG(daily_users), 0) as avg_daily_users,
                COALESCE(AVG(daily_orders), 0) as avg_daily_orders,
                COALESCE(AVG(daily_revenue), 0) as avg_daily_revenue,
                COALESCE(SUM(daily_revenue), 0) as total_revenue_30d
            FROM daily_metrics
        """)
    )
    kpi_data = kpi_query.fetchone()

    # Get system health indicators
    health_query = await db.execute(
        text("""
            SELECT
                COUNT(CASE WHEN event_type = 'system_error' AND created_at >= CURRENT_DATE THEN 1 END) as errors_today,
                COUNT(CASE WHEN event_type = 'security_violation' AND created_at >= CURRENT_DATE THEN 1 END) as security_events_today,
                COUNT(CASE WHEN event_type = 'emergency_lockdown' AND created_at >= CURRENT_DATE THEN 1 END) as lockdowns_today
            FROM audit_logs
        """)
    )
    health_data = health_query.fetchone()

    return DashboardKPIs(
        total_tenants=await db.scalar(text("SELECT COUNT(*) FROM tenants")),
        active_tenants=await db.scalar(text("SELECT COUNT(*) FROM tenants WHERE is_active = true")),
        total_users=await db.scalar(text("SELECT COUNT(*) FROM users")),
        active_users=await db.scalar(text("SELECT COUNT(*) FROM users WHERE is_active = true")),
        total_orders=await db.scalar(text("SELECT COUNT(*) FROM orders")),
        total_revenue=float(await db.scalar(text("SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status = 'completed'")) or 0),
        avg_daily_tenants=float(kpi_data.avg_daily_tenants or 0),
        avg_daily_users=float(kpi_data.avg_daily_users or 0),
        avg_daily_orders=float(kpi_data.avg_daily_orders or 0),
        avg_daily_revenue=float(kpi_data.avg_daily_revenue or 0),
        system_health_score=95.0,  # Calculate based on errors and performance
        security_score=98.0,  # Calculate based on security events
        errors_today=health_data.errors_today or 0,
        security_events_today=health_data.security_events_today or 0,
        lockdowns_today=health_data.lockdowns_today or 0
    )


@router.get("/activity", response_model=List[ActivityFeedItem])
async def get_activity_feed(
    current_admin: AdminUser = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_async_db),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    event_type: Optional[str] = Query(
        default=None, description="Filter by event type")
):
    """
    Get recent activity feed for the dashboard.
    """
    query = text("""
        SELECT
            id,
            event_type,
            actor_id,
            target_id,
            target_type,
            details,
            created_at,
            ip_address
        FROM audit_logs
        WHERE (:event_type IS NULL OR event_type = :event_type)
        ORDER BY created_at DESC
        LIMIT :limit OFFSET :offset
    """)

    result = await db.execute(query, {
        "event_type": event_type,
        "limit": limit,
        "offset": offset
    })

    activities = []
    for row in result:
        activities.append(ActivityFeedItem(
            id=str(row.id),
            event_type=row.event_type,
            actor_id=str(row.actor_id) if row.actor_id else None,
            target_id=str(row.target_id) if row.target_id else None,
            target_type=row.target_type,
            title=_generate_activity_title(row.event_type, row.details),
            description=_generate_activity_description(
                row.event_type, row.details),
            timestamp=row.created_at,
            ip_address=row.ip_address,
            severity=_determine_severity(row.event_type),
            metadata=row.details or {}
        ))

    return activities


@router.get("/health", response_model=SystemHealthMetrics)
async def get_system_health(
    current_admin: AdminUser = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get comprehensive system health metrics.
    """
    # Database health check
    try:
        await db.execute(text("SELECT 1"))
        database_status = "healthy"
        database_response_time = 0.005  # Mock response time
    except Exception:
        database_status = "unhealthy"
        database_response_time = 0.0

    # Get error rates
    error_query = await db.execute(
        text("""
            SELECT
                COUNT(CASE WHEN event_type = 'system_error' AND created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour' THEN 1 END) as errors_last_hour,
                COUNT(CASE WHEN event_type = 'system_error' AND created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours' THEN 1 END) as errors_last_day,
                COUNT(CASE WHEN event_type = 'api_request' AND created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour' THEN 1 END) as requests_last_hour
            FROM audit_logs
        """)
    )
    error_data = error_query.fetchone()

    # Calculate error rate
    error_rate = 0.0
    if error_data.requests_last_hour > 0:
        error_rate = (error_data.errors_last_hour /
                      error_data.requests_last_hour) * 100

    # System resources (mock data - in production, get from monitoring)
    system_health = SystemHealthMetrics(
        overall_status="healthy" if database_status == "healthy" and error_rate < 5 else "degraded",
        uptime_percentage=99.9,
        database_status=database_status,
        database_response_time=database_response_time,
        api_response_time=0.120,  # Mock data
        error_rate=error_rate,
        active_connections=45,  # Mock data
        memory_usage=65.2,  # Mock data
        cpu_usage=23.8,  # Mock data
        disk_usage=78.5,  # Mock data
        last_deployment=datetime.utcnow() - timedelta(hours=2),
        alerts_count=0,
        critical_alerts_count=0,
        services_status={
            "authentication": "healthy",
            "database": database_status,
            "cache": "healthy",
            "queue": "healthy",
            "storage": "healthy"
        }
    )

    return system_health


@router.get("/alerts", response_model=AlertSummary)
async def get_alert_summary(
    current_admin: AdminUser = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get summary of active alerts and notifications.
    """
    alert_query = await db.execute(
        text("""
            SELECT
                event_type,
                COUNT(*) as count,
                MAX(created_at) as latest_occurrence
            FROM audit_logs
            WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
            AND event_type IN ('system_error', 'security_violation', 'emergency_lockdown', 'performance_degradation')
            GROUP BY event_type
            ORDER BY count DESC
        """)
    )

    alerts = []
    total_alerts = 0
    critical_alerts = 0

    for row in alert_query:
        alert_count = row.count
        total_alerts += alert_count

        if row.event_type in ['emergency_lockdown', 'security_violation']:
            critical_alerts += alert_count

        alerts.append({
            "type": row.event_type,
            "count": alert_count,
            "latest_occurrence": row.latest_occurrence,
            "severity": "critical" if row.event_type in ['emergency_lockdown', 'security_violation'] else "warning"
        })

    return AlertSummary(
        total_alerts=total_alerts,
        critical_alerts=critical_alerts,
        warning_alerts=total_alerts - critical_alerts,
        info_alerts=0,
        alerts=alerts,
        last_updated=datetime.utcnow()
    )


def _generate_activity_title(event_type: str, details: Dict[str, Any]) -> str:
    """Generate human-readable title for activity feed item."""
    title_map = {
        "authentication": "User Authentication",
        "tenant_created": "New Tenant Created",
        "user_created": "New User Registered",
        "order_created": "New Order Placed",
        "product_created": "New Product Added",
        "security_violation": "Security Violation Detected",
        "emergency_lockdown": "Emergency Lockdown Activated",
        "system_error": "System Error Occurred",
        "admin_action": "Admin Action Performed"
    }
    return title_map.get(event_type, event_type.replace("_", " ").title())


def _generate_activity_description(event_type: str, details: Dict[str, Any]) -> str:
    """Generate detailed description for activity feed item."""
    if not details:
        return ""

    if event_type == "authentication":
        success = details.get("success", False)
        return f"Login {'successful' if success else 'failed'} from {details.get('ip_address', 'unknown IP')}"
    elif event_type == "tenant_created":
        return f"Tenant '{details.get('name', 'Unknown')}' created with domain '{details.get('domain', 'unknown')}'"
    elif event_type == "order_created":
        return f"Order #{details.get('order_id', 'unknown')} placed for ${details.get('total_amount', '0')}"
    elif event_type == "security_violation":
        return f"Security violation: {details.get('violation_type', 'unknown')} from {details.get('ip_address', 'unknown IP')}"

    return str(details)


def _determine_severity(event_type: str) -> str:
    """Determine severity level for activity feed item."""
    critical_events = ["emergency_lockdown",
                       "security_violation", "system_error"]
    warning_events = ["authentication_failed", "rate_limit_exceeded"]

    if event_type in critical_events:
        return "critical"
    elif event_type in warning_events:
        return "warning"
    else:
        return "info"
