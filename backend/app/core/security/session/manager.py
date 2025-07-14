"""
Session Manager

Main orchestrator for SuperAdmin session management operations.
"""

import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.app.core.logging import logger
from app.app.core.security.clerk_organizations import clerk_organizations_service
from .models import SessionInfo, SessionConfig, SessionValidationResult
from .storage import SessionStorage
from .validator import SessionValidator
from .audit import SessionAuditor


class SuperAdminSessionManager:
    """
    Main session manager for SuperAdmin accounts.

    Orchestrates session creation, validation, and cleanup.
    """

    def __init__(self):
        self.config = SessionConfig()
        self.storage = SessionStorage(self.config)
        self.auditor = SessionAuditor()
        self.validator = SessionValidator(
            self.config, self.storage, self.auditor)

    async def create_session(
        self,
        db: AsyncSession,
        user_id: str,
        ip_address: str,
        user_agent: str,
        device_fingerprint: Optional[str] = None,
        timeout_minutes: Optional[int] = None
    ) -> SessionInfo:
        """Create a new SuperAdmin session."""
        try:
            # Validate user is SuperAdmin
            is_super_admin = await clerk_organizations_service.is_super_admin(user_id)
            if not is_super_admin:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="SuperAdmin access required"
                )

            # Get organization info
            org_role = await clerk_organizations_service.get_super_admin_role(user_id)
            org_id = clerk_organizations_service.super_admin_org_id

            # Check for existing sessions and enforce limits
            await self._enforce_session_limits(user_id)

            # Create session
            session_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc)

            # Determine timeout based on security level
            timeout = timeout_minutes or self.config.default_timeout_minutes
            expires_at = now + timedelta(minutes=timeout)

            # Determine security level based on role and context
            security_level = self.validator.determine_security_level(
                org_role, ip_address)

            session_info = SessionInfo(
                session_id=session_id,
                user_id=user_id,
                organization_id=org_id,
                organization_role=org_role,
                created_at=now,
                last_activity=now,
                expires_at=expires_at,
                ip_address=ip_address,
                user_agent=user_agent,
                device_fingerprint=device_fingerprint,
                is_active=True,
                security_level=security_level
            )

            # Store session
            await self.storage.store_session(session_info)

            # Update admin user record
            await self.auditor.update_admin_user_session(
                db, user_id, session_id, now, ip_address
            )

            # Log session creation
            await self.auditor.log_session_event(
                db, user_id, "session_created",
                {
                    "session_id": session_id,
                    "ip_address": ip_address,
                    "user_agent": user_agent,
                    "security_level": security_level,
                    "expires_at": expires_at.isoformat()
                }
            )

            logger.info(
                f"SuperAdmin session created: {session_id} for user {user_id}")
            return session_info

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating SuperAdmin session: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create session"
            )

    async def validate_session(
        self,
        db: AsyncSession,
        session_id: str,
        ip_address: str,
        user_agent: str
    ) -> Optional[SessionInfo]:
        """Validate and refresh a SuperAdmin session."""
        result = await self.validator.validate_session(db, session_id, ip_address, user_agent)

        if result.is_valid and result.session_info:
            # Update admin user activity
            await self.auditor.update_admin_user_activity(
                db, result.session_info.user_id, datetime.now(timezone.utc)
            )
            return result.session_info

        return None

    async def invalidate_session(
        self,
        db: AsyncSession,
        session_id: str,
        reason: str = "logout"
    ) -> bool:
        """Invalidate a SuperAdmin session."""
        try:
            # Get session info first
            session_info = await self.storage.get_session(session_id)
            if not session_info:
                return False

            # Remove from storage
            success = await self.storage.delete_session(session_id, session_info.user_id)

            if success:
                # Log invalidation
                await self.auditor.log_session_event(
                    db, session_info.user_id, "session_invalidated",
                    {
                        "session_id": session_id,
                        "reason": reason
                    }
                )

            return success

        except Exception as e:
            logger.error(f"Error invalidating session {session_id}: {str(e)}")
            return False

    async def invalidate_all_user_sessions(
        self,
        db: AsyncSession,
        user_id: str,
        reason: str = "security_logout"
    ) -> int:
        """Invalidate all sessions for a user."""
        try:
            # Get all user sessions
            user_sessions = await self.storage.get_user_sessions(user_id)

            invalidated_count = 0
            for session_info in user_sessions:
                if await self.invalidate_session(db, session_info.session_id, reason):
                    invalidated_count += 1

            # Log mass invalidation
            await self.auditor.log_session_event(
                db, user_id, "all_sessions_invalidated",
                {
                    "reason": reason,
                    "sessions_count": invalidated_count
                }
            )

            logger.info(
                f"Invalidated {invalidated_count} sessions for user {user_id}")
            return invalidated_count

        except Exception as e:
            logger.error(
                f"Error invalidating all sessions for user {user_id}: {str(e)}")
            return 0

    async def get_user_sessions(
        self,
        user_id: str,
        include_inactive: bool = False
    ) -> List[SessionInfo]:
        """Get all sessions for a user."""
        try:
            sessions = await self.storage.get_user_sessions(user_id)

            if not include_inactive:
                sessions = [s for s in sessions if s.is_active]

            return sessions

        except Exception as e:
            logger.error(
                f"Error getting sessions for user {user_id}: {str(e)}")
            return []

    async def cleanup_expired_sessions(self, db: AsyncSession) -> int:
        """Clean up expired sessions."""
        try:
            cleaned_session_ids = await self.storage.cleanup_expired_sessions()

            # Log cleanup for each session
            for session_id in cleaned_session_ids:
                await self.auditor.log_session_event(
                    db, "system", "session_expired_cleanup",
                    {"session_id": session_id}
                )

            logger.info(
                f"Cleaned up {len(cleaned_session_ids)} expired sessions")
            return len(cleaned_session_ids)

        except Exception as e:
            logger.error(f"Error during session cleanup: {str(e)}")
            return 0

    async def _enforce_session_limits(self, user_id: str) -> None:
        """Enforce maximum sessions per user."""
        sessions = await self.storage.get_user_sessions(user_id)
        active_sessions = [s for s in sessions if s.is_active]

        if len(active_sessions) >= self.config.max_sessions_per_user:
            # Remove oldest session
            oldest_session = min(active_sessions, key=lambda s: s.created_at)
            await self.storage.delete_session(oldest_session.session_id, user_id)


# Create service instance
super_admin_session_manager = SuperAdminSessionManager()
