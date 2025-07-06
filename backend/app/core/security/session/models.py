"""
Session Models and Data Structures

This module contains data classes and models for session management.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class SessionInfo:
    """Session information data class for SuperAdmin sessions."""
    session_id: str
    user_id: str
    organization_id: str
    organization_role: str
    created_at: datetime
    last_activity: datetime
    expires_at: datetime
    ip_address: str
    user_agent: str
    device_fingerprint: Optional[str] = None
    is_active: bool = True
    security_level: str = "standard"  # standard, elevated, high


@dataclass
class SessionConfig:
    """Configuration for session management."""
    session_prefix: str = "super_admin_session:"
    user_sessions_prefix: str = "user_sessions:"
    default_timeout_minutes: int = 60  # 1 hour default
    elevated_timeout_minutes: int = 30  # 30 minutes for elevated sessions
    high_security_timeout_minutes: int = 15  # 15 minutes for high security
    max_sessions_per_user: int = 5  # Maximum concurrent sessions


@dataclass
class SessionValidationResult:
    """Result of session validation."""
    is_valid: bool
    session_info: Optional[SessionInfo] = None
    reason: Optional[str] = None  # Reason for invalid session
