"""
Brute Force Protection service.

This service provides functionality for:
- Tracking login attempts
- Managing account lockouts
- Rate limiting requests
- Detecting suspicious activity
"""

import uuid
import ipaddress
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any, Tuple

from sqlalchemy import select, update, delete, and_, or_, not_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.security.rate_limit import (
    LoginAttempt, LoginAttemptResult, 
    AccountLockout, RateLimitRule, RateLimitEntry
)
from app.models.admin.admin_user import AdminUser
from app.services.audit.audit_service import AuditService


class BruteForceService:
    """Service for brute force attack protection and rate limiting."""
    
    def __init__(self):
        self.audit_service = AuditService()
        
        # Default settings
        self.max_login_attempts = 5
        self.lockout_duration_minutes = 30
        self.progressive_lockout = True
        self.suspicious_activity_threshold = 10
    
    async def record_login_attempt(
        self,
        db: AsyncSession,
        username: str,
        ip_address: str,
        result: LoginAttemptResult,
        user_id: Optional[uuid.UUID] = None,
        user_agent: Optional[str] = None,
        tenant_id: Optional[uuid.UUID] = None,
        is_admin_portal: bool = False,
        details: Optional[Dict[str, Any]] = None
    ) -> LoginAttempt:
        """
        Record a login attempt in the database.
        
        Args:
            db: Database session
            username: Username that was used
            ip_address: IP address of the client
            result: Result of the login attempt
            user_id: ID of the user (if known)
            user_agent: User agent string
            tenant_id: ID of the tenant (if applicable)
            is_admin_portal: Whether this was an admin portal login
            details: Additional details about the attempt
            
        Returns:
            The created login attempt record
        """
        # Create login attempt record
        login_attempt = LoginAttempt(
            user_id=user_id,
            username=username,
            ip_address=ip_address,
            user_agent=user_agent,
            tenant_id=tenant_id,
            is_admin_portal=is_admin_portal,
            result=result,
            details=details,
            timestamp=datetime.now(timezone.utc)
        )
        
        db.add(login_attempt)
        await db.commit()
        await db.refresh(login_attempt)
        
        # If this was a failed attempt, check if we need to lock the account
        if result in [LoginAttemptResult.FAILED_PASSWORD, LoginAttemptResult.FAILED_2FA]:
            if user_id:
                await self._check_and_apply_lockout(db, user_id, ip_address)
        
        # Audit successful logins
        if result == LoginAttemptResult.SUCCESS and user_id:
            await self.audit_service.log_event(
                db=db,
                user_id=user_id,
                action="user_login",
                resource_type="user",
                resource_id=str(user_id),
                tenant_id=tenant_id,
                status="success",
                details={
                    "ip_address": ip_address,
                    "is_admin_portal": is_admin_portal
                }
            )
        
        return login_attempt
    
    async def _check_and_apply_lockout(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        ip_address: str
    ) -> bool:
        """
        Check if an account should be locked due to failed attempts.
        
        Args:
            db: Database session
            user_id: ID of the user
            ip_address: IP address of the client
            
        Returns:
            True if the account was locked, False otherwise
        """
        # Check if account is already locked
        is_locked = await self.is_account_locked(db, user_id)
        if is_locked:
            return True
        
        # Count recent failed attempts
        window_start = datetime.now(timezone.utc) - timedelta(hours=1)
        
        query = select(func.count()).where(
            LoginAttempt.user_id == user_id,
            LoginAttempt.result.in_([LoginAttemptResult.FAILED_PASSWORD, LoginAttemptResult.FAILED_2FA]),
            LoginAttempt.timestamp > window_start
        )
        
        result = await db.execute(query)
        failed_attempts = result.scalar()
        
        # Lock account if threshold exceeded
        if failed_attempts >= self.max_login_attempts:
            # Calculate lockout duration (progressive if enabled)
            if self.progressive_lockout:
                # Double the lockout duration for each additional failure beyond threshold
                additional_failures = failed_attempts - self.max_login_attempts
                lockout_minutes = self.lockout_duration_minutes * (2 ** min(additional_failures, 3))
            else:
                lockout_minutes = self.lockout_duration_minutes
                
            lockout_minutes = min(lockout_minutes, 24 * 60)  # Cap at 24 hours
            
            # Create lockout record
            lockout = AccountLockout(
                user_id=user_id,
                reason="failed_attempts",
                locked_at=datetime.now(timezone.utc),
                expires_at=datetime.now(timezone.utc) + timedelta(minutes=lockout_minutes),
                is_active=True,
                locked_by_system=True,
                triggering_ip=ip_address,
                failed_attempts=failed_attempts,
                details={
                    "lockout_minutes": lockout_minutes,
                    "progressive": self.progressive_lockout
                }
            )
            
            db.add(lockout)
            await db.commit()
            
            return True
            
        return False
    
    async def is_account_locked(
        self,
        db: AsyncSession,
        user_id: uuid.UUID
    ) -> bool:
        """
        Check if an account is currently locked.
        
        Args:
            db: Database session
            user_id: ID of the user
            
        Returns:
            True if the account is locked, False otherwise
        """
        # Get current time
        current_time = datetime.now(timezone.utc)
        
        # Check for active lockouts
        query = select(AccountLockout).where(
            AccountLockout.user_id == user_id,
            AccountLockout.is_active == True,
            or_(
                AccountLockout.expires_at == None,  # Indefinite lockout
                AccountLockout.expires_at > current_time  # Timed lockout still active
            )
        )
        
        result = await db.execute(query)
        lockout = result.scalars().first()
        
        if lockout:
            return True
            
        # Also check for any expired lockouts and mark them inactive
        expired_query = select(AccountLockout).where(
            AccountLockout.user_id == user_id,
            AccountLockout.is_active == True,
            AccountLockout.expires_at <= current_time
        )
        
        result = await db.execute(expired_query)
        expired_lockouts = result.scalars().all()
        
        if expired_lockouts:
            for lockout in expired_lockouts:
                lockout.is_active = False
                
            await db.commit()
            
        return False
    
    async def unlock_account(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        admin_user_id: uuid.UUID,
        reason: Optional[str] = None
    ) -> bool:
        """
        Manually unlock an account.
        
        Args:
            db: Database session
            user_id: ID of the user to unlock
            admin_user_id: ID of the admin performing the unlock
            reason: Optional reason for the unlock
            
        Returns:
            True if any lockouts were removed, False otherwise
        """
        # Find active lockouts
        query = select(AccountLockout).where(
            AccountLockout.user_id == user_id,
            AccountLockout.is_active == True
        )
        
        result = await db.execute(query)
        lockouts = result.scalars().all()
        
        if not lockouts:
            return False
            
        # Update lockouts
        for lockout in lockouts:
            lockout.is_active = False
            lockout.unlocked_at = datetime.now(timezone.utc)
            lockout.unlocked_by_user_id = admin_user_id
            
            if reason:
                if lockout.details is None:
                    lockout.details = {}
                lockout.details["unlock_reason"] = reason
                
        await db.commit()
        
        # Log audit event
        await self.audit_service.log_event(
            db=db,
            user_id=admin_user_id,
            action="account_unlocked",
            resource_type="user",
            resource_id=str(user_id),
            status="success",
            details={
                "reason": reason
            }
        )
        
        return True
    
    async def create_rate_limit_rule(
        self,
        db: AsyncSession,
        name: str,
        endpoint: Optional[str] = None,
        requests_per_second: Optional[int] = None,
        requests_per_minute: Optional[int] = None,
        requests_per_hour: Optional[int] = None,
        block_duration_seconds: int = 60,
        applies_to_admins: bool = True,
        applies_to_authenticated: bool = True,
        applies_to_anonymous: bool = True,
        admin_user_id: Optional[uuid.UUID] = None
    ) -> RateLimitRule:
        """
        Create or update a rate limit rule.
        
        Args:
            db: Database session
            name: Name of the rule
            endpoint: Optional endpoint pattern
            requests_per_second: Max requests per second
            requests_per_minute: Max requests per minute
            requests_per_hour: Max requests per hour
            block_duration_seconds: Duration of block when limit exceeded
            applies_to_admins: Whether rule applies to admin users
            applies_to_authenticated: Whether rule applies to authenticated users
            applies_to_anonymous: Whether rule applies to anonymous users
            admin_user_id: ID of the admin creating the rule
            
        Returns:
            The created/updated rate limit rule
        """
        # Ensure at least one rate limit is provided
        if not any([requests_per_second, requests_per_minute, requests_per_hour]):
            raise ValueError("At least one rate limit (per second, minute, or hour) must be provided")
            
        # Check if rule already exists
        query = select(RateLimitRule).where(RateLimitRule.name == name)
        result = await db.execute(query)
        rule = result.scalars().first()
        
        if rule:
            # Update existing rule
            rule.endpoint = endpoint
            rule.requests_per_second = requests_per_second
            rule.requests_per_minute = requests_per_minute
            rule.requests_per_hour = requests_per_hour
            rule.block_duration_seconds = block_duration_seconds
            rule.applies_to_admins = applies_to_admins
            rule.applies_to_authenticated = applies_to_authenticated
            rule.applies_to_anonymous = applies_to_anonymous
            rule.updated_at = datetime.now(timezone.utc)
        else:
            # Create new rule
            rule = RateLimitRule(
                name=name,
                endpoint=endpoint,
                requests_per_second=requests_per_second,
                requests_per_minute=requests_per_minute,
                requests_per_hour=requests_per_hour,
                block_duration_seconds=block_duration_seconds,
                applies_to_admins=applies_to_admins,
                applies_to_authenticated=applies_to_authenticated,
                applies_to_anonymous=applies_to_anonymous,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
                created_by=admin_user_id
            )
            db.add(rule)
            
        await db.commit()
        await db.refresh(rule)
        
        # Log audit event
        if admin_user_id:
            await self.audit_service.log_event(
                db=db,
                user_id=admin_user_id,
                action="rate_limit_rule_created" if not rule else "rate_limit_rule_updated",
                resource_type="rate_limit_rule",
                resource_id=str(rule.id),
                status="success",
                details={
                    "name": name,
                    "endpoint": endpoint,
                    "limits": {
                        "per_second": requests_per_second,
                        "per_minute": requests_per_minute,
                        "per_hour": requests_per_hour
                    }
                }
            )
        
        return rule
    
    async def check_rate_limit(
        self,
        db: AsyncSession,
        rule_name: str,
        ip_address: str,
        path: Optional[str] = None,
        user_id: Optional[uuid.UUID] = None,
        is_admin: bool = False
    ) -> Tuple[bool, Optional[int]]:
        """
        Check if a request is rate limited.
        
        Args:
            db: Database session
            rule_name: Name of the rate limit rule
            ip_address: IP address of the client
            path: Request path
            user_id: ID of the user (if authenticated)
            is_admin: Whether the user is an admin
            
        Returns:
            Tuple of (is_limited, retry_after_seconds)
        """
        # Get the rule
        query = select(RateLimitRule).where(
            RateLimitRule.name == rule_name,
            RateLimitRule.is_active == True
        )
        
        result = await db.execute(query)
        rule = result.scalars().first()
        
        if not rule:
            return False, None
            
        # Check if rule applies based on user type
        if is_admin and not rule.applies_to_admins:
            return False, None
            
        if user_id and not is_admin and not rule.applies_to_authenticated:
            return False, None
            
        if not user_id and not rule.applies_to_anonymous:
            return False, None
            
        # Clean up expired rate limit entries
        await self._cleanup_expired_rate_limits(db)
        
        # Check for existing block
        query = select(RateLimitEntry).where(
            RateLimitEntry.rule_id == rule.id,
            RateLimitEntry.ip_address == ip_address,
            RateLimitEntry.user_id == user_id if user_id else RateLimitEntry.user_id == None,
            RateLimitEntry.is_blocked == True,
            RateLimitEntry.expires_at > datetime.now(timezone.utc)
        )
        
        result = await db.execute(query)
        block = result.scalars().first()
        
        if block:
            # Calculate retry-after seconds
            retry_after = int((block.expires_at - datetime.now(timezone.utc)).total_seconds())
            return True, max(0, retry_after)
            
        # Check rate limits and update counters
        is_limited = False
        retry_after = None
        
        # Get or create rate limit entry
        query = select(RateLimitEntry).where(
            RateLimitEntry.rule_id == rule.id,
            RateLimitEntry.ip_address == ip_address,
            RateLimitEntry.user_id == user_id if user_id else RateLimitEntry.user_id == None
        )
        
        result = await db.execute(query)
        entry = result.scalars().first()
        
        now = datetime.now(timezone.utc)
        
        if entry:
            # Check if window has expired and reset if needed
            if entry.window_start < now - timedelta(seconds=1) and rule.requests_per_second:
                entry.window_start = now
                entry.request_count = 1
            elif entry.window_start < now - timedelta(minutes=1) and rule.requests_per_minute:
                entry.window_start = now
                entry.request_count = 1
            elif entry.window_start < now - timedelta(hours=1) and rule.requests_per_hour:
                entry.window_start = now
                entry.request_count = 1
            else:
                # Increment counter
                entry.request_count += 1
                
            # Check if limit exceeded
            if (rule.requests_per_second and entry.request_count > rule.requests_per_second and
                (now - entry.window_start).total_seconds() <= 1):
                is_limited = True
                retry_after = rule.block_duration_seconds
                entry.is_blocked = True
                entry.expires_at = now + timedelta(seconds=rule.block_duration_seconds)
                
            elif (rule.requests_per_minute and entry.request_count > rule.requests_per_minute and
                (now - entry.window_start).total_seconds() <= 60):
                is_limited = True
                retry_after = rule.block_duration_seconds
                entry.is_blocked = True
                entry.expires_at = now + timedelta(seconds=rule.block_duration_seconds)
                
            elif (rule.requests_per_hour and entry.request_count > rule.requests_per_hour and
                (now - entry.window_start).total_seconds() <= 3600):
                is_limited = True
                retry_after = rule.block_duration_seconds
                entry.is_blocked = True
                entry.expires_at = now + timedelta(seconds=rule.block_duration_seconds)
        else:
            # Create new entry
            entry = RateLimitEntry(
                ip_address=ip_address,
                user_id=user_id,
                rule_id=rule.id,
                request_count=1,
                is_blocked=False,
                window_start=now,
                expires_at=now + timedelta(hours=1),
                path=path
            )
            db.add(entry)
            
        await db.commit()
        
        return is_limited, retry_after
    
    async def _cleanup_expired_rate_limits(self, db: AsyncSession) -> None:
        """
        Clean up expired rate limit entries.
        
        Args:
            db: Database session
        """
        # Get current time
        now = datetime.now(timezone.utc)
        
        # Find expired entries
        query = delete(RateLimitEntry).where(
            RateLimitEntry.expires_at < now
        )
        
        await db.execute(query)
        await db.commit()
