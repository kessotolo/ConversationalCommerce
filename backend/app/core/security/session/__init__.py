"""
Session Management Package

This package provides comprehensive session management for SuperAdmin accounts
with idle timeout, validation, and security features.
"""

from .manager import SuperAdminSessionManager, super_admin_session_manager
from .models import SessionInfo, SessionConfig, SessionValidationResult

__all__ = [
    "SuperAdminSessionManager",
    "super_admin_session_manager",
    "SessionInfo",
    "SessionConfig",
    "SessionValidationResult"
]
