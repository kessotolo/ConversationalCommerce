import logging
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import uuid4

from pydantic import BaseModel, Field

from backend.app.core.notifications.notification_service import (
    Notification,
    NotificationChannel,
    NotificationPriority,
    notification_service,
)
from backend.app.db.async_session import get_async_session_local

logger = logging.getLogger(__name__)


class RuleSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RuleCondition(BaseModel):
    field: str
    operator: str
    value: Any
    duration_seconds: Optional[int] = None


class Rule(BaseModel):
    id: str
    name: str
    description: str
    tenant_id: str
    severity: RuleSeverity
    conditions: List[RuleCondition]
    enabled: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RulesEngine:
    def __init__(self):
        self.rules: Dict[str, List[Rule]] = {}  # tenant_id -> rules
        # rule_id -> last_evaluation
        self.rule_evaluations: Dict[str, Dict[str, datetime]] = {}
        # rule_id -> last_notification
        self.notification_cooldowns: Dict[str, datetime] = {}

    def add_rule(self, rule: Rule):
        """Add a new rule to the engine"""
        if rule.tenant_id not in self.rules:
            self.rules[rule.tenant_id] = []
        self.rules[rule.tenant_id].append(rule)
        logger.info(f"Added rule {rule.id} for tenant {rule.tenant_id}")

    def remove_rule(self, rule_id: str, tenant_id: str):
        """Remove a rule from the engine"""
        if tenant_id in self.rules:
            self.rules[tenant_id] = [
                r for r in self.rules[tenant_id] if r.id != rule_id
            ]
            logger.info(f"Removed rule {rule_id} for tenant {tenant_id}")

    async def evaluate_activity(self, activity: Dict[str, Any]) -> List[Rule]:
        """Evaluate an activity against all rules for the tenant"""
        tenant_id = activity.get("tenant_id")
        if not tenant_id or tenant_id not in self.rules:
            return []

        triggered_rules = []
        for rule in self.rules[tenant_id]:
            if not rule.enabled:
                continue

            if self._evaluate_rule(rule, activity):
                triggered_rules.append(rule)
                logger.info(
                    f"Rule {rule.id} triggered for activity {activity.get('id')}"
                )

                # Send notification if cooldown period has passed
                await self._handle_rule_notification(rule, activity)

        return triggered_rules

    def _evaluate_rule(self, rule: Rule, activity: Dict[str, Any]) -> bool:
        """Evaluate a single rule against an activity"""
        try:
            for condition in rule.conditions:
                if not self._evaluate_condition(condition, activity):
                    return False
            return True
        except Exception as e:
            logger.error(f"Error evaluating rule {rule.id}: {str(e)}")
            return False

    def _evaluate_condition(
        self, condition: RuleCondition, activity: Dict[str, Any]
    ) -> bool:
        """Evaluate a single condition against an activity"""
        try:
            field_value = activity.get(condition.field)
            if field_value is None:
                return False

            if condition.duration_seconds:
                # For time-based conditions, check historical data
                return self._evaluate_time_condition(condition, activity)
            else:
                # For immediate conditions
                return self._evaluate_operator(
                    condition.operator, field_value, condition.value
                )
        except Exception as e:
            logger.error(f"Error evaluating condition: {str(e)}")
            return False

    def _evaluate_operator(
        self, operator: str, field_value: Any, condition_value: Any
    ) -> bool:
        """Evaluate a single operator"""
        operators = {
            "equals": lambda x, y: x == y,
            "not_equals": lambda x, y: x != y,
            "contains": lambda x, y: y in x if isinstance(x, (str, list)) else False,
            "greater_than": lambda x, y: x > y,
            "less_than": lambda x, y: x < y,
            "in": lambda x, y: x in y if isinstance(y, (list, tuple)) else False,
            "not_in": lambda x, y: (
                x not in y if isinstance(y, (list, tuple)) else False
            ),
        }

        if operator not in operators:
            logger.error(f"Unknown operator: {operator}")
            return False

        return operators[operator](field_value, condition_value)

    def _evaluate_time_condition(
        self, condition: RuleCondition, activity: Dict[str, Any]
    ) -> bool:
        """Evaluate a time-based condition by checking historical data"""
        try:
            db = get_async_session_local()
            try:
                # Get activities within the time window
                start_time = datetime.now(timezone.utc) - timedelta(
                    seconds=condition.duration_seconds
                )
                activities = await db.execute(
                    """
                    SELECT * FROM audit_log
                    WHERE tenant_id = :tenant_id
                    AND timestamp >= :start_time
                    AND timestamp <= :end_time
                    """,
                    {
                        "tenant_id": activity["tenant_id"],
                        "start_time": start_time,
                        "end_time": datetime.now(timezone.utc),
                    },
                )

                # Convert to dict for evaluation
                activity_dicts = [a.__dict__ for a in activities]

                # Count matching activities
                matches = sum(
                    1
                    for a in activity_dicts
                    if self._evaluate_operator(
                        condition.operator, a.get(condition.field), condition.value
                    )
                )

                return matches > 0
            finally:
                await db.close()
        except Exception as e:
            logger.error(f"Error evaluating time condition: {str(e)}")
            return False

    def get_rules(self, tenant_id: str) -> List[Rule]:
        """Get all rules for a tenant"""
        return self.rules.get(tenant_id, [])

    def update_rule(self, rule: Rule):
        """Update an existing rule"""
        if rule.tenant_id in self.rules:
            for i, r in enumerate(self.rules[rule.tenant_id]):
                if r.id == rule.id:
                    self.rules[rule.tenant_id][i] = rule
                    logger.info(f"Updated rule {rule.id} for tenant {rule.tenant_id}")
                    break

    async def _handle_rule_notification(
        self, rule: Rule, activity: Dict[str, Any]
    ) -> None:
        """Handle notification for a triggered rule"""
        # Check cooldown period
        last_notification = self.notification_cooldowns.get(rule.id)
        if last_notification:
            cooldown_period = self._get_cooldown_period(rule.severity)
            if datetime.now(timezone.utc) - last_notification < cooldown_period:
                return

        # Create notification
        notification = Notification(
            id=str(uuid4()),
            tenant_id=rule.tenant_id,
            user_id=activity.get("user_id", "system"),
            title=f"Rule Triggered: {rule.name}",
            message=self._format_notification_message(rule, activity),
            priority=self._get_notification_priority(rule.severity),
            channels=self._get_notification_channels(rule.severity),
            metadata={
                "rule_id": rule.id,
                "rule_name": rule.name,
                "activity_id": activity.get("id"),
                "resource_type": activity.get("resource_type"),
                "resource_id": activity.get("resource_id"),
                "action": activity.get("action"),
                "timestamp": activity.get("timestamp"),
            },
        )

        # Send notification
        success = await notification_service.send_notification(notification)
        if success:
            self.notification_cooldowns[rule.id] = datetime.now(timezone.utc)

        # For demonstration, send alerts for critical events
        if rule.severity in [RuleSeverity.CRITICAL, RuleSeverity.HIGH]:
            send_alert_via_email(
                subject=f"ALERT: {rule.name}",
                message=f"Rule triggered: {rule.name} for activity {activity.get('id')}",
            )
            send_alert_via_whatsapp(
                number="+1234567890",  # Replace with real recipient
                message=f"ALERT: {rule.name} triggered for activity {activity.get('id')}",
            )
        # In production, replace stubs with real integrations

    def _get_cooldown_period(self, severity: RuleSeverity) -> timedelta:
        """Get notification cooldown period based on severity"""
        cooldowns = {
            RuleSeverity.LOW: timedelta(hours=24),
            RuleSeverity.MEDIUM: timedelta(hours=12),
            RuleSeverity.HIGH: timedelta(hours=6),
            RuleSeverity.CRITICAL: timedelta(hours=1),
        }
        return cooldowns.get(severity, timedelta(hours=24))

    def _get_notification_priority(
        self, severity: RuleSeverity
    ) -> NotificationPriority:
        """Map rule severity to notification priority"""
        priority_map = {
            RuleSeverity.LOW: NotificationPriority.LOW,
            RuleSeverity.MEDIUM: NotificationPriority.MEDIUM,
            RuleSeverity.HIGH: NotificationPriority.HIGH,
            RuleSeverity.CRITICAL: NotificationPriority.URGENT,
        }
        return priority_map.get(severity, NotificationPriority.MEDIUM)

    def _get_notification_channels(
        self, severity: RuleSeverity
    ) -> List[NotificationChannel]:
        """Get notification channels based on severity"""
        if severity == RuleSeverity.CRITICAL:
            return [
                NotificationChannel.EMAIL,
                NotificationChannel.SMS,
                NotificationChannel.IN_APP,
            ]
        elif severity == RuleSeverity.HIGH:
            return [NotificationChannel.EMAIL, NotificationChannel.IN_APP]
        else:
            return [NotificationChannel.IN_APP]

    def _format_notification_message(self, rule: Rule, activity: Dict[str, Any]) -> str:
        """Format notification message"""
        return f"""
Rule '{rule.name}' has been triggered.

Activity Details:
- Action: {activity.get('action')}
- Resource: {activity.get('resource_type')}/{activity.get('resource_id')}
- User: {activity.get('user_id')}
- Time: {activity.get('timestamp')}

Rule Description:
{rule.description}

Please review this activity and take appropriate action if necessary.
"""


def send_alert_via_email(subject, message):
    # Stub: Replace with real email integration
    print(f"[ALERT][EMAIL] {subject}: {message}")


def send_alert_via_whatsapp(number, message):
    # Stub: Replace with real WhatsApp integration
    print(f"[ALERT][WHATSAPP] {number}: {message}")


# Create global instance
rules_engine = RulesEngine()

# Example async DB access in monitoring


async def update_rule_async(*args, db=None):
    """
    Async function for updating rules in the monitoring rules engine.
    This should be implemented to update or restore rule state as needed.
    Args:
        *args: Additional arguments for rule update.
        db: Optional database session or sessionmaker.
    Raises:
        NotImplementedError: This function is a placeholder and must be implemented.
    """
    raise NotImplementedError("update_rule_async must be implemented.")


# Monitoring/alerting integration stubs
try:
    import sentry_sdk

    sentry_sdk.init(dsn="YOUR_SENTRY_DSN")
except ImportError:
    pass

# Prometheus stub (to be implemented)
# from prometheus_client import start_http_server, Counter
# start_http_server(8000)
# order_failures = Counter('order_failures', 'Number of failed order creations')

# In _handle_rule_notification or relevant alerting logic, add comments for alerting on payment failures, webhook errors, and order creation failures.
