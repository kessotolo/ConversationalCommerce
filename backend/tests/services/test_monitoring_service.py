"""
Test suite for Track A Phase 3 Advanced Monitoring Dashboard Service.

Tests the monitoring orchestrator, real-time metrics, business intelligence,
alert manager, and dashboard builder for comprehensive monitoring in multi-tenant SaaS environment.
"""

import pytest
import uuid
from unittest.mock import AsyncMock, Mock, patch
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta

from app.services.monitoring.dashboard_orchestrator import (
    AdvancedMonitoringOrchestrator,
    DashboardType,
    MonitoringTier,
    DashboardConfig
)
from app.services.monitoring.real_time_metrics import RealTimeMetricsService
from app.services.monitoring.business_intelligence import BusinessIntelligenceService
from app.services.monitoring.alert_manager import AlertManagerService
from app.services.monitoring.dashboard_builder import DashboardBuilderService


class TestAdvancedMonitoringOrchestrator:
    """Test the main monitoring dashboard orchestrator."""

    @pytest.fixture
    async def orchestrator(self, mock_db_session: AsyncSession):
        """Create test monitoring orchestrator."""
        orchestrator = AdvancedMonitoringOrchestrator(mock_db_session)
        await orchestrator.initialize()
        yield orchestrator
        await orchestrator.cleanup()

    @pytest.fixture
    def sample_tenant_id(self):
        """Sample tenant ID for testing."""
        return uuid.uuid4()

    @pytest.mark.asyncio
    async def test_orchestrator_initialization(self, mock_db_session: AsyncSession):
        """Test orchestrator initializes all monitoring components successfully."""
        orchestrator = AdvancedMonitoringOrchestrator(mock_db_session)

        await orchestrator.initialize()

        # Verify all components are initialized
        assert orchestrator.metrics_service is not None
        assert orchestrator.business_intelligence is not None
        assert orchestrator.alert_manager is not None
        assert orchestrator.dashboard_builder is not None

        await orchestrator.cleanup()

    @pytest.mark.asyncio
    async def test_create_merchant_dashboard(
        self, orchestrator: AdvancedMonitoringOrchestrator, sample_tenant_id: uuid.UUID
    ):
        """Test creating comprehensive monitoring dashboard for merchant."""

        with patch.object(orchestrator.dashboard_builder, 'create_dashboard') as mock_create, \
                patch.object(orchestrator.metrics_service, 'setup_real_time_feed') as mock_feed:

            mock_create.return_value = {
                "dashboard_id": "dash_123",
                "widgets": ["revenue_chart", "traffic_monitor", "alert_panel"],
                "layout": "grid_3x2"
            }
            mock_feed.return_value = {
                "feed_id": "feed_456", "websocket_url": "ws://test"}

            result = await orchestrator.create_merchant_dashboard(
                sample_tenant_id,
                DashboardType.OVERVIEW,
                MonitoringTier.STANDARD
            )

            assert result.success is True
            assert result.dashboard_id == "dash_123"
            assert result.monitoring_tier == MonitoringTier.STANDARD
            assert "widgets" in result.config

            # Verify components were called correctly
            mock_create.assert_called_once()
            mock_feed.assert_called_once_with(sample_tenant_id, "dash_123")

    @pytest.mark.asyncio
    async def test_monitoring_tier_capabilities(
        self, orchestrator: AdvancedMonitoringOrchestrator, sample_tenant_id: uuid.UUID
    ):
        """Test different monitoring tiers have appropriate capabilities."""

        # Test Basic tier limitations
        with patch.object(orchestrator.dashboard_builder, 'create_dashboard') as mock_create:
            mock_create.return_value = {
                "dashboard_id": "basic_dash", "widgets": ["simple_metrics"]}

            basic_result = await orchestrator.create_merchant_dashboard(
                sample_tenant_id, DashboardType.OVERVIEW, MonitoringTier.BASIC
            )

            # Basic tier should have limited features
            tier_caps = orchestrator.tier_capabilities[MonitoringTier.BASIC]
            assert tier_caps["max_dashboards"] == 2
            assert tier_caps["real_time_updates"] is False

        # Test Enterprise tier capabilities
        with patch.object(orchestrator.dashboard_builder, 'create_dashboard') as mock_create:
            mock_create.return_value = {
                "dashboard_id": "enterprise_dash", "widgets": ["advanced_analytics"]}

            enterprise_result = await orchestrator.create_merchant_dashboard(
                sample_tenant_id, DashboardType.ANALYTICS, MonitoringTier.ENTERPRISE
            )

            # Enterprise tier should have full features
            tier_caps = orchestrator.tier_capabilities[MonitoringTier.ENTERPRISE]
            assert tier_caps["max_dashboards"] == 20
            assert tier_caps["real_time_updates"] is True
            assert tier_caps["custom_alerts"] is True

    @pytest.mark.asyncio
    async def test_real_time_dashboard_data(
        self, orchestrator: AdvancedMonitoringOrchestrator, sample_tenant_id: uuid.UUID
    ):
        """Test retrieving real-time dashboard data."""

        # Create mock monitoring session
        session_id = "session_123"
        orchestrator.monitoring_sessions[session_id] = {
            "tenant_id": sample_tenant_id,
            "dashboard_type": DashboardType.SALES,
            "monitoring_tier": MonitoringTier.PREMIUM.value,
            "created_at": datetime.utcnow(),
            "widgets": ["sales_chart", "conversion_funnel"]
        }

        with patch.object(orchestrator.metrics_service, 'get_real_time_data') as mock_metrics, \
                patch.object(orchestrator.business_intelligence, 'get_live_insights') as mock_bi:

            mock_metrics.return_value = {
                "current_visitors": 145,
                "revenue_today": 3250.50,
                "conversion_rate": 4.2
            }
            mock_bi.return_value = {
                "trending_products": ["Product A", "Product B"],
                "peak_hours": [14, 15, 16],
                "customer_segments": {"returning": 60, "new": 40}
            }

            result = await orchestrator.get_real_time_data(session_id)

            assert "real_time_metrics" in result
            assert "business_insights" in result
            assert "dashboard_config" in result
            assert result["real_time_metrics"]["current_visitors"] == 145
            assert "trending_products" in result["business_insights"]

    @pytest.mark.asyncio
    async def test_dashboard_limit_enforcement(
        self, orchestrator: AdvancedMonitoringOrchestrator, sample_tenant_id: uuid.UUID
    ):
        """Test monitoring tier dashboard limits are enforced."""

        # Mock existing dashboards at limit
        orchestrator.active_dashboards[sample_tenant_id] = [
            # Basic tier limit
            Mock(monitoring_tier=MonitoringTier.BASIC) for _ in range(2)
        ]

        with patch.object(orchestrator.dashboard_builder, 'create_dashboard'):
            result = await orchestrator.create_merchant_dashboard(
                sample_tenant_id, DashboardType.OVERVIEW, MonitoringTier.BASIC
            )

            # Should fail due to limit
            assert result.success is False
            assert "limit reached" in result.error.lower()

    @pytest.mark.asyncio
    async def test_monitoring_health_check(
        self, orchestrator: AdvancedMonitoringOrchestrator
    ):
        """Test monitoring system health status."""

        with patch.object(orchestrator.metrics_service, 'get_service_health') as mock_metrics_health, \
                patch.object(orchestrator.alert_manager, 'get_alert_system_health') as mock_alert_health:

            mock_metrics_health.return_value = {
                "status": "healthy", "response_time": 45}
            mock_alert_health.return_value = {
                "status": "healthy", "active_alerts": 2}

            health = await orchestrator.get_monitoring_health()

            assert health["overall_status"] == "healthy"
            assert "metrics_service" in health
            assert "alert_manager" in health
            assert health["active_sessions"] >= 0


class TestRealTimeMetricsService:
    """Test real-time metrics collection and streaming."""

    @pytest.fixture
    def metrics_service(self, mock_db_session: AsyncSession):
        """Create test real-time metrics service."""
        return RealTimeMetricsService(mock_db_session)

    @pytest.fixture
    def sample_tenant_id(self):
        """Sample tenant ID for testing."""
        return uuid.uuid4()

    @pytest.mark.asyncio
    async def test_real_time_data_collection(
        self, metrics_service: RealTimeMetricsService, sample_tenant_id: uuid.UUID
    ):
        """Test collecting real-time metrics for merchant."""

        with patch.object(metrics_service, '_query_live_metrics') as mock_query, \
                patch.object(metrics_service, '_get_visitor_analytics') as mock_visitors:

            mock_query.return_value = {
                "active_orders": 12,
                "revenue_today": 5420.75,
                "page_views": 2840
            }
            mock_visitors.return_value = {
                "current_visitors": 89,
                "bounce_rate": 23.5,
                "avg_session_duration": 180
            }

            result = await metrics_service.get_real_time_data(sample_tenant_id)

            assert "business_metrics" in result
            assert "visitor_analytics" in result
            assert "timestamp" in result
            assert result["business_metrics"]["active_orders"] == 12
            assert result["visitor_analytics"]["current_visitors"] == 89

    @pytest.mark.asyncio
    async def test_websocket_feed_setup(
        self, metrics_service: RealTimeMetricsService, sample_tenant_id: uuid.UUID
    ):
        """Test setting up WebSocket feed for real-time updates."""

        dashboard_id = "dash_456"

        with patch.object(metrics_service, '_create_websocket_connection') as mock_ws:
            mock_ws.return_value = {
                "connection_id": "ws_789",
                "url": "ws://localhost:8000/ws/metrics/dash_456"
            }

            result = await metrics_service.setup_real_time_feed(sample_tenant_id, dashboard_id)

            assert "feed_id" in result
            assert "websocket_url" in result
            assert dashboard_id in result["websocket_url"]

    @pytest.mark.asyncio
    async def test_metrics_aggregation(
        self, metrics_service: RealTimeMetricsService, sample_tenant_id: uuid.UUID
    ):
        """Test aggregating metrics over time periods."""

        with patch.object(metrics_service, '_query_time_series_data') as mock_query:
            # Mock hourly data for the last 24 hours
            mock_query.return_value = [
                {"hour": i, "revenue": 100 + (i * 10), "orders": 5 + i}
                for i in range(24)
            ]

            result = await metrics_service.get_aggregated_metrics(
                sample_tenant_id, "24h", "hourly"
            )

            assert "time_series" in result
            assert len(result["time_series"]) == 24
            assert "total_revenue" in result["summary"]
            assert "total_orders" in result["summary"]

    def test_metric_validation(self, metrics_service: RealTimeMetricsService):
        """Test validation of metric data."""

        # Valid metrics
        valid_metrics = {
            "revenue": 1250.50,
            "orders": 25,
            "visitors": 150
        }
        assert metrics_service._validate_metrics(valid_metrics) is True

        # Invalid metrics
        invalid_metrics = {
            "revenue": -100,  # Negative revenue
            "orders": "not_a_number",  # Wrong type
            "visitors": None  # Null value
        }
        assert metrics_service._validate_metrics(invalid_metrics) is False


class TestBusinessIntelligenceService:
    """Test business intelligence and analytics."""

    @pytest.fixture
    def bi_service(self, mock_db_session: AsyncSession):
        """Create test business intelligence service."""
        return BusinessIntelligenceService(mock_db_session)

    @pytest.fixture
    def sample_tenant_id(self):
        """Sample tenant ID for testing."""
        return uuid.uuid4()

    @pytest.mark.asyncio
    async def test_generate_business_insights(
        self, bi_service: BusinessIntelligenceService, sample_tenant_id: uuid.UUID
    ):
        """Test generating comprehensive business insights."""

        with patch.object(bi_service, '_analyze_sales_trends') as mock_sales, \
                patch.object(bi_service, '_analyze_customer_behavior') as mock_customers, \
                patch.object(bi_service, '_analyze_product_performance') as mock_products:

            mock_sales.return_value = {
                "trend": "increasing",
                "growth_rate": 15.5,
                "seasonal_patterns": ["weekend_spike", "holiday_boost"]
            }
            mock_customers.return_value = {
                "segments": {"premium": 20, "regular": 60, "new": 20},
                "lifetime_value": 450.75,
                "churn_risk": 12
            }
            mock_products.return_value = {
                "top_performers": ["Product A", "Product C"],
                "declining": ["Product B"],
                "recommendations": ["increase_inventory_A", "promote_product_C"]
            }

            result = await bi_service.generate_business_insights(sample_tenant_id)

            assert "sales_analysis" in result
            assert "customer_insights" in result
            assert "product_analytics" in result
            assert "recommendations" in result
            assert result["sales_analysis"]["trend"] == "increasing"
            assert len(result["product_analytics"]["top_performers"]) == 2

    @pytest.mark.asyncio
    async def test_predictive_analytics(
        self, bi_service: BusinessIntelligenceService, sample_tenant_id: uuid.UUID
    ):
        """Test predictive analytics capabilities."""

        with patch.object(bi_service, '_train_prediction_model') as mock_train, \
                patch.object(bi_service, '_generate_forecasts') as mock_forecast:

            mock_train.return_value = {
                "model_accuracy": 85.2, "features_used": 12}
            mock_forecast.return_value = {
                "revenue_7d": 18500.00,
                "orders_7d": 245,
                "confidence_interval": [16800, 20200]
            }

            result = await bi_service.generate_predictive_analytics(sample_tenant_id)

            assert "model_performance" in result
            assert "forecasts" in result
            assert "confidence_scores" in result
            assert result["forecasts"]["revenue_7d"] == 18500.00

    @pytest.mark.asyncio
    async def test_live_insights_generation(
        self, bi_service: BusinessIntelligenceService, sample_tenant_id: uuid.UUID
    ):
        """Test generating live insights for real-time dashboard."""

        with patch.object(bi_service, '_detect_anomalies') as mock_anomalies, \
                patch.object(bi_service, '_identify_opportunities') as mock_opportunities:

            mock_anomalies.return_value = [
                {"type": "traffic_spike", "severity": "medium", "time": "14:30"},
                {"type": "conversion_drop", "severity": "high", "time": "15:15"}
            ]
            mock_opportunities.return_value = [
                {"type": "upsell", "target": "premium_customers", "potential": 1250},
                {"type": "inventory", "product": "Product A", "action": "restock"}
            ]

            result = await bi_service.get_live_insights(sample_tenant_id)

            assert "anomalies" in result
            assert "opportunities" in result
            assert "alerts" in result
            assert len(result["anomalies"]) == 2
            assert result["anomalies"][1]["severity"] == "high"

    def test_insight_prioritization(self, bi_service: BusinessIntelligenceService):
        """Test prioritization of business insights."""

        insights = [
            {"type": "revenue_drop", "impact": "high", "urgency": "immediate"},
            {"type": "traffic_increase", "impact": "medium", "urgency": "low"},
            {"type": "conversion_optimization",
                "impact": "high", "urgency": "medium"}
        ]

        prioritized = bi_service._prioritize_insights(insights)

        # High impact, immediate urgency should be first
        assert prioritized[0]["type"] == "revenue_drop"
        assert prioritized[0]["priority_score"] > prioritized[1]["priority_score"]


class TestAlertManagerService:
    """Test alert management and notification system."""

    @pytest.fixture
    def alert_manager(self, mock_db_session: AsyncSession):
        """Create test alert manager service."""
        return AlertManagerService(mock_db_session)

    @pytest.fixture
    def sample_tenant_id(self):
        """Sample tenant ID for testing."""
        return uuid.uuid4()

    @pytest.mark.asyncio
    async def test_create_alert_rule(
        self, alert_manager: AlertManagerService, sample_tenant_id: uuid.UUID
    ):
        """Test creating monitoring alert rules."""

        rule_config = {
            "name": "Revenue Drop Alert",
            "metric": "revenue_hourly",
            "condition": "less_than",
            "threshold": 500,
            "time_window": "1h",
            "severity": "high"
        }

        with patch.object(alert_manager, '_validate_rule_config') as mock_validate, \
                patch.object(alert_manager, '_store_alert_rule') as mock_store:

            mock_validate.return_value = True
            mock_store.return_value = {
                "rule_id": "rule_789", "status": "active"}

            result = await alert_manager.create_alert_rule(sample_tenant_id, rule_config)

            assert result["success"] is True
            assert result["rule_id"] == "rule_789"
            mock_validate.assert_called_once_with(rule_config)
            mock_store.assert_called_once()

    @pytest.mark.asyncio
    async def test_trigger_alert(
        self, alert_manager: AlertManagerService, sample_tenant_id: uuid.UUID
    ):
        """Test triggering alerts when conditions are met."""

        alert_data = {
            "rule_id": "rule_789",
            "metric_value": 350,  # Below threshold of 500
            "threshold": 500,
            "condition": "less_than",
            "severity": "high"
        }

        with patch.object(alert_manager, '_send_notifications') as mock_notify, \
                patch.object(alert_manager, '_log_alert_event') as mock_log:

            mock_notify.return_value = {
                "notifications_sent": 2, "channels": ["email", "slack"]}
            mock_log.return_value = {"event_id": "event_456"}

            result = await alert_manager.trigger_alert(sample_tenant_id, alert_data)

            assert result["alert_triggered"] is True
            assert result["severity"] == "high"
            assert result["notifications_sent"] == 2

            mock_notify.assert_called_once()
            mock_log.assert_called_once()

    @pytest.mark.asyncio
    async def test_multi_channel_notifications(
        self, alert_manager: AlertManagerService, sample_tenant_id: uuid.UUID
    ):
        """Test sending notifications through multiple channels."""

        alert_config = {
            "severity": "critical",
            "message": "Server response time exceeded 5 seconds",
            "channels": ["email", "sms", "slack", "webhook"]
        }

        with patch.object(alert_manager, '_send_email_notification') as mock_email, \
                patch.object(alert_manager, '_send_sms_notification') as mock_sms, \
                patch.object(alert_manager, '_send_slack_notification') as mock_slack, \
                patch.object(alert_manager, '_send_webhook_notification') as mock_webhook:

            mock_email.return_value = {
                "status": "sent", "recipient": "admin@merchant.com"}
            mock_sms.return_value = {
                "status": "sent", "recipient": "+1234567890"}
            mock_slack.return_value = {"status": "sent", "channel": "#alerts"}
            mock_webhook.return_value = {
                "status": "sent", "endpoint": "https://api.merchant.com/alerts"}

            result = await alert_manager._send_multi_channel_notifications(
                sample_tenant_id, alert_config
            )

            assert result["total_sent"] == 4
            assert all(channel["status"] ==
                       "sent" for channel in result["results"])

            # Verify all channels were called
            mock_email.assert_called_once()
            mock_sms.assert_called_once()
            mock_slack.assert_called_once()
            mock_webhook.assert_called_once()

    @pytest.mark.asyncio
    async def test_alert_escalation(
        self, alert_manager: AlertManagerService, sample_tenant_id: uuid.UUID
    ):
        """Test alert escalation when issues persist."""

        alert_id = "alert_123"

        # Mock an existing alert that hasn't been acknowledged
        alert_manager.active_alerts[alert_id] = {
            "tenant_id": sample_tenant_id,
            "severity": "high",
            "created_at": datetime.utcnow() - timedelta(minutes=30),
            "acknowledged": False,
            "escalation_level": 0
        }

        with patch.object(alert_manager, '_escalate_to_management') as mock_escalate:
            mock_escalate.return_value = {"escalated": True, "level": 1}

            result = await alert_manager.check_escalation(alert_id)

            assert result["escalation_needed"] is True
            assert result["new_level"] == 1
            mock_escalate.assert_called_once()

    def test_alert_deduplication(self, alert_manager: AlertManagerService):
        """Test deduplication of similar alerts."""

        alert1 = {
            "metric": "response_time",
            "condition": "greater_than",
            "threshold": 2000,
            "tenant_id": "tenant_123"
        }

        alert2 = {
            "metric": "response_time",
            "condition": "greater_than",
            "threshold": 2000,
            "tenant_id": "tenant_123"
        }

        # Should be identified as duplicate
        is_duplicate = alert_manager._is_duplicate_alert(alert1, alert2)
        assert is_duplicate is True

        # Different metric should not be duplicate
        alert3 = alert2.copy()
        alert3["metric"] = "error_rate"
        is_duplicate = alert_manager._is_duplicate_alert(alert1, alert3)
        assert is_duplicate is False


class TestDashboardBuilderService:
    """Test dashboard construction and widget management."""

    @pytest.fixture
    def dashboard_builder(self):
        """Create test dashboard builder service."""
        return DashboardBuilderService()

    @pytest.fixture
    def sample_tenant_id(self):
        """Sample tenant ID for testing."""
        return uuid.uuid4()

    def test_create_dashboard_layout(
        self, dashboard_builder: DashboardBuilderService, sample_tenant_id: uuid.UUID
    ):
        """Test creating dashboard layout based on type and tier."""

        result = dashboard_builder.create_dashboard(
            sample_tenant_id,
            DashboardType.ANALYTICS,
            MonitoringTier.PREMIUM
        )

        assert result["dashboard_id"] is not None
        assert result["dashboard_type"] == DashboardType.ANALYTICS.value
        assert result["monitoring_tier"] == MonitoringTier.PREMIUM.value
        assert "widgets" in result
        assert "layout" in result
        assert len(result["widgets"]) > 0

    def test_widget_configuration(
        self, dashboard_builder: DashboardBuilderService, sample_tenant_id: uuid.UUID
    ):
        """Test widget configuration for different dashboard types."""

        # Overview dashboard widgets
        overview_widgets = dashboard_builder._get_dashboard_widget_configs(
            DashboardType.OVERVIEW.value, MonitoringTier.STANDARD.value
        )

        assert any(widget["type"] ==
                   "revenue_summary" for widget in overview_widgets)
        assert any(widget["type"] ==
                   "visitor_count" for widget in overview_widgets)

        # Analytics dashboard widgets
        analytics_widgets = dashboard_builder._get_dashboard_widget_configs(
            DashboardType.ANALYTICS.value, MonitoringTier.ENTERPRISE.value
        )

        assert any(widget["type"] ==
                   "advanced_charts" for widget in analytics_widgets)
        assert any(
            widget["type"] == "predictive_analytics" for widget in analytics_widgets)

    def test_custom_widget_creation(
        self, dashboard_builder: DashboardBuilderService, sample_tenant_id: uuid.UUID
    ):
        """Test creating custom widgets for enterprise tier."""

        custom_config = {
            "widget_type": "custom_kpi",
            "title": "Merchant Specific KPI",
            "metrics": ["custom_conversion", "custom_revenue"],
            "visualization": "line_chart",
            "refresh_interval": 30
        }

        widget = dashboard_builder.create_custom_widget(
            sample_tenant_id, custom_config)

        assert widget["widget_id"] is not None
        assert widget["type"] == "custom_kpi"
        assert widget["title"] == "Merchant Specific KPI"
        assert widget["config"]["refresh_interval"] == 30

    def test_responsive_layout_generation(
        self, dashboard_builder: DashboardBuilderService, sample_tenant_id: uuid.UUID
    ):
        """Test generating responsive layouts for different screen sizes."""

        widgets = [
            {"id": "widget1", "size": "large", "priority": 1},
            {"id": "widget2", "size": "medium", "priority": 2},
            {"id": "widget3", "size": "small", "priority": 3},
            {"id": "widget4", "size": "medium", "priority": 4}
        ]

        # Desktop layout
        desktop_layout = dashboard_builder._generate_responsive_layout(
            widgets, "desktop")
        assert desktop_layout["columns"] == 4
        assert len(desktop_layout["grid"]) > 0

        # Mobile layout
        mobile_layout = dashboard_builder._generate_responsive_layout(
            widgets, "mobile")
        assert mobile_layout["columns"] == 1
        assert all(row["width"] == "100%" for row in mobile_layout["grid"])

    def test_widget_permission_filtering(
        self, dashboard_builder: DashboardBuilderService, sample_tenant_id: uuid.UUID
    ):
        """Test filtering widgets based on monitoring tier permissions."""

        all_widgets = [
            {"type": "basic_metrics", "tier_required": "basic"},
            {"type": "advanced_analytics", "tier_required": "premium"},
            {"type": "predictive_insights", "tier_required": "enterprise"},
            {"type": "custom_reports", "tier_required": "enterprise"}
        ]

        # Standard tier should only get basic and some premium features
        standard_widgets = dashboard_builder._filter_widgets_by_tier(
            all_widgets, MonitoringTier.STANDARD
        )

        assert len(standard_widgets) == 1  # Only basic_metrics
        assert standard_widgets[0]["type"] == "basic_metrics"

        # Enterprise tier should get all widgets
        enterprise_widgets = dashboard_builder._filter_widgets_by_tier(
            all_widgets, MonitoringTier.ENTERPRISE
        )

        assert len(enterprise_widgets) == 4  # All widgets


# Integration test for complete monitoring workflow
class TestMonitoringIntegration:
    """Integration tests for complete monitoring dashboard workflow."""

    @pytest.mark.asyncio
    async def test_end_to_end_monitoring_setup(self, mock_db_session: AsyncSession):
        """Test complete end-to-end monitoring dashboard setup."""

        sample_tenant_id = uuid.uuid4()

        # Initialize orchestrator
        orchestrator = AdvancedMonitoringOrchestrator(mock_db_session)
        await orchestrator.initialize()

        try:
            # Mock all monitoring components
            with patch.object(orchestrator.dashboard_builder, 'create_dashboard') as mock_dashboard, \
                    patch.object(orchestrator.metrics_service, 'setup_real_time_feed') as mock_feed, \
                    patch.object(orchestrator.alert_manager, 'create_default_alerts') as mock_alerts:

                # Setup successful responses
                mock_dashboard.return_value = {
                    "dashboard_id": "dash_integration_test",
                    "widgets": ["revenue_chart", "visitor_count", "alert_panel"],
                    "layout": "grid_2x2"
                }
                mock_feed.return_value = {
                    "feed_id": "feed_integration",
                    "websocket_url": "ws://test/metrics"
                }
                mock_alerts.return_value = {"rules_created": 5}

                # Create dashboard
                result = await orchestrator.create_merchant_dashboard(
                    sample_tenant_id,
                    DashboardType.OVERVIEW,
                    MonitoringTier.PREMIUM
                )

                # Verify successful creation
                assert result.success is True
                assert result.dashboard_id == "dash_integration_test"
                assert result.monitoring_tier == MonitoringTier.PREMIUM

                # Get real-time data
                session_id = f"session_{result.dashboard_id}"
                orchestrator.monitoring_sessions[session_id] = {
                    "tenant_id": sample_tenant_id,
                    "dashboard_type": DashboardType.OVERVIEW,
                    "created_at": datetime.utcnow()
                }

                with patch.object(orchestrator.metrics_service, 'get_real_time_data') as mock_realtime:
                    mock_realtime.return_value = {
                        "current_visitors": 125,
                        "revenue_today": 4500.00,
                        "orders_count": 28
                    }

                    real_time_data = await orchestrator.get_real_time_data(session_id)

                    assert "real_time_metrics" in real_time_data
                    assert real_time_data["real_time_metrics"]["current_visitors"] == 125

                # Test monitoring health
                with patch.object(orchestrator.metrics_service, 'get_service_health') as mock_health:
                    mock_health.return_value = {
                        "status": "healthy", "uptime": "99.9%"}

                    health = await orchestrator.get_monitoring_health()
                    assert health["overall_status"] == "healthy"

        finally:
            await orchestrator.cleanup()

    @pytest.mark.asyncio
    async def test_monitoring_performance_under_load(self, mock_db_session: AsyncSession):
        """Test monitoring system performance under simulated load."""

        orchestrator = AdvancedMonitoringOrchestrator(mock_db_session)
        await orchestrator.initialize()

        try:
            # Simulate multiple concurrent dashboard requests
            tenant_ids = [uuid.uuid4() for _ in range(10)]

            with patch.object(orchestrator.dashboard_builder, 'create_dashboard') as mock_dashboard, \
                    patch.object(orchestrator.metrics_service, 'setup_real_time_feed') as mock_feed:

                mock_dashboard.return_value = {
                    "dashboard_id": "load_test", "widgets": []}
                mock_feed.return_value = {"feed_id": "load_feed"}

                # Create dashboards concurrently
                import asyncio
                tasks = [
                    orchestrator.create_merchant_dashboard(
                        tenant_id, DashboardType.OVERVIEW, MonitoringTier.STANDARD
                    )
                    for tenant_id in tenant_ids
                ]

                results = await asyncio.gather(*tasks, return_exceptions=True)

                # Verify all requests completed successfully
                successful_results = [
                    r for r in results if not isinstance(r, Exception)]
                assert len(successful_results) == 10

                # Verify proper tenant isolation
                active_sessions = len(orchestrator.monitoring_sessions)
                assert active_sessions == 10

        finally:
            await orchestrator.cleanup()


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v"])
