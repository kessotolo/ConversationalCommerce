import logging
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from backend.app.models.user import User
from backend.app.models.violation import Violation

logger = logging.getLogger(__name__)

# Escalation policy: warning -> temp_ban -> perm_ban
ESCALATION_ORDER = ["warning", "temp_ban", "perm_ban"]
ESCALATION_THRESHOLDS = {"warning": 1, "temp_ban": 2, "perm_ban": 3}
TEMP_BAN_DURATION_MINUTES = 60 * 24  # 1 day


class ViolationService:
    def escalate_violation(
        self,
        db: Session,
        tenant_id: str,
        user_id: str,
        detection_id: str,
        type_: str,
        severity: str,
        reason: str,
        details: dict = None,
    ):
        """Escalate enforcement action based on violation history."""
        # Count recent violations
        recent_violations = (
            db.query(Violation)
            .filter(
                Violation.tenant_id == tenant_id,
                Violation.user_id == user_id,
                Violation.status == "active",
            )
            .order_by(Violation.created_at.desc())
            .all()
        )

        # Determine escalation level
        action = "warning"
        if len(recent_violations) >= ESCALATION_THRESHOLDS["perm_ban"]:
            action = "perm_ban"
        elif len(recent_violations) >= ESCALATION_THRESHOLDS["temp_ban"]:
            action = "temp_ban"

        # Set end_at for temp_ban
        end_at = None
        if action == "temp_ban":
            end_at = datetime.utcnow() + timedelta(minutes=TEMP_BAN_DURATION_MINUTES)

        # Create violation record
        violation = Violation(
            tenant_id=tenant_id,
            user_id=user_id,
            detection_id=detection_id,
            type=type_,
            severity=severity,
            action=action,
            status="active",
            reason=reason,
            details=details or {},
            start_at=datetime.utcnow(),
            end_at=end_at,
        )
        db.add(violation)
        db.commit()
        db.refresh(violation)

        # Apply enforcement
        self.apply_enforcement(db, user_id, action, end_at)
        logger.info(
            f"Enforcement applied: {action} for user {user_id} (tenant {tenant_id})"
        )
        return violation

    def apply_enforcement(self, db: Session, user_id: str, action: str, end_at=None):
        """Apply enforcement action to the user account."""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            logger.warning(f"User {user_id} not found for enforcement.")
            return
        if action == "warning":
            # No account change, just log/warn
            pass
        elif action == "temp_ban":
            user.is_active = False
            user.ban_end_at = end_at
        elif action == "perm_ban":
            user.is_active = False
            user.ban_end_at = None
        db.add(user)
        db.commit()

    def resolve_violation(
        self, db: Session, violation_id: str, resolution_notes: str = None
    ):
        violation = db.query(Violation).filter(Violation.id == violation_id).first()
        if not violation:
            return None
        violation.status = "resolved"
        violation.end_at = datetime.utcnow()
        if resolution_notes:
            violation.details = violation.details or {}
            violation.details["resolution_notes"] = resolution_notes
        db.add(violation)
        db.commit()
        db.refresh(violation)
        return violation


violation_service = ViolationService()
