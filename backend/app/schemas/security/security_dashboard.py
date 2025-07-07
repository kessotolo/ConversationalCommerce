"""
Pydantic schemas for Security Dashboard API responses.

These schemas define the structure and validation for security metrics,
events, and alerts returned by the security dashboard endpoints.
"""

from datetime import datetime
from typing import Dict, List, Optional, Any, Literal
from pydantic import BaseModel, Field, validator


class SecurityMetricsResponse(BaseModel):
    """Response schema for security metrics aggregation."""

    active_sessions: int = Field(
        ...,
        description="Number of currently active SuperAdmin sessions",
        ge=0
    )
    failed_login_attempts_24h: int = Field(
        ...,
        description="Number of failed login attempts in the last 24 hours",
        ge=0
    )
    ip_allowlist_entries: int = Field(
        ...,
        description="Number of active IP allowlist entries",
        ge=0
    )
    enabled_2fa_users: int = Field(
        ...,
        description="Number of users with 2FA enabled",
        ge=0
    )
    security_violations_24h: int = Field(
        ...,
        description="Number of security violations in the last 24 hours",
        ge=0
    )
    emergency_lockouts: int = Field(
        ...,
        description="Number of currently active emergency lockouts",
        ge=0
    )
    rate_limit_violations_24h: int = Field(
        ...,
        description="Number of rate limit violations in the last 24 hours",
        ge=0
    )
    cors_violations_24h: int = Field(
        ...,
        description="Number of CORS violations in the last 24 hours",
        ge=0
    )

    class Config:
        schema_extra = {
            "example": {
                "active_sessions": 3,
                "failed_login_attempts_24h": 5,
                "ip_allowlist_entries": 12,
                "enabled_2fa_users": 8,
                "security_violations_24h": 2,
                "emergency_lockouts": 0,
                "rate_limit_violations_24h": 1,
                "cors_violations_24h": 0
            }
        }


class SecurityEventResponse(BaseModel):
    """Response schema for individual security events."""

    id: str = Field(..., description="Unique event identifier")
    timestamp: str = Field(..., description="ISO 8601 timestamp of the event")
    event_type: str = Field(..., description="Type of security event")
    severity: Literal["low", "medium", "high", "critical"] = Field(
        ...,
        description="Severity level of the event"
    )
    user_id: Optional[str] = Field(
        None, description="User ID associated with the event")
    ip_address: Optional[str] = Field(
        None, description="IP address associated with the event")
    description: str = Field(...,
                             description="Human-readable description of the event")
    details: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional event details and context"
    )

    @validator('timestamp')
    def validate_timestamp(cls, v):
        """Validate timestamp format."""
        try:
            datetime.fromisoformat(v.replace('Z', '+00:00'))
        except ValueError:
            raise ValueError('Invalid timestamp format. Expected ISO 8601.')
        return v

    class Config:
        schema_extra = {
            "example": {
                "id": "evt_123456789",
                "timestamp": "2025-01-20T10:30:00Z",
                "event_type": "failed_login_attempt",
                "severity": "medium",
                "user_id": "user_123",
                "ip_address": "192.168.1.100",
                "description": "Failed login attempt from unauthorized IP",
                "details": {
                    "username": "admin@example.com",
                    "user_agent": "Mozilla/5.0...",
                    "failure_reason": "invalid_password"
                }
            }
        }


class SecurityAlertResponse(BaseModel):
    """Response schema for security alerts."""

    id: str = Field(..., description="Unique alert identifier")
    title: str = Field(..., description="Alert title")
    severity: Literal["info", "warning", "error"] = Field(
        ...,
        description="Alert severity level"
    )
    message: str = Field(..., description="Alert message")
    timestamp: str = Field(...,
                           description="ISO 8601 timestamp when alert was created")
    action_required: bool = Field(
        ...,
        description="Whether immediate action is required"
    )

    @validator('timestamp')
    def validate_timestamp(cls, v):
        """Validate timestamp format."""
        try:
            datetime.fromisoformat(v.replace('Z', '+00:00'))
        except ValueError:
            raise ValueError('Invalid timestamp format. Expected ISO 8601.')
        return v

    class Config:
        schema_extra = {
            "example": {
                "id": "alert_high_failed_logins",
                "title": "High Rate of Failed Login Attempts",
                "severity": "warning",
                "message": "15 failed login attempts detected in the last hour",
                "timestamp": "2025-01-20T10:30:00Z",
                "action_required": True
            }
        }


class SecurityHealthResponse(BaseModel):
    """Response schema for security health check."""

    overall_status: Literal["healthy", "degraded", "unhealthy"] = Field(
        ...,
        description="Overall security system health status"
    )
    components: Dict[str, Any] = Field(
        ...,
        description="Individual component health status"
    )
    timestamp: str = Field(...,
                           description="ISO 8601 timestamp of health check")

    class Config:
        schema_extra = {
            "example": {
                "overall_status": "healthy",
                "components": {
                    "clerk_integration": "healthy",
                    "session_management": "healthy",
                    "ip_allowlist": "healthy",
                    "two_factor_auth": "healthy",
                    "active_sessions": 3,
                    "allowlist_entries": 12,
                    "enabled_2fa": 8
                },
                "timestamp": "2025-01-20T10:30:00Z"
            }
        }


class EmergencyLockdownRequest(BaseModel):
    """Request schema for emergency lockdown."""

    reason: str = Field(
        ...,
        description="Reason for emergency lockdown",
        min_length=10,
        max_length=500
    )

    class Config:
        schema_extra = {
            "example": {
                "reason": "Suspected security breach detected in admin panel access logs"
            }
        }


class EmergencyLockdownResponse(BaseModel):
    """Response schema for emergency lockdown."""

    message: str = Field(..., description="Confirmation message")
    affected_accounts: int = Field(
        ...,
        description="Number of accounts locked",
        ge=0
    )
    affected_sessions: int = Field(
        ...,
        description="Number of sessions terminated",
        ge=0
    )
    lockdown_expires: str = Field(
        ...,
        description="ISO 8601 timestamp when lockdown expires"
    )

    class Config:
        schema_extra = {
            "example": {
                "message": "Emergency lockdown activated successfully",
                "affected_accounts": 5,
                "affected_sessions": 8,
                "lockdown_expires": "2025-01-21T10:30:00Z"
            }
        }


# Legacy aliases for backward compatibility
SecurityEvent = SecurityEventResponse
SecurityAlert = SecurityAlertResponse
SecurityMetrics = SecurityMetricsResponse
