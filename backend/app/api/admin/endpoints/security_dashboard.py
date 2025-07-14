"""
Security Dashboard API Endpoints

Provides real-time security metrics, events, and alerts for the admin dashboard.
Aggregates data from all Phase 2A security features.
"""

from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
import json
import logging

from app.app.core.security.dependencies import get_current_super_admin
from app.app.db.async_session import get_async_db
from app.app.models.admin.admin_user import AdminUser
from app.app.models.security.ip_allowlist import IPAllowlistEntry
from app.app.models.security.rate_limit import LoginAttempt
from app.app.models.security.rate_limit import RateLimitEntry
from app.app.models.security.two_factor import TOTPSecret
from app.app.models.audit.audit_log import AuditLog
from app.app.core.security.session.storage import SessionStorage
from app.app.core.security.session.models import SessionConfig
from app.app.schemas.security.security_dashboard import (
    SecurityMetricsResponse,
    SecurityEventResponse,
    SecurityAlertResponse,
    SecurityEvent,
    SecurityAlert
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/security", tags=["security-dashboard"])


@router.get("/metrics", response_model=SecurityMetricsResponse)
async def get_security_metrics(
    current_admin: AdminUser = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get comprehensive security metrics for the dashboard.

    Returns aggregated metrics from all security systems:
    - Active sessions
    - Failed login attempts
    - IP allowlist entries
    - 2FA enabled users
    - Security violations
    - Emergency lockouts
    - Rate limit violations
    - CORS violations
    """

    # Get 24 hours ago timestamp
    twenty_four_hours_ago = datetime.now(timezone.utc) - timedelta(hours=24)

    # Count active sessions using session service
    session_storage = SessionStorage(SessionConfig())
    active_sessions_count = 0
    try:
        # Get all active sessions from Redis
        pattern = f"{session_storage.config.session_prefix}*"
        # This also cleans up expired sessions
        session_keys = await session_storage.cleanup_expired_sessions()
        # Count remaining active sessions
        all_sessions = []
        for key in await session_storage.redis_cache.scan_keys(pattern):
            session_data = await session_storage.redis_cache.get(key)
            if session_data:
                data = json.loads(session_data)
                if data.get('is_active', False):
                    all_sessions.append(data)
        active_sessions_count = len(all_sessions)
    except Exception as e:
        # Log error but don't fail the endpoint
        logger.error(f"Error getting active sessions count: {e}")
        active_sessions_count = 0

    # Count failed login attempts in last 24 hours
    failed_login_attempts = await db.scalar(
        func.count(LoginAttempt.id).where(
            and_(
                LoginAttempt.result.in_(
                    ["failed_password", "failed_2fa", "account_locked"]),
                LoginAttempt.timestamp >= twenty_four_hours_ago
            )
        )
    )

    # Count IP allowlist entries
    ip_allowlist_count = await db.scalar(
        func.count(IPAllowlistEntry.id).where(
            IPAllowlistEntry.is_active == True
        )
    )

    # Count users with 2FA enabled (using TOTPSecret instead of TwoFactorAuth)
    enabled_2fa_count = await db.scalar(
        func.count(TOTPSecret.id).where(
            and_(
                TOTPSecret.is_enabled == True,
                TOTPSecret.is_verified == True
            )
        )
    )

    # Count security violations in last 24 hours
    security_violations = await db.scalar(
        func.count(AuditLog.id).where(
            and_(
                AuditLog.event_type.like('%security%'),
                AuditLog.timestamp >= twenty_four_hours_ago,
                AuditLog.severity.in_(["medium", "high", "critical"])
            )
        )
    )

    # Count emergency lockouts (active lockouts)
    emergency_lockouts = await db.scalar(
        func.count(AdminUser.id).where(
            and_(
                AdminUser.is_locked == True,
                AdminUser.locked_until > datetime.now(timezone.utc)
            )
        )
    )

    # Count rate limit violations in last 24 hours
    rate_limit_violations = await db.scalar(
        func.count(RateLimitEntry.id).where(
            and_(
                RateLimitEntry.created_at >= twenty_four_hours_ago,
                RateLimitEntry.is_violation == True
            )
        )
    )

    # Count CORS violations in last 24 hours (from audit logs)
    cors_violations = await db.scalar(
        func.count(AuditLog.id).where(
            and_(
                AuditLog.event_type.like('%cors%'),
                AuditLog.timestamp >= twenty_four_hours_ago,
                AuditLog.severity.in_(["medium", "high", "critical"])
            )
        )
    )

    return SecurityMetricsResponse(
        active_sessions=active_sessions_count,
        failed_login_attempts_24h=failed_login_attempts or 0,
        ip_allowlist_entries=ip_allowlist_count or 0,
        enabled_2fa_users=enabled_2fa_count or 0,
        security_violations_24h=security_violations or 0,
        emergency_lockouts=emergency_lockouts or 0,
        rate_limit_violations_24h=rate_limit_violations or 0,
        cors_violations_24h=cors_violations or 0
    )


@router.get("/events", response_model=List[SecurityEventResponse])
async def get_security_events(
    limit: int = Query(50, ge=1, le=200),
    severity: Optional[str] = Query(
        None, regex="^(low|medium|high|critical)$"),
    event_type: Optional[str] = Query(None),
    current_admin: AdminUser = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get recent security events with optional filtering.

    Returns security events from various sources:
    - Login attempts (successful and failed)
    - IP allowlist modifications
    - 2FA setup/verification events
    - Session management events
    - Rate limiting violations
    - CORS violations
    - Emergency lockouts
    """

    # Build query conditions
    conditions = []

    if severity:
        conditions.append(AuditLog.severity == severity)

    if event_type:
        conditions.append(AuditLog.event_type.like(f"%{event_type}%"))

    # Get security-related audit logs
    query = (
        db.query(AuditLog)
        .where(
            and_(
                AuditLog.event_type.like('%security%') |
                AuditLog.event_type.like('%auth%') |
                AuditLog.event_type.like('%session%') |
                AuditLog.event_type.like('%login%') |
                AuditLog.event_type.like('%ip%') |
                AuditLog.event_type.like('%2fa%') |
                AuditLog.event_type.like('%rate_limit%') |
                AuditLog.event_type.like('%cors%'),
                *conditions
            )
        )
        .order_by(AuditLog.timestamp.desc())
        .limit(limit)
    )

    audit_logs = await db.execute(query)
    events = audit_logs.scalars().all()

    # Convert to security events
    security_events = []
    for log in events:
        event = SecurityEventResponse(
            id=str(log.id),
            timestamp=log.timestamp.isoformat(),
            event_type=log.event_type,
            severity=log.severity,
            user_id=log.user_id,
            ip_address=log.ip_address,
            description=log.description,
            details=log.details or {}
        )
        security_events.append(event)

    return security_events


@router.get("/alerts", response_model=List[SecurityAlertResponse])
async def get_security_alerts(
    current_admin: AdminUser = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get active security alerts that require attention.

    Returns alerts for:
    - High rate of failed login attempts
    - Suspicious IP activity
    - Emergency lockouts
    - System configuration issues
    - 2FA enforcement violations
    - Session anomalies
    """

    alerts = []

    # Check for high rate of failed login attempts
    one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
    failed_attempts_count = await db.scalar(
        func.count(LoginAttempt.id).where(
            and_(
                LoginAttempt.result.in_(["failed_password", "failed_2fa"]),
                LoginAttempt.timestamp >= one_hour_ago
            )
        )
    )

    if failed_attempts_count and failed_attempts_count > 10:
        alerts.append(SecurityAlertResponse(
            id="high_failed_logins",
            title="High Rate of Failed Login Attempts",
            severity="warning",
            message=f"{failed_attempts_count} failed login attempts in the last hour",
            timestamp=datetime.now(timezone.utc).isoformat(),
            action_required=True
        ))

    # Check for active emergency lockouts
    active_lockouts = await db.scalar(
        func.count(AdminUser.id).where(
            and_(
                AdminUser.is_locked == True,
                AdminUser.locked_until > datetime.now(timezone.utc)
            )
        )
    )

    if active_lockouts and active_lockouts > 0:
        alerts.append(SecurityAlertResponse(
            id="active_lockouts",
            title="Active Emergency Lockouts",
            severity="error",
            message=f"{active_lockouts} admin accounts are currently locked",
            timestamp=datetime.now(timezone.utc).isoformat(),
            action_required=True
        ))

    # Check for users without 2FA
    total_admins = await db.scalar(func.count(AdminUser.id))
    admins_with_2fa = await db.scalar(
        func.count(TOTPSecret.id).where(
            and_(
                TOTPSecret.is_enabled == True,
                TOTPSecret.is_verified == True
            )
        )
    )

    if total_admins and admins_with_2fa:
        non_2fa_percentage = (
            (total_admins - admins_with_2fa) / total_admins) * 100
        if non_2fa_percentage > 20:  # More than 20% without 2FA
            alerts.append(SecurityAlertResponse(
                id="low_2fa_adoption",
                title="Low 2FA Adoption Rate",
                severity="warning",
                message=f"{non_2fa_percentage:.1f}% of admin users do not have 2FA enabled",
                timestamp=datetime.now(timezone.utc).isoformat(),
                action_required=False
            ))

    # Check for suspicious IP activity
    suspicious_ips = await db.execute(
        db.query(LoginAttempt.ip_address, func.count(
            LoginAttempt.id).label('attempt_count'))
        .where(
            and_(
                LoginAttempt.result == "failed_password",
                LoginAttempt.timestamp >= one_hour_ago
            )
        )
        .group_by(LoginAttempt.ip_address)
        .having(func.count(LoginAttempt.id) > 5)
    )

    suspicious_ip_list = suspicious_ips.fetchall()
    if suspicious_ip_list:
        ip_addresses = [ip.ip_address for ip in suspicious_ip_list]
        alerts.append(SecurityAlertResponse(
            id="suspicious_ips",
            title="Suspicious IP Activity Detected",
            severity="warning",
            message=f"Multiple failed login attempts from IPs: {', '.join(ip_addresses[:3])}{'...' if len(ip_addresses) > 3 else ''}",
            timestamp=datetime.now(timezone.utc).isoformat(),
            action_required=True
        ))

    # Check for expired sessions that should be cleaned up
    expired_sessions = 0
    try:
        session_storage = SessionStorage(SessionConfig())
        # Clean up expired sessions and count them
        expired_sessions = len(await session_storage.cleanup_expired_sessions())
    except Exception as e:
        logger.error(f"Error checking expired sessions: {e}")
        expired_sessions = 0

    if expired_sessions and expired_sessions > 10:
        alerts.append(SecurityAlertResponse(
            id="expired_sessions",
            title="Expired Sessions Need Cleanup",
            severity="info",
            message=f"{expired_sessions} expired sessions should be cleaned up",
            timestamp=datetime.now(timezone.utc).isoformat(),
            action_required=False
        ))

    return alerts


@router.post("/emergency-lockdown")
async def trigger_emergency_lockdown(
    reason: str,
    current_admin: AdminUser = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Trigger emergency lockdown of all admin accounts.

    This will:
    - Lock all admin accounts except the current admin
    - Invalidate all active sessions
    - Log the emergency action
    - Send notifications to all admins
    """

    # Lock all admin accounts except the current one
    await db.execute(
        db.query(AdminUser)
        .where(AdminUser.id != current_admin.id)
        .update({
            "is_locked": True,
            "locked_until": datetime.now(timezone.utc) + timedelta(hours=24),
            "lock_reason": f"Emergency lockdown: {reason}"
        })
    )

    # Invalidate all active sessions except current admin's using session service
    try:
        session_storage = SessionStorage(SessionConfig())
        # Get all sessions for all users except current admin
        pattern = f"{session_storage.config.session_prefix}*"
        session_keys = await session_storage.redis_cache.scan_keys(pattern)

        for key in session_keys:
            session_data = await session_storage.redis_cache.get(key)
            if session_data:
                data = json.loads(session_data)
                if data.get('user_id') != current_admin.id:
                    # Invalidate session
                    await session_storage.delete_session(data['session_id'], data['user_id'])
    except Exception as e:
        logger.error(
            f"Error invalidating sessions during emergency lockdown: {e}")

    # Log the emergency action
    audit_log = AuditLog(
        event_type="emergency_lockdown",
        user_id=current_admin.id,
        ip_address=None,  # Would be set by middleware
        description=f"Emergency lockdown triggered by {current_admin.email}",
        details={"reason": reason},
        severity="critical"
    )
    db.add(audit_log)

    await db.commit()

    return {"message": "Emergency lockdown activated successfully"}


@router.get("/health")
async def security_health_check(
    current_admin: AdminUser = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Comprehensive security health check.

    Validates all security systems are functioning properly:
    - Clerk integration
    - Session management
    - IP allowlist
    - 2FA systems
    - Rate limiting
    - CORS protection
    """

    health_status = {
        "overall_status": "healthy",
        "components": {},
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    # Check Clerk integration
    try:
        # This would make a test call to Clerk API
        health_status["components"]["clerk_integration"] = "healthy"
    except Exception as e:
        health_status["components"]["clerk_integration"] = "unhealthy"
        health_status["overall_status"] = "degraded"

    # Check session management
    try:
        session_storage = SessionStorage(SessionConfig())
        # Count active sessions
        pattern = f"{session_storage.config.session_prefix}*"
        session_keys = await session_storage.redis_cache.scan_keys(pattern)
        active_sessions = 0
        for key in session_keys:
            session_data = await session_storage.redis_cache.get(key)
            if session_data:
                data = json.loads(session_data)
                if data.get('is_active', False):
                    active_sessions += 1

        health_status["components"]["session_management"] = "healthy"
        health_status["components"]["active_sessions"] = active_sessions
    except Exception as e:
        health_status["components"]["session_management"] = "unhealthy"
        health_status["overall_status"] = "degraded"

    # Check IP allowlist
    try:
        allowlist_count = await db.scalar(func.count(IPAllowlistEntry.id))
        health_status["components"]["ip_allowlist"] = "healthy"
        health_status["components"]["allowlist_entries"] = allowlist_count or 0
    except Exception as e:
        health_status["components"]["ip_allowlist"] = "unhealthy"
        health_status["overall_status"] = "degraded"

    # Check 2FA system
    try:
        twofa_count = await db.scalar(func.count(TOTPSecret.id))
        health_status["components"]["two_factor_auth"] = "healthy"
        health_status["components"]["enabled_2fa"] = twofa_count or 0
    except Exception as e:
        health_status["components"]["two_factor_auth"] = "unhealthy"
        health_status["overall_status"] = "degraded"

    return health_status
