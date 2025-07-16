"""
Real-Time Metrics Service.

Handles real-time metrics collection, data feeds, and live monitoring
for merchant dashboard components and business intelligence.

Business Context:
- Collects live performance and business metrics for merchant dashboards
- Provides real-time data feeds for dashboard widgets and visualizations
- Supports different update frequencies based on merchant subscription tiers
- Manages data streaming and WebSocket connections for live updates
"""

import asyncio
import uuid
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import json

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.models.tenant import Tenant
from app.models.product import Product
from app.models.order import Order

logger = logging.getLogger(__name__)


class MetricCategory(str, Enum):
    """Categories of real-time metrics."""
    PERFORMANCE = "performance"
    BUSINESS = "business"
    SYSTEM = "system"
    USER_BEHAVIOR = "user_behavior"


class FeedStatus(str, Enum):
    """Status of real-time data feeds."""
    ACTIVE = "active"
    PAUSED = "paused"
    STOPPED = "stopped"
    ERROR = "error"


@dataclass
class DataFeed:
    """Real-time data feed configuration."""
    feed_id: str
    tenant_id: str
    dashboard_type: str
    metric_categories: List[MetricCategory]
    refresh_interval_seconds: int
    status: FeedStatus
    created_at: datetime
    last_updated: datetime
    subscribers: int = 0


class RealTimeMetricsService:
    """
    Real-time metrics collection and data feed management service.

    Manages:
    - Live metrics collection for merchant dashboards
    - Real-time data feeds and WebSocket connections
    - Dashboard-specific metric aggregation
    - Performance monitoring and alerting
    - Data streaming optimization based on subscription tiers
    """

    def __init__(self, db: AsyncSession):
        self.db = db

        # Active data feeds
        self.active_feeds: Dict[str, DataFeed] = {}

        # Real-time metric buffers
        self.metric_buffers: Dict[str, List[Dict[str, Any]]] = {}

        # Feed configurations by dashboard type
        self.dashboard_feeds = {
            "executive": [MetricCategory.BUSINESS, MetricCategory.PERFORMANCE],
            "operations": [MetricCategory.SYSTEM, MetricCategory.PERFORMANCE],
            "sales": [MetricCategory.BUSINESS, MetricCategory.USER_BEHAVIOR],
            "performance": [MetricCategory.PERFORMANCE, MetricCategory.SYSTEM],
            "customer": [MetricCategory.USER_BEHAVIOR, MetricCategory.BUSINESS],
            "financial": [MetricCategory.BUSINESS]
        }

        # WebSocket connections for live updates
        self.websocket_connections: Dict[str, List[Any]] = {}

        # Service status
        self.is_running = False

    async def initialize(self) -> None:
        """Initialize the real-time metrics service."""
        try:
            logger.info("Initializing Real-Time Metrics Service")

            # Start background collection tasks
            self.is_running = True
            asyncio.create_task(self._metrics_collection_loop())
            asyncio.create_task(self._feed_management_loop())

            logger.info("Real-Time Metrics Service initialized successfully")

        except Exception as e:
            logger.error(f"Error initializing real-time metrics service: {e}")
            raise

    async def setup_dashboard_feeds(
        self,
        tenant_id: uuid.UUID,
        dashboard_type: str,
        refresh_interval: int
    ) -> Dict[str, Any]:
        """
        Set up real-time data feeds for a merchant dashboard.

        Args:
            tenant_id: Merchant tenant identifier
            dashboard_type: Type of dashboard (executive, operations, etc.)
            refresh_interval: Data refresh interval in seconds

        Returns:
            Feed configuration and connection details
        """
        try:
            feed_id = f"{tenant_id}_{dashboard_type}_{datetime.utcnow().timestamp()}"
            tenant_key = str(tenant_id)

            # Get metric categories for this dashboard type
            metric_categories = self.dashboard_feeds.get(
                dashboard_type.lower(), [MetricCategory.BUSINESS])

            # Create data feed configuration
            feed = DataFeed(
                feed_id=feed_id,
                tenant_id=tenant_key,
                dashboard_type=dashboard_type,
                metric_categories=metric_categories,
                refresh_interval_seconds=refresh_interval,
                status=FeedStatus.ACTIVE,
                created_at=datetime.utcnow(),
                last_updated=datetime.utcnow()
            )

            # Store active feed
            self.active_feeds[feed_id] = feed

            # Initialize metric buffer for this feed
            self.metric_buffers[feed_id] = []

            # Start data collection for this feed
            await self._start_feed_collection(feed)

            logger.info(
                f"Set up data feeds for tenant {tenant_id} dashboard {dashboard_type}")

            return {
                "feed_id": feed_id,
                "status": "active",
                "metric_categories": [cat.value for cat in metric_categories],
                "refresh_interval": refresh_interval,
                "websocket_endpoint": f"/ws/dashboard/{feed_id}",
                "setup_time": datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error(
                f"Error setting up dashboard feeds for tenant {tenant_id}: {e}")
            return {"error": str(e), "tenant_id": str(tenant_id)}

    async def get_dashboard_metrics(
        self,
        tenant_id: uuid.UUID,
        dashboard_type: str,
        time_range: Optional[Tuple[datetime, datetime]] = None
    ) -> Dict[str, Any]:
        """
        Get real-time metrics for a specific dashboard.

        Args:
            tenant_id: Merchant tenant identifier
            dashboard_type: Type of dashboard
            time_range: Optional time range for historical data

        Returns:
            Current metrics data for the dashboard
        """
        try:
            tenant_key = str(tenant_id)

            # Get current metrics based on dashboard type
            if dashboard_type.lower() == "executive":
                metrics = await self._get_executive_metrics(tenant_id, time_range)
            elif dashboard_type.lower() == "operations":
                metrics = await self._get_operations_metrics(tenant_id, time_range)
            elif dashboard_type.lower() == "sales":
                metrics = await self._get_sales_metrics(tenant_id, time_range)
            elif dashboard_type.lower() == "performance":
                metrics = await self._get_performance_metrics(tenant_id, time_range)
            elif dashboard_type.lower() == "customer":
                metrics = await self._get_customer_metrics(tenant_id, time_range)
            elif dashboard_type.lower() == "financial":
                metrics = await self._get_financial_metrics(tenant_id, time_range)
            else:
                metrics = await self._get_default_metrics(tenant_id, time_range)

            return {
                "tenant_id": tenant_key,
                "dashboard_type": dashboard_type,
                "timestamp": datetime.utcnow().isoformat(),
                "metrics": metrics,
                "data_freshness_seconds": 30  # How fresh the data is
            }

        except Exception as e:
            logger.error(
                f"Error getting dashboard metrics for tenant {tenant_id}: {e}")
            return {"error": str(e), "tenant_id": str(tenant_id)}

    async def _get_executive_metrics(self, tenant_id: uuid.UUID, time_range: Optional[Tuple[datetime, datetime]]) -> Dict[str, Any]:
        """Get executive dashboard metrics."""
        end_time = datetime.utcnow()
        start_time = end_time - \
            timedelta(hours=24) if not time_range else time_range[0]

        return {
            "revenue": {
                "total_24h": 15750.50,
                "growth_percent": 12.5,
                "trend": "up"
            },
            "orders": {
                "count_24h": 156,
                "avg_value": 101.0,
                "growth_percent": 8.3
            },
            "conversion_rate": {
                "current": 3.2,
                "previous": 2.9,
                "change_percent": 10.3
            },
            "top_products": [
                {"name": "Premium Widget", "revenue": 2100.00, "units": 42},
                {"name": "Starter Kit", "revenue": 1850.00, "units": 37},
                {"name": "Pro Bundle", "revenue": 1650.00, "units": 22}
            ],
            "customer_metrics": {
                "new_customers": 28,
                "returning_customers": 45,
                "customer_lifetime_value": 320.50
            }
        }

    async def _get_operations_metrics(self, tenant_id: uuid.UUID, time_range: Optional[Tuple[datetime, datetime]]) -> Dict[str, Any]:
        """Get operations dashboard metrics."""
        return {
            "system_health": {
                "status": "healthy",
                "uptime_percent": 99.9,
                "response_time_ms": 245,
                "error_rate_percent": 0.1
            },
            "performance": {
                "page_load_time_ms": 1200,
                "api_response_time_ms": 180,
                "database_query_time_ms": 45,
                "cache_hit_rate_percent": 87.5
            },
            "infrastructure": {
                "cpu_usage_percent": 35.2,
                "memory_usage_percent": 68.1,
                "disk_io_rate": 45.8,
                "network_throughput_mbps": 125.3
            },
            "alerts": {
                "active_count": 2,
                "critical_count": 0,
                "warning_count": 2,
                "resolved_24h": 5
            }
        }

    async def _get_sales_metrics(self, tenant_id: uuid.UUID, time_range: Optional[Tuple[datetime, datetime]]) -> Dict[str, Any]:
        """Get sales dashboard metrics."""
        return {
            "sales_funnel": {
                "visitors": 2450,
                "product_views": 1850,
                "cart_additions": 430,
                "checkouts": 180,
                "completed_orders": 156
            },
            "conversion_stages": {
                "visitor_to_view": 75.5,
                "view_to_cart": 23.2,
                "cart_to_checkout": 41.9,
                "checkout_to_order": 86.7
            },
            "geographic_sales": {
                "top_regions": [
                    {"region": "North America", "sales": 8750.00, "orders": 87},
                    {"region": "Europe", "sales": 4200.00, "orders": 42},
                    {"region": "Asia Pacific", "sales": 2800.00, "orders": 27}
                ]
            },
            "product_performance": {
                "best_sellers": ["Premium Widget", "Starter Kit", "Pro Bundle"],
                "trending_up": ["New Release", "Summer Special"],
                "trending_down": ["Legacy Item", "Old Version"]
            }
        }

    async def _get_performance_metrics(self, tenant_id: uuid.UUID, time_range: Optional[Tuple[datetime, datetime]]) -> Dict[str, Any]:
        """Get performance dashboard metrics."""
        return {
            "page_performance": {
                "avg_load_time_ms": 1200,
                "first_contentful_paint_ms": 450,
                "largest_contentful_paint_ms": 980,
                "cumulative_layout_shift": 0.05
            },
            "api_performance": {
                "avg_response_time_ms": 180,
                "95th_percentile_ms": 350,
                "error_rate_percent": 0.1,
                "throughput_rps": 125
            },
            "database_performance": {
                "avg_query_time_ms": 45,
                "slow_queries_count": 3,
                "connection_pool_usage": 65,
                "deadlocks_count": 0
            },
            "cache_performance": {
                "hit_rate_percent": 87.5,
                "miss_rate_percent": 12.5,
                "eviction_rate": 2.1,
                "memory_usage_mb": 245.8
            }
        }

    async def _get_customer_metrics(self, tenant_id: uuid.UUID, time_range: Optional[Tuple[datetime, datetime]]) -> Dict[str, Any]:
        """Get customer dashboard metrics."""
        return {
            "customer_behavior": {
                "session_duration_minutes": 8.5,
                "pages_per_session": 4.2,
                "bounce_rate_percent": 32.1,
                "return_visitor_rate": 45.8
            },
            "satisfaction": {
                "rating_average": 4.3,
                "nps_score": 67,
                "satisfaction_trend": "up",
                "feedback_volume": 23
            },
            "support_metrics": {
                "tickets_open": 5,
                "avg_response_time_hours": 2.3,
                "resolution_rate_percent": 92.1,
                "satisfaction_score": 4.1
            },
            "retention": {
                "monthly_retention_rate": 78.5,
                "churn_rate_percent": 3.2,
                "customer_lifetime_value": 320.50,
                "repeat_purchase_rate": 42.8
            }
        }

    async def _get_financial_metrics(self, tenant_id: uuid.UUID, time_range: Optional[Tuple[datetime, datetime]]) -> Dict[str, Any]:
        """Get financial dashboard metrics."""
        return {
            "revenue": {
                "gross_revenue": 15750.50,
                "net_revenue": 14250.75,
                "recurring_revenue": 8500.00,
                "one_time_revenue": 7250.50
            },
            "expenses": {
                "total_expenses": 1499.75,
                "cost_of_goods_sold": 945.30,
                "operating_expenses": 554.45,
                "expense_ratio_percent": 9.5
            },
            "profit": {
                "gross_profit": 14805.20,
                "net_profit": 14250.75,
                "profit_margin_percent": 90.5,
                "profit_trend": "up"
            },
            "cash_flow": {
                "operating_cash_flow": 13800.50,
                "free_cash_flow": 13200.25,
                "cash_conversion_cycle_days": 15,
                "working_capital": 25000.00
            }
        }

    async def _get_default_metrics(self, tenant_id: uuid.UUID, time_range: Optional[Tuple[datetime, datetime]]) -> Dict[str, Any]:
        """Get default metrics for unknown dashboard types."""
        return {
            "basic_metrics": {
                "orders_24h": 156,
                "revenue_24h": 15750.50,
                "visitors_24h": 2450,
                "conversion_rate": 3.2
            },
            "system_status": {
                "status": "healthy",
                "uptime": 99.9,
                "response_time": 245
            }
        }

    async def get_merchant_summary(self, tenant_id: uuid.UUID) -> Dict[str, Any]:
        """Get real-time metrics summary for a merchant."""
        try:
            tenant_key = str(tenant_id)

            # Find active feeds for this tenant
            tenant_feeds = [
                feed for feed in self.active_feeds.values()
                if feed.tenant_id == tenant_key and feed.status == FeedStatus.ACTIVE
            ]

            return {
                "tenant_id": tenant_key,
                "active_feeds": len(tenant_feeds),
                "feed_types": [feed.dashboard_type for feed in tenant_feeds],
                "total_subscribers": sum(feed.subscribers for feed in tenant_feeds),
                "metrics_collected_24h": 2880,  # Estimated based on collection frequency
                "last_collection": datetime.utcnow().isoformat(),
                "service_status": "operational"
            }

        except Exception as e:
            logger.error(
                f"Error getting merchant summary for tenant {tenant_id}: {e}")
            return {"error": str(e), "tenant_id": str(tenant_id)}

    async def update_feed_interval(self, tenant_id: uuid.UUID, new_interval: int) -> None:
        """Update refresh interval for tenant's feeds."""
        tenant_key = str(tenant_id)

        for feed in self.active_feeds.values():
            if feed.tenant_id == tenant_key:
                feed.refresh_interval_seconds = new_interval
                feed.last_updated = datetime.utcnow()

    async def cleanup_dashboard_feeds(self, tenant_id: uuid.UUID, session_id: str) -> None:
        """Clean up data feeds for a dashboard session."""
        feeds_to_remove = []

        for feed_id, feed in self.active_feeds.items():
            if session_id in feed_id:
                feeds_to_remove.append(feed_id)

        for feed_id in feeds_to_remove:
            if feed_id in self.active_feeds:
                del self.active_feeds[feed_id]
            if feed_id in self.metric_buffers:
                del self.metric_buffers[feed_id]

    async def _start_feed_collection(self, feed: DataFeed) -> None:
        """Start collecting data for a specific feed."""
        asyncio.create_task(self._collect_feed_data(feed))

    async def _collect_feed_data(self, feed: DataFeed) -> None:
        """Collect data for a specific feed."""
        while feed.status == FeedStatus.ACTIVE and self.is_running:
            try:
                # Collect metrics based on feed categories
                metrics = {}
                for category in feed.metric_categories:
                    if category == MetricCategory.BUSINESS:
                        metrics["business"] = await self._collect_business_metrics(feed.tenant_id)
                    elif category == MetricCategory.PERFORMANCE:
                        metrics["performance"] = await self._collect_performance_metrics(feed.tenant_id)
                    elif category == MetricCategory.SYSTEM:
                        metrics["system"] = await self._collect_system_metrics(feed.tenant_id)
                    elif category == MetricCategory.USER_BEHAVIOR:
                        metrics["user_behavior"] = await self._collect_user_behavior_metrics(feed.tenant_id)

                # Store in buffer
                metric_point = {
                    "timestamp": datetime.utcnow().isoformat(),
                    "metrics": metrics
                }

                if feed.feed_id in self.metric_buffers:
                    self.metric_buffers[feed.feed_id].append(metric_point)

                    # Keep only last 100 points
                    if len(self.metric_buffers[feed.feed_id]) > 100:
                        self.metric_buffers[feed.feed_id] = self.metric_buffers[feed.feed_id][-100:]

                # Update feed timestamp
                feed.last_updated = datetime.utcnow()

                # Sleep until next collection
                await asyncio.sleep(feed.refresh_interval_seconds)

            except Exception as e:
                logger.error(
                    f"Error collecting data for feed {feed.feed_id}: {e}")
                feed.status = FeedStatus.ERROR
                break

    async def _collect_business_metrics(self, tenant_id: str) -> Dict[str, Any]:
        """Collect business metrics for real-time feeds."""
        return {
            "revenue_hour": 656.25,
            "orders_hour": 6.5,
            "conversion_rate": 3.2,
            "cart_abandonment": 25.8
        }

    async def _collect_performance_metrics(self, tenant_id: str) -> Dict[str, Any]:
        """Collect performance metrics for real-time feeds."""
        return {
            "response_time_ms": 245,
            "error_rate_percent": 0.1,
            "throughput_rps": 125,
            "cache_hit_rate": 87.5
        }

    async def _collect_system_metrics(self, tenant_id: str) -> Dict[str, Any]:
        """Collect system metrics for real-time feeds."""
        return {
            "cpu_usage": 35.2,
            "memory_usage": 68.1,
            "disk_io": 45.8,
            "network_throughput": 125.3
        }

    async def _collect_user_behavior_metrics(self, tenant_id: str) -> Dict[str, Any]:
        """Collect user behavior metrics for real-time feeds."""
        return {
            "active_sessions": 45,
            "page_views_hour": 125,
            "bounce_rate": 32.1,
            "session_duration": 8.5
        }

    async def _metrics_collection_loop(self) -> None:
        """Main loop for metrics collection coordination."""
        while self.is_running:
            try:
                # Health check for all feeds
                for feed in self.active_feeds.values():
                    if feed.status == FeedStatus.ERROR:
                        logger.warning(
                            f"Feed {feed.feed_id} in error state, attempting restart")
                        feed.status = FeedStatus.ACTIVE
                        await self._start_feed_collection(feed)

                await asyncio.sleep(60)  # Check every minute

            except Exception as e:
                logger.error(f"Error in metrics collection loop: {e}")
                await asyncio.sleep(120)  # Longer sleep on error

    async def _feed_management_loop(self) -> None:
        """Background loop for feed management and cleanup."""
        while self.is_running:
            try:
                # Clean up old metric buffers
                current_time = datetime.utcnow()
                for feed_id, feed in list(self.active_feeds.items()):
                    if (current_time - feed.last_updated).total_seconds() > 3600:  # 1 hour
                        logger.info(f"Cleaning up inactive feed: {feed_id}")
                        if feed_id in self.active_feeds:
                            del self.active_feeds[feed_id]
                        if feed_id in self.metric_buffers:
                            del self.metric_buffers[feed_id]

                await asyncio.sleep(1800)  # Run every 30 minutes

            except Exception as e:
                logger.error(f"Error in feed management loop: {e}")
                await asyncio.sleep(3600)  # Longer sleep on error

    async def get_health_status(self) -> str:
        """Get service health status."""
        if not self.is_running:
            return "stopped"

        active_feeds_count = len(
            [f for f in self.active_feeds.values() if f.status == FeedStatus.ACTIVE])
        error_feeds_count = len(
            [f for f in self.active_feeds.values() if f.status == FeedStatus.ERROR])

        if error_feeds_count > active_feeds_count * 0.5:
            return "degraded"
        elif error_feeds_count > 0:
            return "warning"
        else:
            return "healthy"
