"""
Session Validator

This module handles session validation logic and security checks.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.logging import logger
from .models import SessionInfo, SessionConfig, SessionValidationResult
from .storage import SessionStorage
from .audit import SessionAuditor


class SessionValidator:
    """Handles session validation and security checks."""

    def __init__(self, config: SessionConfig, storage: SessionStorage, auditor: SessionAuditor):
        self.config = config
        self.storage = storage
        self.auditor = auditor

    async def validate_session(
        self,
        db: AsyncSession,
        session_id: str,
        ip_address: str,
        user_agent: str
    ) -> SessionValidationResult:
        """
        Validate and refresh a SuperAdmin session.

        Returns SessionValidationResult with validation outcome.
        """
        try:
            # Get session from storage
            session_info = await self.storage.get_session(session_id)
            if not session_info:
                return SessionValidationResult(
                    is_valid=False,
                    reason="session_not_found"
                )

            # Check if session is expired
            now = datetime.now(timezone.utc)
            if now > session_info.expires_at:
                await self._invalidate_session(db, session_info, "expired")
                return SessionValidationResult(
                    is_valid=False,
                    reason="session_expired"
                )

            # Check if session is still active
            if not session_info.is_active:
                return SessionValidationResult(
                    is_valid=False,
                    reason="session_inactive"
                )

            # Validate IP address (optional strict checking)
            if not self._is_ip_change_allowed(session_info.ip_address, ip_address):
                await self._invalidate_session(db, session_info, "ip_change_detected")
                await self.auditor.log_security_event(
                    db, session_info.user_id, "suspicious_ip_change",
                    {
                        "session_id": session_id,
                        "original_ip": session_info.ip_address,
                        "new_ip": ip_address
                    }
                )
                return SessionValidationResult(
                    is_valid=False,
                    reason="ip_change_detected"
                )

            # Update last activity
            session_info.last_activity = now

            # Extend session if needed (sliding window)
            if self._should_extend_session(session_info):
                timeout_minutes = self._get_timeout_for_security_level(
                    session_info.security_level)
                session_info.expires_at = now + \
                    timedelta(minutes=timeout_minutes)

            # Store updated session
            await self.storage.store_session(session_info)

            return SessionValidationResult(
                is_valid=True,
                session_info=session_info
            )

        except Exception as e:
            logger.error(f"Error validating session {session_id}: {str(e)}")
            return SessionValidationResult(
                is_valid=False,
                reason="validation_error"
            )

    async def _invalidate_session(
        self,
        db: AsyncSession,
        session_info: SessionInfo,
        reason: str
    ) -> bool:
        """Invalidate a session."""
        try:
            # Remove from storage
            success = await self.storage.delete_session(
                session_info.session_id,
                session_info.user_id
            )

            if success:
                # Log invalidation
                await self.auditor.log_session_event(
                    db, session_info.user_id, "session_invalidated",
                    {
                        "session_id": session_info.session_id,
                        "reason": reason
                    }
                )

            return success

        except Exception as e:
            logger.error(
                f"Error invalidating session {session_info.session_id}: {str(e)}")
            return False

    def _is_ip_change_allowed(self, original_ip: str, new_ip: str) -> bool:
        """Check if IP change is allowed (could be enhanced with geolocation)."""
        # For now, allow IP changes (could be made stricter)
        return True

    def _should_extend_session(self, session_info: SessionInfo) -> bool:
        """Check if session should be extended (sliding window)."""
        now = datetime.now(timezone.utc)
        time_until_expiry = session_info.expires_at - now
        timeout_minutes = self._get_timeout_for_security_level(
            session_info.security_level)

        # Extend if less than 50% of timeout remaining
        return time_until_expiry < timedelta(minutes=timeout_minutes * 0.5)

    def _get_timeout_for_security_level(self, security_level: str) -> int:
        """Get timeout minutes for security level."""
        timeouts = {
            "standard": self.config.default_timeout_minutes,
            "elevated": self.config.elevated_timeout_minutes,
            "high": self.config.high_security_timeout_minutes
        }
        return timeouts.get(security_level, self.config.default_timeout_minutes)

    def determine_security_level(self, org_role: str, ip_address: str) -> str:
        """Determine security level based on role and context."""
        # This could be enhanced with more sophisticated logic
        if org_role == "owner":
            return "high"
        elif org_role == "admin":
            return "elevated"
        else:
            return "standard"
