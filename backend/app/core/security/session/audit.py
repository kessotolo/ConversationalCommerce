"""
Session Audit Logger

This module handles audit logging for session-related events.
"""

from datetime import datetime, timezone
from typing import Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.models.admin.admin_user import AdminUser
from app.models.audit.audit_log import AuditLog


class SessionAuditor:
    """Handles audit logging for session events."""

    async def log_session_event(
        self,
        db: AsyncSession,
        user_id: str,
        event_type: str,
        details: Dict[str, Any]
    ) -> None:
        """Log session-related events."""
        try:
            audit_log = AuditLog(
                user_id=user_id,
                timestamp=datetime.now(timezone.utc),
                action=f"session_{event_type}",
                status="success",
                resource_type="session",
                resource_id=details.get("session_id"),
                details=details
            )

            db.add(audit_log)
            await db.commit()

        except Exception as e:
            logger.error(f"Error logging session event: {str(e)}")

    async def log_security_event(
        self,
        db: AsyncSession,
        user_id: str,
        event_type: str,
        details: Dict[str, Any]
    ) -> None:
        """Log security-related events."""
        try:
            audit_log = AuditLog(
                user_id=user_id,
                timestamp=datetime.now(timezone.utc),
                action=f"security_{event_type}",
                status="warning",
                resource_type="security",
                resource_id=details.get("session_id"),
                details=details
            )

            db.add(audit_log)
            await db.commit()

        except Exception as e:
            logger.error(f"Error logging security event: {str(e)}")

    async def update_admin_user_session(
        self,
        db: AsyncSession,
        user_id: str,
        session_id: str,
        login_time: datetime,
        ip_address: str
    ) -> None:
        """Update admin user record with session info."""
        try:
            admin_user = await db.get(AdminUser, user_id)
            if admin_user:
                admin_user.last_login_at = login_time
                admin_user.last_login_ip = ip_address
                admin_user.last_activity_at = login_time
                await db.commit()
        except Exception as e:
            logger.error(f"Error updating admin user session: {str(e)}")

    async def update_admin_user_activity(
        self,
        db: AsyncSession,
        user_id: str,
        activity_time: datetime
    ) -> None:
        """Update admin user last activity."""
        try:
            admin_user = await db.get(AdminUser, user_id)
            if admin_user:
                admin_user.last_activity_at = activity_time
                await db.commit()
        except Exception as e:
            logger.error(f"Error updating admin user activity: {str(e)}")
