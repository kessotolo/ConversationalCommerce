import logging
import re
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.core.enforcement.violation_service import violation_service
from app.core.notifications.notification_service import (
    Notification,
    NotificationChannel,
    NotificationPriority,
    notification_service,
)
from app.models.behavior_analysis import BehaviorPattern, PatternDetection

logger = logging.getLogger(__name__)


class BehaviorAnalysisService:
    def __init__(self):
        self.pattern_cache = {}  # Cache for pattern evaluation results

    async def analyze_behavior(
        self,
        db: Session,
        tenant_id: str,
        user_id: Optional[str],
        activity_data: Dict[str, Any],
    ) -> List[PatternDetection]:
        """Analyze behavior against patterns and return detections"""
        # Get applicable patterns
        patterns = self._get_patterns(
            db, tenant_id, activity_data.get("type", "user"))

        detections = []
        for pattern in patterns:
            if not pattern.enabled:
                continue

            # Check cooldown
            if self._is_in_cooldown(db, pattern.id, user_id):
                continue

            # Evaluate pattern
            detection = await self._evaluate_pattern(
                db, pattern, user_id, activity_data
            )
            if detection:
                detections.append(detection)

                # Create notification if pattern is triggered
                await self._create_notification(detection)

        return detections

    def _get_patterns(
        self, db: Session, tenant_id: str, pattern_type: str
    ) -> List[BehaviorPattern]:
        """Get applicable patterns for the tenant and type"""
        return (
            db.query(BehaviorPattern)
            .filter(
                BehaviorPattern.tenant_id == tenant_id,
                BehaviorPattern.pattern_type == pattern_type,
                BehaviorPattern.enabled,
            )
            .all()
        )

    def _is_in_cooldown(
        self, db: Session, pattern_id: str, user_id: Optional[str]
    ) -> bool:
        """Check if pattern is in cooldown period"""
        pattern = db.query(BehaviorPattern).get(pattern_id)
        if not pattern:
            return False

        # Get last detection
        last_detection = (
            db.query(PatternDetection)
            .filter(
                PatternDetection.pattern_id == pattern_id,
                PatternDetection.user_id == user_id,
            )
            .order_by(PatternDetection.created_at.desc())
            .first()
        )

        if not last_detection:
            return False

        # Check if cooldown period has passed
        cooldown_end = last_detection.created_at + timedelta(
            minutes=pattern.cooldown_minutes
        )
        return datetime.utcnow() < cooldown_end

    async def _evaluate_pattern(
        self,
        db: Session,
        pattern: BehaviorPattern,
        user_id: Optional[str],
        activity_data: Dict[str, Any],
    ) -> Optional[PatternDetection]:
        """Evaluate a pattern against activity data"""
        try:
            # Calculate confidence score
            confidence_score = self._calculate_confidence(
                pattern.conditions, activity_data
            )

            # Check if pattern is triggered
            if confidence_score >= pattern.threshold:
                # Collect evidence
                evidence = await self._collect_evidence(
                    db, pattern.tenant_id, user_id, activity_data
                )

                # Create detection
                detection = PatternDetection(
                    tenant_id=pattern.tenant_id,
                    pattern_id=pattern.id,
                    user_id=user_id,
                    detection_type=pattern.pattern_type,
                    confidence_score=confidence_score,
                    evidence=evidence,
                    status="pending",
                )
                db.add(detection)
                db.commit()
                db.refresh(detection)

                # --- Violation escalation integration ---
                if user_id:
                    reason = f"Pattern '{pattern.name}' triggered (confidence: {confidence_score:.2f})"
                    violation_service.escalate_violation(
                        db=db,
                        tenant_id=pattern.tenant_id,
                        user_id=user_id,
                        detection_id=detection.id,
                        type_=pattern.pattern_type,
                        severity=pattern.severity,
                        reason=reason,
                        details={
                            "pattern_id": pattern.id,
                            "pattern_name": pattern.name,
                            "confidence_score": confidence_score,
                            "evidence": evidence,
                        },
                    )
                # --- End integration ---

                return detection

        except Exception as e:
            logger.error(f"Error evaluating pattern {pattern.id}: {str(e)}")
        return None

    def _calculate_confidence(
        self, conditions: Dict[str, Any], activity_data: Dict[str, Any]
    ) -> float:
        """Calculate confidence score for pattern matching"""
        try:
            total_score = 0.0
            matched_conditions = 0

            for condition in conditions:
                if self._evaluate_condition(condition, activity_data):
                    total_score += condition.get("weight", 1.0)
                    matched_conditions += 1

            if matched_conditions == 0:
                return 0.0

            return total_score / len(conditions)

        except Exception as e:
            logger.error(f"Error calculating confidence: {str(e)}")
            return 0.0

    def _evaluate_condition(
        self, condition: Dict[str, Any], activity_data: Dict[str, Any]
    ) -> bool:
        """Evaluate a single condition against activity data"""
        try:
            field = condition.get("field")
            operator = condition.get("operator")
            value = condition.get("value")

            if not all([field, operator, value]):
                return False

            data_value = activity_data.get(field)
            if data_value is None:
                return False

            if operator == "equals":
                return data_value == value
            elif operator == "contains":
                return value in data_value
            elif operator == "greater_than":
                return data_value > value
            elif operator == "less_than":
                return data_value < value
            elif operator == "matches":
                return bool(re.match(value, str(data_value)))
            elif operator == "in":
                return data_value in value

            return False

        except Exception as e:
            logger.error(f"Error evaluating condition: {str(e)}")
            return False

    async def _collect_evidence(
        self,
        db: Session,
        tenant_id: str,
        user_id: Optional[str],
        activity_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Collect evidence for pattern detection"""
        evidence = {
            "activity": activity_data,
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": user_id,
            "sources": [],
        }

        # Add system metrics
        # FUTURE: Implement system metrics collection for behavior analysis. See issue #134 for tracking.
        system_metrics = await self._get_system_metrics()
        evidence["sources"].append({"type": "system", "data": system_metrics})

        # Add user history if applicable
        if user_id:
            user_history = self._get_user_history(db, tenant_id, user_id)
            evidence["sources"].append(
                {"type": "user_history", "data": user_history})

        return evidence

    async def _get_system_metrics(self) -> Dict[str, Any]:
        """Get current system metrics for behavior analysis context"""
        try:
            import psutil
            import asyncio
            from app.core.monitoring.system_metrics import SystemMetricsCollector

            # Initialize metrics collector
            metrics_collector = SystemMetricsCollector()

            # Collect real-time system metrics
            metrics = await metrics_collector.collect_current_metrics()

            return {
                "cpu_usage": metrics.get("cpu_percent", 0.0),
                "memory_usage": metrics.get("memory_percent", 0.0),
                "active_connections": metrics.get("active_connections", 0),
                "disk_usage": metrics.get("disk_percent", 0.0),
                "network_io": metrics.get("network_io", {}),
                "load_average": metrics.get("load_average", []),
                "timestamp": datetime.utcnow().isoformat(),
            }

        except ImportError:
            # Fallback if psutil is not available
            logger.warning(
                "psutil not available, using fallback system metrics")
            return {
                "cpu_usage": 0.0,
                "memory_usage": 0.0,
                "active_connections": 0,
                "disk_usage": 0.0,
                "network_io": {"bytes_sent": 0, "bytes_recv": 0},
                "load_average": [0.0, 0.0, 0.0],
                "timestamp": datetime.utcnow().isoformat(),
                "note": "Fallback metrics - psutil not available"
            }
        except Exception as e:
            logger.error(f"Error collecting system metrics: {str(e)}")
            return {
                "cpu_usage": 0.0,
                "memory_usage": 0.0,
                "active_connections": 0,
                "disk_usage": 0.0,
                "network_io": {"bytes_sent": 0, "bytes_recv": 0},
                "load_average": [0.0, 0.0, 0.0],
                "timestamp": datetime.utcnow().isoformat(),
                "error": str(e)
            }

    def _get_user_history(
        self, db: Session, tenant_id: str, user_id: str
    ) -> Dict[str, Any]:
        """Get user activity history"""
        # Get recent detections
        recent_detections = (
            db.query(PatternDetection)
            .filter(
                PatternDetection.tenant_id == tenant_id,
                PatternDetection.user_id == user_id,
            )
            .order_by(PatternDetection.created_at.desc())
            .limit(10)
            .all()
        )

        return {
            "recent_detections": [
                {
                    "id": d.id,
                    "pattern_id": d.pattern_id,
                    "confidence_score": d.confidence_score,
                    "created_at": d.created_at.isoformat(),
                }
                for d in recent_detections
            ]
        }

    async def _create_notification(self, detection: PatternDetection) -> None:
        """Create notification for pattern detection"""
        notification = Notification(
            id=str(uuid.uuid4()),
            tenant_id=detection.tenant_id,
            user_id=detection.user_id or "system",
            title=f"Behavior Pattern Detected: {detection.pattern.name}",
            message=self._format_notification_message(detection),
            priority=self._get_notification_priority(detection),
            channels=[NotificationChannel.IN_APP],
            metadata={
                "detection_id": detection.id,
                "pattern_id": detection.pattern_id,
                "confidence_score": detection.confidence_score,
                "detection_type": detection.detection_type,
            },
        )
        await notification_service.send_notification(notification)

    def _format_notification_message(self, detection: PatternDetection) -> str:
        """Format notification message for pattern detection"""
        return f"""
Behavior Pattern Detected:
- Pattern: {detection.pattern.name}
- Type: {detection.detection_type}
- Confidence: {detection.confidence_score:.2f}
- Status: {detection.status}

Evidence Summary:
{detection.evidence}

Please review this detection and take appropriate action.
"""

    def _get_notification_priority(
        self, detection: PatternDetection
    ) -> NotificationPriority:
        """Determine notification priority based on pattern severity"""
        severity_map = {
            "low": NotificationPriority.LOW,
            "medium": NotificationPriority.MEDIUM,
            "high": NotificationPriority.HIGH,
            "critical": NotificationPriority.URGENT,
        }
        return severity_map.get(detection.pattern.severity, NotificationPriority.MEDIUM)


# Create global instance
behavior_analysis_service = BehaviorAnalysisService()
