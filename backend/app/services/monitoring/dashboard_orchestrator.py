"""
Advanced Monitoring Dashboard Orchestrator.

Multi-tenant SaaS monitoring coordinator that manages comprehensive business intelligence,
real-time performance monitoring, and merchant-specific analytics dashboards.
Provides data visualization and insights to help merchants optimize their operations.

Business Context:
- "Merchant" = Business customer using the platform to run their online store
- "Tenant" = Individual merchant's isolated monitoring environment (tenant_id identifies each merchant)
- Each merchant gets customized dashboards based on their subscription tier and business needs
- Real-time monitoring helps merchants track performance, sales, and customer behavior
- Business intelligence provides insights for data-driven decision making
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

from app.services.monitoring.real_time_metrics import RealTimeMetricsService
from app.services.monitoring.business_intelligence import BusinessIntelligenceService
from app.services.monitoring.alert_manager import AlertManagerService
from app.services.monitoring.dashboard_builder import DashboardBuilderService

logger = logging.getLogger(__name__)


class DashboardType(str, Enum):
    """Types of monitoring dashboards."""
    EXECUTIVE = "executive"
    OPERATIONS = "operations"
    SALES = "sales"
    PERFORMANCE = "performance"
    CUSTOMER = "customer"
    FINANCIAL = "financial"


class MonitoringTier(str, Enum):
    """Monitoring tier levels based on merchant subscription."""
    BASIC = "basic"
    STANDARD = "standard"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"


@dataclass
class DashboardConfig:
    """Dashboard configuration for a merchant."""
    tenant_id: str
    dashboard_type: DashboardType
    monitoring_tier: MonitoringTier
    widgets: List[Dict[str, Any]]
    refresh_interval_seconds: int
    alert_config: Dict[str, Any]
    custom_metrics: List[str]


class AdvancedMonitoringOrchestrator:
    """
    Advanced monitoring dashboard orchestrator for merchant business intelligence.

    Coordinates:
    - Real-time performance and business metrics collection
    - Business intelligence data processing and insights generation
    - Alert management and notification systems
    - Dashboard building and customization
    - Historical data analysis and trend identification
    - Multi-tier monitoring based on merchant subscription levels
    """

    def __init__(self, db: AsyncSession):
        self.db = db

        # Component services
        self.real_time_service: Optional[RealTimeMetricsService] = None
        self.business_intelligence: Optional[BusinessIntelligenceService] = None
        self.alert_manager: Optional[AlertManagerService] = None
        self.dashboard_builder: Optional[DashboardBuilderService] = None

        # Dashboard configurations per tenant
        self.dashboard_configs: Dict[str, List[DashboardConfig]] = {}

        # Monitoring tiers and their capabilities
        self.tier_capabilities = {
            MonitoringTier.BASIC: {
                "max_dashboards": 2,
                "refresh_interval": 300,  # 5 minutes
                "alert_channels": ["email"],
                "data_retention_days": 30,
                "custom_metrics_limit": 5
            },
            MonitoringTier.STANDARD: {
                "max_dashboards": 5,
                "refresh_interval": 60,  # 1 minute
                "alert_channels": ["email", "slack"],
                "data_retention_days": 90,
                "custom_metrics_limit": 15
            },
            MonitoringTier.PREMIUM: {
                "max_dashboards": 10,
                "refresh_interval": 30,  # 30 seconds
                "alert_channels": ["email", "slack", "webhook"],
                "data_retention_days": 180,
                "custom_metrics_limit": 50
            },
            MonitoringTier.ENTERPRISE: {
                "max_dashboards": -1,  # Unlimited
                "refresh_interval": 10,  # 10 seconds
                "alert_channels": ["email", "slack", "webhook", "sms"],
                "data_retention_days": 365,
                "custom_metrics_limit": -1  # Unlimited
            }
        }

        # Active monitoring sessions
        self.active_sessions: Dict[str, Dict[str, Any]] = {}

    async def initialize(self) -> None:
        """Initialize the monitoring dashboard orchestrator."""
        try:
            logger.info(
                "Initializing Advanced Monitoring Dashboard Orchestrator")

            # Initialize component services
            self.real_time_service = RealTimeMetricsService(self.db)
            self.business_intelligence = BusinessIntelligenceService(self.db)
            self.alert_manager = AlertManagerService(self.db)
            self.dashboard_builder = DashboardBuilderService(self.db)

            await self.real_time_service.initialize()
            await self.business_intelligence.initialize()
            await self.alert_manager.initialize()
            await self.dashboard_builder.initialize()

            logger.info(
                "Advanced Monitoring Dashboard Orchestrator initialized successfully")

        except Exception as e:
            logger.error(f"Error initializing monitoring orchestrator: {e}")
            raise

    async def create_merchant_dashboard(
        self,
        tenant_id: uuid.UUID,
        dashboard_type: DashboardType,
        monitoring_tier: MonitoringTier,
        custom_config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a comprehensive monitoring dashboard for a merchant.

        Args:
            tenant_id: Merchant tenant identifier
            dashboard_type: Type of dashboard to create
            monitoring_tier: Merchant's monitoring tier level
            custom_config: Optional custom dashboard configuration

        Returns:
            Dashboard creation result with access information
        """
        tenant_key = str(tenant_id)

        try:
            logger.info(
                f"Creating {dashboard_type.value} dashboard for tenant {tenant_id}")

            # Validate tier capabilities
            tier_caps = self.tier_capabilities[monitoring_tier]
            current_dashboards = len(
                self.dashboard_configs.get(tenant_key, []))

            if tier_caps["max_dashboards"] != -1 and current_dashboards >= tier_caps["max_dashboards"]:
                raise ValueError(
                    f"Dashboard limit reached for {monitoring_tier.value} tier")

            # Build dashboard configuration
            dashboard_config = await self._build_dashboard_config(
                tenant_id, dashboard_type, monitoring_tier, custom_config
            )

            # Create dashboard widgets
            widgets = await self.dashboard_builder.create_dashboard_widgets(
                tenant_id, dashboard_type, monitoring_tier
            )

            # Set up real-time data feeds
            data_feeds = await self.real_time_service.setup_dashboard_feeds(
                tenant_id, dashboard_type, tier_caps["refresh_interval"]
            )

            # Configure alerts for this dashboard
            alert_config = await self.alert_manager.configure_dashboard_alerts(
                tenant_id, dashboard_type, tier_caps["alert_channels"]
            )

            # Start business intelligence processing
            bi_config = await self.business_intelligence.setup_dashboard_analytics(
                tenant_id, dashboard_type, tier_caps["data_retention_days"]
            )

            # Store dashboard configuration
            if tenant_key not in self.dashboard_configs:
                self.dashboard_configs[tenant_key] = []

            dashboard_config.widgets = widgets
            dashboard_config.alert_config = alert_config
            self.dashboard_configs[tenant_key].append(dashboard_config)

            # Create monitoring session
            session_id = str(uuid.uuid4())
            self.active_sessions[session_id] = {
                "tenant_id": tenant_key,
                "dashboard_type": dashboard_type.value,
                "monitoring_tier": monitoring_tier.value,
                "created_at": datetime.utcnow(),
                "last_accessed": datetime.utcnow(),
                "data_feeds": data_feeds,
                "alert_config": alert_config,
                "bi_config": bi_config
            }

            result = {
                "success": True,
                "session_id": session_id,
                "dashboard_id": f"{tenant_key}_{dashboard_type.value}",
                "dashboard_type": dashboard_type.value,
                "monitoring_tier": monitoring_tier.value,
                "widgets": widgets,
                "real_time_feeds": data_feeds,
                "alert_configuration": alert_config,
                "business_intelligence": bi_config,
                "tier_capabilities": tier_caps,
                "access_url": f"/dashboard/{session_id}",
                "created_at": datetime.utcnow().isoformat()
            }

            logger.info(
                f"Successfully created {dashboard_type.value} dashboard for tenant {tenant_id}")
            return result

        except Exception as e:
            logger.error(
                f"Error creating dashboard for tenant {tenant_id}: {e}")
            return {
                "success": False,
                "error": str(e),
                "tenant_id": tenant_key
            }

    async def get_dashboard_data(
        self,
        session_id: str,
        time_range: Optional[Tuple[datetime, datetime]] = None
    ) -> Dict[str, Any]:
        """
        Get real-time dashboard data for a monitoring session.

        Args:
            session_id: Dashboard session identifier
            time_range: Optional time range for historical data

        Returns:
            Complete dashboard data with metrics and insights
        """
        try:
            if session_id not in self.active_sessions:
                raise ValueError(f"Invalid session ID: {session_id}")

            session = self.active_sessions[session_id]
            tenant_id = uuid.UUID(session["tenant_id"])
            dashboard_type = DashboardType(session["dashboard_type"])

            # Update last accessed time
            session["last_accessed"] = datetime.utcnow()

            # Get real-time metrics
            real_time_data = await self.real_time_service.get_dashboard_metrics(
                tenant_id, dashboard_type, time_range
            )

            # Get business intelligence insights
            bi_insights = await self.business_intelligence.get_dashboard_insights(
                tenant_id, dashboard_type, time_range
            )

            # Get current alerts
            active_alerts = await self.alert_manager.get_active_alerts(tenant_id)

            # Get historical trends
            trends = await self.business_intelligence.get_trend_analysis(
                tenant_id, dashboard_type, time_range
            )

            dashboard_data = {
                "session_id": session_id,
                "tenant_id": session["tenant_id"],
                "dashboard_type": session["dashboard_type"],
                "last_updated": datetime.utcnow().isoformat(),
                "real_time_metrics": real_time_data,
                "business_insights": bi_insights,
                "active_alerts": active_alerts,
                "trend_analysis": trends,
                "session_info": {
                    "created_at": session["created_at"].isoformat(),
                    "last_accessed": session["last_accessed"].isoformat(),
                    "monitoring_tier": session["monitoring_tier"]
                }
            }

            return dashboard_data

        except Exception as e:
            logger.error(
                f"Error getting dashboard data for session {session_id}: {e}")
            return {"error": str(e), "session_id": session_id}

    async def update_dashboard_config(
        self,
        session_id: str,
        config_updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update dashboard configuration in real-time."""
        try:
            if session_id not in self.active_sessions:
                raise ValueError(f"Invalid session ID: {session_id}")

            session = self.active_sessions[session_id]
            tenant_id = uuid.UUID(session["tenant_id"])
            dashboard_type = DashboardType(session["dashboard_type"])

            # Update widgets if requested
            if "widgets" in config_updates:
                new_widgets = await self.dashboard_builder.update_dashboard_widgets(
                    tenant_id, dashboard_type, config_updates["widgets"]
                )
                session["widgets"] = new_widgets

            # Update alert configuration
            if "alerts" in config_updates:
                updated_alerts = await self.alert_manager.update_alert_config(
                    tenant_id, config_updates["alerts"]
                )
                session["alert_config"] = updated_alerts

            # Update real-time feed settings
            if "refresh_interval" in config_updates:
                await self.real_time_service.update_feed_interval(
                    tenant_id, config_updates["refresh_interval"]
                )

            return {
                "success": True,
                "session_id": session_id,
                "updated_at": datetime.utcnow().isoformat(),
                "applied_updates": list(config_updates.keys())
            }

        except Exception as e:
            logger.error(
                f"Error updating dashboard config for session {session_id}: {e}")
            return {"success": False, "error": str(e), "session_id": session_id}

    async def get_merchant_analytics_summary(self, tenant_id: uuid.UUID) -> Dict[str, Any]:
        """Get comprehensive analytics summary for a merchant."""
        try:
            tenant_key = str(tenant_id)

            # Get summary from all monitoring components
            real_time_summary = await self.real_time_service.get_merchant_summary(tenant_id)
            bi_summary = await self.business_intelligence.get_merchant_summary(tenant_id)
            alert_summary = await self.alert_manager.get_merchant_summary(tenant_id)

            # Get dashboard configurations
            dashboards = self.dashboard_configs.get(tenant_key, [])

            summary = {
                "tenant_id": tenant_key,
                "generated_at": datetime.utcnow().isoformat(),
                "active_dashboards": len(dashboards),
                "dashboard_types": [config.dashboard_type.value for config in dashboards],
                "monitoring_tier": dashboards[0].monitoring_tier.value if dashboards else "none",
                "real_time_metrics": real_time_summary,
                "business_intelligence": bi_summary,
                "alert_status": alert_summary,
                "active_sessions": len([
                    s for s in self.active_sessions.values()
                    if s["tenant_id"] == tenant_key
                ])
            }

            return summary

        except Exception as e:
            logger.error(
                f"Error getting analytics summary for tenant {tenant_id}: {e}")
            return {"error": str(e), "tenant_id": str(tenant_id)}

    async def _build_dashboard_config(
        self,
        tenant_id: uuid.UUID,
        dashboard_type: DashboardType,
        monitoring_tier: MonitoringTier,
        custom_config: Optional[Dict[str, Any]]
    ) -> DashboardConfig:
        """Build dashboard configuration based on type and tier."""
        tier_caps = self.tier_capabilities[monitoring_tier]

        # Default widgets based on dashboard type
        default_widgets = self._get_default_widgets(
            dashboard_type, monitoring_tier)

        # Custom metrics (within tier limits)
        custom_metrics = []
        if custom_config and "custom_metrics" in custom_config:
            limit = tier_caps["custom_metrics_limit"]
            if limit == -1:  # Unlimited
                custom_metrics = custom_config["custom_metrics"]
            else:
                custom_metrics = custom_config["custom_metrics"][:limit]

        config = DashboardConfig(
            tenant_id=str(tenant_id),
            dashboard_type=dashboard_type,
            monitoring_tier=monitoring_tier,
            widgets=default_widgets,
            refresh_interval_seconds=tier_caps["refresh_interval"],
            alert_config={
                "channels": tier_caps["alert_channels"],
                "thresholds": custom_config.get("alert_thresholds", {}) if custom_config else {}
            },
            custom_metrics=custom_metrics
        )

        return config

    def _get_default_widgets(self, dashboard_type: DashboardType, monitoring_tier: MonitoringTier) -> List[Dict[str, Any]]:
        """Get default widgets for a dashboard type and tier."""
        base_widgets = {
            DashboardType.EXECUTIVE: [
                {"type": "revenue_summary", "size": "large"},
                {"type": "order_volume", "size": "medium"},
                {"type": "conversion_rate", "size": "medium"},
                {"type": "top_products", "size": "medium"}
            ],
            DashboardType.OPERATIONS: [
                {"type": "system_health", "size": "large"},
                {"type": "performance_metrics", "size": "medium"},
                {"type": "error_rates", "size": "medium"},
                {"type": "response_times", "size": "medium"}
            ],
            DashboardType.SALES: [
                {"type": "sales_funnel", "size": "large"},
                {"type": "customer_acquisition", "size": "medium"},
                {"type": "product_performance", "size": "medium"},
                {"type": "geographic_sales", "size": "medium"}
            ],
            DashboardType.PERFORMANCE: [
                {"type": "page_load_times", "size": "large"},
                {"type": "database_performance", "size": "medium"},
                {"type": "cache_efficiency", "size": "medium"},
                {"type": "resource_utilization", "size": "medium"}
            ],
            DashboardType.CUSTOMER: [
                {"type": "customer_behavior", "size": "large"},
                {"type": "satisfaction_scores", "size": "medium"},
                {"type": "support_metrics", "size": "medium"},
                {"type": "retention_analysis", "size": "medium"}
            ],
            DashboardType.FINANCIAL: [
                {"type": "profit_loss", "size": "large"},
                {"type": "cash_flow", "size": "medium"},
                {"type": "expense_breakdown", "size": "medium"},
                {"type": "financial_forecasts", "size": "medium"}
            ]
        }

        widgets = base_widgets.get(dashboard_type, [])

        # Add tier-specific enhancements
        if monitoring_tier in [MonitoringTier.PREMIUM, MonitoringTier.ENTERPRISE]:
            widgets.extend([
                {"type": "predictive_analytics", "size": "medium"},
                {"type": "anomaly_detection", "size": "medium"}
            ])

        if monitoring_tier == MonitoringTier.ENTERPRISE:
            widgets.extend([
                {"type": "custom_reports", "size": "large"},
                {"type": "advanced_segmentation", "size": "medium"}
            ])

        return widgets

    async def cleanup_inactive_sessions(self) -> None:
        """Clean up inactive monitoring sessions."""
        cutoff_time = datetime.utcnow() - timedelta(hours=24)

        inactive_sessions = [
            session_id for session_id, session in self.active_sessions.items()
            if session["last_accessed"] < cutoff_time
        ]

        for session_id in inactive_sessions:
            try:
                await self._cleanup_session(session_id)
                del self.active_sessions[session_id]
                logger.info(f"Cleaned up inactive session: {session_id}")
            except Exception as e:
                logger.error(f"Error cleaning up session {session_id}: {e}")

    async def _cleanup_session(self, session_id: str) -> None:
        """Clean up resources for a specific session."""
        if session_id in self.active_sessions:
            session = self.active_sessions[session_id]
            tenant_id = uuid.UUID(session["tenant_id"])

            # Clean up real-time feeds
            await self.real_time_service.cleanup_dashboard_feeds(tenant_id, session_id)

            # Clean up temporary alert configurations
            await self.alert_manager.cleanup_session_alerts(tenant_id, session_id)

    async def get_monitoring_health(self) -> Dict[str, Any]:
        """Get overall monitoring system health status."""
        try:
            return {
                "status": "healthy",
                "active_sessions": len(self.active_sessions),
                "total_tenants_monitored": len(self.dashboard_configs),
                "component_status": {
                    "real_time_service": await self.real_time_service.get_health_status() if self.real_time_service else "not_initialized",
                    "business_intelligence": await self.business_intelligence.get_health_status() if self.business_intelligence else "not_initialized",
                    "alert_manager": await self.alert_manager.get_health_status() if self.alert_manager else "not_initialized",
                    "dashboard_builder": await self.dashboard_builder.get_health_status() if self.dashboard_builder else "not_initialized"
                },
                "last_checked": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"Error getting monitoring health: {e}")
            return {"status": "unhealthy", "error": str(e)}


async def get_monitoring_orchestrator(db: AsyncSession) -> AdvancedMonitoringOrchestrator:
    """Factory function to create and initialize monitoring orchestrator."""
    orchestrator = AdvancedMonitoringOrchestrator(db)
    await orchestrator.initialize()
    return orchestrator
