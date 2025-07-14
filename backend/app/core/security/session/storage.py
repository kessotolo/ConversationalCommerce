"""
Session Storage Handler

This module handles Redis storage operations for sessions.
"""

import json
from datetime import datetime, timezone
from typing import Optional, List
from dataclasses import asdict

from app.app.core.logging import logger
from app.app.core.cache.redis_cache import redis_cache
from .models import SessionInfo, SessionConfig


class SessionStorage:
    """Handles Redis storage operations for SuperAdmin sessions."""

    def __init__(self, config: SessionConfig):
        self.config = config

    async def store_session(self, session_info: SessionInfo) -> None:
        """Store session in Redis with expiration."""
        if not redis_cache.is_available:
            raise Exception("Redis cache not available for session storage")

        key = f"{self.config.session_prefix}{session_info.session_id}"
        value = json.dumps(asdict(session_info), default=str)

        # Set with expiration
        ttl_seconds = int(
            (session_info.expires_at - datetime.now(timezone.utc)).total_seconds())
        await redis_cache.set(key, value, ttl_seconds)

        # Also maintain user sessions index
        user_key = f"{self.config.user_sessions_prefix}{session_info.user_id}"
        await redis_cache.sadd(user_key, session_info.session_id)

    async def get_session(self, session_id: str) -> Optional[SessionInfo]:
        """Get session from Redis."""
        if not redis_cache.is_available:
            return None

        key = f"{self.config.session_prefix}{session_id}"
        session_data = await redis_cache.get(key)

        if session_data:
            data = json.loads(session_data)
            # Convert datetime strings back to datetime objects
            for field in ['created_at', 'last_activity', 'expires_at']:
                if field in data and isinstance(data[field], str):
                    data[field] = datetime.fromisoformat(data[field])
            return SessionInfo(**data)

        return None

    async def get_user_sessions(self, user_id: str) -> List[SessionInfo]:
        """Get all sessions for a user."""
        if not redis_cache.is_available:
            return []

        user_key = f"{self.config.user_sessions_prefix}{user_id}"
        session_ids = await redis_cache.smembers(user_key)

        sessions = []
        for session_id in session_ids:
            session_info = await self.get_session(session_id)
            if session_info:
                sessions.append(session_info)

        return sessions

    async def delete_session(self, session_id: str, user_id: str) -> bool:
        """Delete a session from Redis."""
        try:
            # Remove from Redis
            key = f"{self.config.session_prefix}{session_id}"
            await redis_cache.delete(key)

            # Remove from user sessions index
            user_key = f"{self.config.user_sessions_prefix}{user_id}"
            await redis_cache.srem(user_key, session_id)

            return True

        except Exception as e:
            logger.error(f"Error deleting session {session_id}: {str(e)}")
            return False

    async def cleanup_expired_sessions(self) -> List[str]:
        """Clean up expired sessions and return list of cleaned session IDs."""
        if not redis_cache.is_available:
            return []

        pattern = f"{self.config.session_prefix}*"
        session_keys = await redis_cache.scan_keys(pattern)

        cleaned_sessions = []
        now = datetime.now(timezone.utc)

        for key in session_keys:
            try:
                session_data = await redis_cache.get(key)
                if session_data:
                    data = json.loads(session_data)
                    # Convert expires_at string to datetime
                    expires_at = datetime.fromisoformat(data['expires_at'])

                    if now > expires_at:
                        session_id = data['session_id']
                        user_id = data['user_id']

                        await self.delete_session(session_id, user_id)
                        cleaned_sessions.append(session_id)

            except Exception as e:
                logger.error(f"Error cleaning up session {key}: {str(e)}")
                continue

        return cleaned_sessions
