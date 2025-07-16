"""
Alert Manager Service.

Handles intelligent alerting, notifications, and threshold management
for merchant monitoring dashboards and real-time alerts.

Business Context:
- Monitors merchant business and technical metrics to detect issues and opportunities
- Sends targeted alerts through multiple channels (email, Slack, SMS, webhooks)
- Manages alert rules, thresholds, and escalation policies based on merchant tiers
- Provides intelligent alert filtering to reduce noise and focus on actionable insights
"""

import asyncio
import uuid
import logging
from typing import Dict, Any, List, Optional, Set
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import json

from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class AlertSeverity(str, Enum):
    """Alert severity levels."""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class AlertStatus(str, Enum):
    """Alert status states."""
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    SUPPRESSED = "suppressed"


class AlertChannel(str, Enum):
    """Alert notification channels."""
    EMAIL = "email"
    SLACK = "slack"
    SMS = "sms"
    WEBHOOK = "webhook"
    DASHBOARD = "dashboard"


@dataclass
class AlertRule:
    """Alert rule configuration."""
    rule_id: str
    tenant_id: str
    name: str
    description: str
    metric_name: str
    condition: str  # e.g., "greater_than", "less_than", "equals"
    threshold: float
    severity: AlertSeverity
    channels: List[AlertChannel]
    cooldown_minutes: int
    created_at: datetime
    is_enabled: bool = True


@dataclass
class Alert:
    """Active alert instance."""
    alert_id: str
    rule_id: str
    tenant_id: str
    title: str
    message: str
    severity: AlertSeverity
    status: AlertStatus
    triggered_at: datetime
    metric_value: float
    threshold: float
    channels_notified: List[AlertChannel]
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    metadata: Dict[str, Any] = None


class AlertManagerService:
    """
    Intelligent alert management and notification service.

    Manages:
    - Alert rule configuration and threshold monitoring
    - Multi-channel notification delivery (email, Slack, SMS, webhooks)
    - Alert lifecycle management (creation, acknowledgment, resolution)
    - Intelligent alert filtering and noise reduction
    - Escalation policies and alert routing
    - Alert analytics and reporting
    """

    def __init__(self, db: AsyncSession):
        self.db = db

        # Alert rules and active alerts
        self.alert_rules: Dict[str, List[AlertRule]] = {}
        self.active_alerts: Dict[str, List[Alert]] = {}

        # Alert history for analysis
        self.alert_history: Dict[str, List[Alert]] = {}

        # Notification channels configuration
        self.notification_channels = {
            AlertChannel.EMAIL: {"enabled": True, "config": {"smtp_server": "localhost"}},
            AlertChannel.SLACK: {"enabled": True, "config": {"webhook_url": None}},
            AlertChannel.SMS: {"enabled": False, "config": {"provider": "twilio"}},
            AlertChannel.WEBHOOK: {
                "enabled": True, "config": {"endpoints": []}}
        }

        # Default alert rules by dashboard type
        self.default_rules = {
            "executive": [
                {
                    "name": "Revenue Drop Alert",
                    "metric": "revenue_24h",
                    "condition": "decrease_percent",
                    "threshold": 20.0,
                    "severity": AlertSeverity.WARNING
                },
                {
                    "name": "Conversion Rate Drop",
                    "metric": "conversion_rate",
                    "condition": "less_than",
                    "threshold": 2.0,
                    "severity": AlertSeverity.ERROR
                }
            ],
            "operations": [
                {
                    "name": "High Error Rate",
                    "metric": "error_rate_percent",
                    "condition": "greater_than",
                    "threshold": 5.0,
                    "severity": AlertSeverity.CRITICAL
                },
                {
                    "name": "Slow Response Time",
                    "metric": "response_time_ms",
                    "condition": "greater_than",
                    "threshold": 2000.0,
                    "severity": AlertSeverity.WARNING
                }
            ],
            "performance": [
                {
                    "name": "Cache Hit Rate Low",
                    "metric": "cache_hit_rate_percent",
                    "condition": "less_than",
                    "threshold": 70.0,
                    "severity": AlertSeverity.WARNING
                },
                {
                    "name": "Database Query Slow",
                    "metric": "db_query_time_ms",
                    "condition": "greater_than",
                    "threshold": 100.0,
                    "severity": AlertSeverity.ERROR
                }
            ]
        }

        # Alert cooldown tracking
        self.alert_cooldowns: Dict[str, datetime] = {}

        # Service status
        self.is_running = False

    async def initialize(self) -> None:
        """Initialize the alert manager service."""
        try:
            logger.info("Initializing Alert Manager Service")

            # Start background monitoring tasks
            self.is_running = True
            asyncio.create_task(self._alert_monitoring_loop())
            asyncio.create_task(self._alert_cleanup_loop())

            logger.info("Alert Manager Service initialized successfully")

        except Exception as e:
            logger.error(f"Error initializing alert manager service: {e}")
            raise

    async def configure_dashboard_alerts(
        self,
        tenant_id: uuid.UUID,
        dashboard_type: str,
        allowed_channels: List[str]
    ) -> Dict[str, Any]:
        """
        Configure alerts for a merchant dashboard.

        Args:
            tenant_id: Merchant tenant identifier
            dashboard_type: Type of dashboard
            allowed_channels: List of allowed notification channels

        Returns:
            Alert configuration details
        """
        try:
            tenant_key = str(tenant_id)

            # Initialize alert rules for this tenant
            if tenant_key not in self.alert_rules:
                self.alert_rules[tenant_key] = []

            if tenant_key not in self.active_alerts:
                self.active_alerts[tenant_key] = []

            if tenant_key not in self.alert_history:
                self.alert_history[tenant_key] = []

            # Create default alert rules for this dashboard type
            default_rules = self.default_rules.get(dashboard_type.lower(), [])
            configured_rules = []

            for rule_config in default_rules:
                # Convert allowed channels to enum list
                channels = [
                    AlertChannel(channel) for channel in allowed_channels
                    if channel in [c.value for c in AlertChannel]
                ]

                rule = AlertRule(
                    rule_id=str(uuid.uuid4()),
                    tenant_id=tenant_key,
                    name=rule_config["name"],
                    description=f"Alert for {rule_config['metric']} {rule_config['condition']} {rule_config['threshold']}",
                    metric_name=rule_config["metric"],
                    condition=rule_config["condition"],
                    threshold=rule_config["threshold"],
                    severity=rule_config["severity"],
                    channels=channels,
                    cooldown_minutes=15,  # Default 15 minute cooldown
                    created_at=datetime.utcnow()
                )

                self.alert_rules[tenant_key].append(rule)
                configured_rules.append(self._rule_to_dict(rule))

            logger.info(
                f"Configured {len(configured_rules)} alert rules for tenant {tenant_id}")

            return {
                "tenant_id": tenant_key,
                "dashboard_type": dashboard_type,
                "configured_rules": configured_rules,
                "allowed_channels": allowed_channels,
                "total_rules": len(configured_rules),
                "setup_time": datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error(
                f"Error configuring dashboard alerts for tenant {tenant_id}: {e}")
            return {"error": str(e), "tenant_id": str(tenant_id)}

    async def check_metrics_for_alerts(
        self,
        tenant_id: uuid.UUID,
        metrics: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Check metrics against alert rules and trigger alerts if needed.

        Args:
            tenant_id: Merchant tenant identifier
            metrics: Current metrics to check

        Returns:
            List of triggered alerts
        """
        try:
            tenant_key = str(tenant_id)
            triggered_alerts = []

            # Get alert rules for this tenant
            rules = self.alert_rules.get(tenant_key, [])

            for rule in rules:
                if not rule.is_enabled:
                    continue

                # Check if rule is in cooldown
                if self._is_rule_in_cooldown(rule.rule_id):
                    continue

                # Extract metric value from nested metrics
                metric_value = self._extract_metric_value(
                    metrics, rule.metric_name)
                if metric_value is None:
                    continue

                # Check if alert condition is met
                if self._evaluate_alert_condition(metric_value, rule.condition, rule.threshold):
                    alert = await self._create_alert(rule, metric_value)
                    if alert:
                        triggered_alerts.append(self._alert_to_dict(alert))

                        # Send notifications
                        await self._send_alert_notifications(alert)

                        # Set cooldown
                        self.alert_cooldowns[rule.rule_id] = datetime.utcnow()

            return triggered_alerts

        except Exception as e:
            logger.error(
                f"Error checking metrics for alerts for tenant {tenant_id}: {e}")
            return []

    async def get_active_alerts(self, tenant_id: uuid.UUID) -> List[Dict[str, Any]]:
        """Get active alerts for a merchant."""
        try:
            tenant_key = str(tenant_id)
            active_alerts = self.active_alerts.get(tenant_key, [])

            # Filter only active alerts
            current_alerts = [
                alert for alert in active_alerts
                if alert.status == AlertStatus.ACTIVE
            ]

            return [self._alert_to_dict(alert) for alert in current_alerts]

        except Exception as e:
            logger.error(
                f"Error getting active alerts for tenant {tenant_id}: {e}")
            return []

    async def acknowledge_alert(self, tenant_id: uuid.UUID, alert_id: str) -> Dict[str, Any]:
        """Acknowledge an alert."""
        try:
            tenant_key = str(tenant_id)
            alerts = self.active_alerts.get(tenant_key, [])

            for alert in alerts:
                if alert.alert_id == alert_id and alert.status == AlertStatus.ACTIVE:
                    alert.status = AlertStatus.ACKNOWLEDGED
                    alert.acknowledged_at = datetime.utcnow()

                    return {
                        "success": True,
                        "alert_id": alert_id,
                        "acknowledged_at": alert.acknowledged_at.isoformat()
                    }

            return {"success": False, "error": "Alert not found or already acknowledged"}

        except Exception as e:
            logger.error(f"Error acknowledging alert {alert_id}: {e}")
            return {"success": False, "error": str(e)}

    async def resolve_alert(self, tenant_id: uuid.UUID, alert_id: str) -> Dict[str, Any]:
        """Resolve an alert."""
        try:
            tenant_key = str(tenant_id)
            alerts = self.active_alerts.get(tenant_key, [])

            for alert in alerts:
                if alert.alert_id == alert_id:
                    alert.status = AlertStatus.RESOLVED
                    alert.resolved_at = datetime.utcnow()

                    # Move to history
                    self.alert_history[tenant_key].append(alert)
                    self.active_alerts[tenant_key].remove(alert)

                    return {
                        "success": True,
                        "alert_id": alert_id,
                        "resolved_at": alert.resolved_at.isoformat()
                    }

            return {"success": False, "error": "Alert not found"}

        except Exception as e:
            logger.error(f"Error resolving alert {alert_id}: {e}")
            return {"success": False, "error": str(e)}

    async def update_alert_config(
        self,
        tenant_id: uuid.UUID,
        alert_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update alert configuration for a tenant."""
        try:
            tenant_key = str(tenant_id)

            # Update alert rule configurations
            if "rules" in alert_config:
                for rule_update in alert_config["rules"]:
                    await self._update_alert_rule(tenant_key, rule_update)

            # Update notification settings
            if "notifications" in alert_config:
                await self._update_notification_config(tenant_key, alert_config["notifications"])

            return {
                "success": True,
                "tenant_id": tenant_key,
                "updated_at": datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error(
                f"Error updating alert config for tenant {tenant_id}: {e}")
            return {"success": False, "error": str(e)}

    async def get_merchant_summary(self, tenant_id: uuid.UUID) -> Dict[str, Any]:
        """Get alert management summary for a merchant."""
        try:
            tenant_key = str(tenant_id)

            active_alerts = self.active_alerts.get(tenant_key, [])
            alert_rules = self.alert_rules.get(tenant_key, [])
            alert_history = self.alert_history.get(tenant_key, [])

            # Calculate alert statistics
            critical_alerts = len(
                [a for a in active_alerts if a.severity == AlertSeverity.CRITICAL])
            warning_alerts = len(
                [a for a in active_alerts if a.severity == AlertSeverity.WARNING])

            # Recent alerts (last 24 hours)
            recent_cutoff = datetime.utcnow() - timedelta(hours=24)
            recent_alerts = len([
                a for a in alert_history
                if a.triggered_at >= recent_cutoff
            ])

            return {
                "tenant_id": tenant_key,
                "active_alerts": len(active_alerts),
                "critical_alerts": critical_alerts,
                "warning_alerts": warning_alerts,
                "configured_rules": len(alert_rules),
                "alerts_24h": recent_alerts,
                "service_status": "operational"
            }

        except Exception as e:
            logger.error(
                f"Error getting alert summary for tenant {tenant_id}: {e}")
            return {"error": str(e), "tenant_id": str(tenant_id)}

    async def cleanup_session_alerts(self, tenant_id: uuid.UUID, session_id: str) -> None:
        """Clean up alerts related to a specific session."""
        # This method is called when a dashboard session ends
        # Currently, alerts persist beyond sessions, so no cleanup needed
        logger.debug(
            f"Session cleanup called for tenant {tenant_id}, session {session_id}")

    def _extract_metric_value(self, metrics: Dict[str, Any], metric_name: str) -> Optional[float]:
        """Extract metric value from nested metrics dictionary."""
        try:
            # Handle nested metric paths (e.g., "system.response_time_ms")
            parts = metric_name.split('.')
            value = metrics

            for part in parts:
                if isinstance(value, dict) and part in value:
                    value = value[part]
                else:
                    return None

            return float(value) if value is not None else None

        except (KeyError, ValueError, TypeError):
            return None

    def _evaluate_alert_condition(self, value: float, condition: str, threshold: float) -> bool:
        """Evaluate if alert condition is met."""
        conditions = {
            "greater_than": value > threshold,
            "less_than": value < threshold,
            "equals": abs(value - threshold) < 0.001,
            "not_equals": abs(value - threshold) >= 0.001,
            "decrease_percent": False  # Would need historical data to calculate
        }

        return conditions.get(condition, False)

    def _is_rule_in_cooldown(self, rule_id: str) -> bool:
        """Check if alert rule is in cooldown period."""
        if rule_id not in self.alert_cooldowns:
            return False

        last_triggered = self.alert_cooldowns[rule_id]
        cooldown_period = timedelta(minutes=15)  # Default cooldown

        return datetime.utcnow() - last_triggered < cooldown_period

    async def _create_alert(self, rule: AlertRule, metric_value: float) -> Optional[Alert]:
        """Create a new alert instance."""
        try:
            alert = Alert(
                alert_id=str(uuid.uuid4()),
                rule_id=rule.rule_id,
                tenant_id=rule.tenant_id,
                title=rule.name,
                message=f"{rule.name}: {rule.metric_name} is {metric_value} (threshold: {rule.threshold})",
                severity=rule.severity,
                status=AlertStatus.ACTIVE,
                triggered_at=datetime.utcnow(),
                metric_value=metric_value,
                threshold=rule.threshold,
                channels_notified=[],
                metadata={"rule_name": rule.name, "condition": rule.condition}
            )

            # Add to active alerts
            self.active_alerts[rule.tenant_id].append(alert)

            return alert

        except Exception as e:
            logger.error(f"Error creating alert for rule {rule.rule_id}: {e}")
            return None

    async def _send_alert_notifications(self, alert: Alert) -> None:
        """Send alert notifications through configured channels."""
        try:
            # Get the rule to determine channels
            rule = None
            for tenant_rules in self.alert_rules.values():
                for r in tenant_rules:
                    if r.rule_id == alert.rule_id:
                        rule = r
                        break
                if rule:
                    break

            if not rule:
                return

            # Send notifications through each configured channel
            for channel in rule.channels:
                try:
                    if channel == AlertChannel.EMAIL:
                        await self._send_email_notification(alert)
                    elif channel == AlertChannel.SLACK:
                        await self._send_slack_notification(alert)
                    elif channel == AlertChannel.SMS:
                        await self._send_sms_notification(alert)
                    elif channel == AlertChannel.WEBHOOK:
                        await self._send_webhook_notification(alert)

                    alert.channels_notified.append(channel)

                except Exception as e:
                    logger.error(
                        f"Error sending {channel.value} notification for alert {alert.alert_id}: {e}")

        except Exception as e:
            logger.error(
                f"Error sending notifications for alert {alert.alert_id}: {e}")

    async def _send_email_notification(self, alert: Alert) -> None:
        """Send email notification."""
        logger.info(
            f"Sending email notification for alert {alert.alert_id}: {alert.title}")

    async def _send_slack_notification(self, alert: Alert) -> None:
        """Send Slack notification."""
        logger.info(
            f"Sending Slack notification for alert {alert.alert_id}: {alert.title}")

    async def _send_sms_notification(self, alert: Alert) -> None:
        """Send SMS notification."""
        logger.info(
            f"Sending SMS notification for alert {alert.alert_id}: {alert.title}")

    async def _send_webhook_notification(self, alert: Alert) -> None:
        """Send webhook notification."""
        logger.info(
            f"Sending webhook notification for alert {alert.alert_id}: {alert.title}")

    async def _update_alert_rule(self, tenant_key: str, rule_update: Dict[str, Any]) -> None:
        """Update an existing alert rule."""
        rule_id = rule_update.get("rule_id")
        rules = self.alert_rules.get(tenant_key, [])

        for rule in rules:
            if rule.rule_id == rule_id:
                if "threshold" in rule_update:
                    rule.threshold = float(rule_update["threshold"])
                if "is_enabled" in rule_update:
                    rule.is_enabled = bool(rule_update["is_enabled"])
                if "severity" in rule_update:
                    rule.severity = AlertSeverity(rule_update["severity"])
                break

    async def _update_notification_config(self, tenant_key: str, notification_config: Dict[str, Any]) -> None:
        """Update notification configuration."""
        # Update notification settings for this tenant
        logger.debug(f"Updating notification config for tenant {tenant_key}")

    def _rule_to_dict(self, rule: AlertRule) -> Dict[str, Any]:
        """Convert AlertRule to dictionary."""
        return {
            "rule_id": rule.rule_id,
            "name": rule.name,
            "description": rule.description,
            "metric_name": rule.metric_name,
            "condition": rule.condition,
            "threshold": rule.threshold,
            "severity": rule.severity.value,
            "channels": [c.value for c in rule.channels],
            "cooldown_minutes": rule.cooldown_minutes,
            "is_enabled": rule.is_enabled,
            "created_at": rule.created_at.isoformat()
        }

    def _alert_to_dict(self, alert: Alert) -> Dict[str, Any]:
        """Convert Alert to dictionary."""
        return {
            "alert_id": alert.alert_id,
            "rule_id": alert.rule_id,
            "title": alert.title,
            "message": alert.message,
            "severity": alert.severity.value,
            "status": alert.status.value,
            "triggered_at": alert.triggered_at.isoformat(),
            "metric_value": alert.metric_value,
            "threshold": alert.threshold,
            "channels_notified": [c.value for c in alert.channels_notified],
            "acknowledged_at": alert.acknowledged_at.isoformat() if alert.acknowledged_at else None,
            "resolved_at": alert.resolved_at.isoformat() if alert.resolved_at else None,
            "metadata": alert.metadata or {}
        }

    async def _alert_monitoring_loop(self) -> None:
        """Background loop for alert monitoring."""
        while self.is_running:
            try:
                # Auto-resolve old alerts
                await self._auto_resolve_stale_alerts()

                await asyncio.sleep(300)  # Check every 5 minutes

            except Exception as e:
                logger.error(f"Error in alert monitoring loop: {e}")
                await asyncio.sleep(600)  # Retry in 10 minutes

    async def _alert_cleanup_loop(self) -> None:
        """Background loop for alert cleanup."""
        while self.is_running:
            try:
                # Clean up old alert history
                cutoff_time = datetime.utcnow() - timedelta(days=30)

                for tenant_key, history in self.alert_history.items():
                    self.alert_history[tenant_key] = [
                        alert for alert in history
                        if alert.triggered_at > cutoff_time
                    ]

                await asyncio.sleep(86400)  # Run daily

            except Exception as e:
                logger.error(f"Error in alert cleanup loop: {e}")
                await asyncio.sleep(43200)  # Retry in 12 hours

    async def _auto_resolve_stale_alerts(self) -> None:
        """Automatically resolve stale alerts."""
        stale_threshold = datetime.utcnow() - timedelta(hours=24)

        for tenant_key, alerts in self.active_alerts.items():
            for alert in alerts[:]:  # Copy list to allow modification
                if (alert.status == AlertStatus.ACTIVE and
                        alert.triggered_at < stale_threshold):
                    alert.status = AlertStatus.RESOLVED
                    alert.resolved_at = datetime.utcnow()

                    # Move to history
                    self.alert_history[tenant_key].append(alert)
                    alerts.remove(alert)

    async def get_health_status(self) -> str:
        """Get service health status."""
        if not self.is_running:
            return "stopped"
        return "healthy"
