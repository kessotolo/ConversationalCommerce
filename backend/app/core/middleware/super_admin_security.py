"""
Super Admin Security Middleware

This middleware provides comprehensive security controls for Super Admin endpoints:
- Global IP allowlist enforcement
- Security headers injection
- Audit logging for all admin actions
- Rate limiting for admin endpoints
- Emergency lockout controls
- Clerk Organizations integration
- Domain-specific access control
"""

import time
import ipaddress
from typing import Dict, List, Optional, Set
from datetime import datetime, timezone

from fastapi import Request, Response, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse

from app.core.logging import logger
from app.db.async_session import get_async_session_local
from app.models.security.ip_allowlist import IPAllowlistEntry, IPAllowlistSetting
from app.models.security.rate_limit import RateLimitEntry, RateLimitRule
from app.models.audit.audit_log import AuditLog
from app.models.security.emergency import SystemLockout
from app.core.security.clerk import verify_clerk_token
from app.core.security.clerk_organizations import clerk_organizations_service


class SuperAdminSecurityMiddleware(BaseHTTPMiddleware):
    """
    Comprehensive security middleware for Super Admin endpoints.

    Protects all /api/admin/* endpoints with:
    - IP allowlist enforcement
    - Security headers
    - Audit logging
    - Rate limiting
    - Emergency controls
    - Clerk Organizations validation
    - Domain-specific access control
    """

    def __init__(self, app):
        super().__init__(app)
        self.admin_path_prefix = "/api/admin"
        self.rate_limit_cache: Dict[str, List[float]] = {}
        self.last_cleanup = time.time()

        # Allowed domains for SuperAdmin access
        self.allowed_admin_domains = {
            "enwhe.com",
            "admin.enwhe.com",
            "localhost:3000",  # Development
            "127.0.0.1:3000"   # Development
        }

        # Security headers to inject for admin domain
        self.admin_security_headers = {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Content-Security-Policy": (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                "img-src 'self' data: https: blob:; "
                "font-src 'self' data: https://fonts.gstatic.com; "
                "connect-src 'self' https://api.clerk.com https://clerk.enwhe.com; "
                "frame-ancestors 'none'; "
                "base-uri 'self'; "
                "form-action 'self';"
            ),
            "Permissions-Policy": (
                "camera=(), microphone=(), geolocation=(), "
                "payment=(), usb=(), magnetometer=(), gyroscope=(), "
                "accelerometer=(), ambient-light-sensor=(), autoplay=(), "
                "battery=(), display-capture=(), document-domain=(), "
                "encrypted-media=(), fullscreen=(), midi=(), "
                "picture-in-picture=(), publickey-credentials-get=(), "
                "screen-wake-lock=(), sync-xhr=(), web-share=()"
            ),
            "X-Permitted-Cross-Domain-Policies": "none",
            "Cross-Origin-Embedder-Policy": "require-corp",
            "Cross-Origin-Opener-Policy": "same-origin",
            "Cross-Origin-Resource-Policy": "same-origin"
        }

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        """Main middleware dispatch method."""

        # Only apply to Super Admin endpoints
        if not request.url.path.startswith(self.admin_path_prefix):
            return await call_next(request)

        # Get client IP and host
        client_ip = self._get_client_ip(request)
        host = request.headers.get("host", "")

        # Get database session
        session_factory = get_async_session_local()
        async with session_factory() as db:
            try:
                # 1. Check domain access first
                if not self._is_allowed_admin_domain(host):
                    await self._log_security_event(
                        db, client_ip, request, "unauthorized_domain_access",
                        {"host": host, "allowed_domains": list(
                            self.allowed_admin_domains)}
                    )
                    return JSONResponse(
                        status_code=status.HTTP_403_FORBIDDEN,
                        content={"detail": "Access denied: Invalid domain"}
                    )

                # 2. Check for emergency lockout
                if await self._check_emergency_lockout(db, request):
                    return JSONResponse(
                        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                        content={
                            "detail": "System is temporarily locked due to emergency"}
                    )

                # 3. Check IP allowlist
                if not await self._check_ip_allowlist(db, client_ip, request):
                    await self._log_security_event(db, client_ip, request, "ip_blocked")
                    return JSONResponse(
                        status_code=status.HTTP_403_FORBIDDEN,
                        content={"detail": "Access denied: IP not in allowlist"}
                    )

                # 4. Check rate limits
                if not await self._check_rate_limits(db, client_ip, request):
                    await self._log_security_event(db, client_ip, request, "rate_limited")
                    return JSONResponse(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        content={"detail": "Rate limit exceeded"},
                        headers={"Retry-After": "60"}
                    )

                # 5. Validate SuperAdmin organization membership for authenticated requests
                user_id = await self._get_authenticated_user_id(request)
                if user_id:
                    is_super_admin = await clerk_organizations_service.is_super_admin(user_id)
                    if not is_super_admin:
                        await self._log_security_event(
                            db, client_ip, request, "non_super_admin_access_attempt",
                            {"user_id": user_id}
                        )
                        return JSONResponse(
                            status_code=status.HTTP_403_FORBIDDEN,
                            content={
                                "detail": "SuperAdmin organization membership required"}
                        )

                # 6. Process the request
                start_time = time.time()
                response = await call_next(request)
                duration = time.time() - start_time

                # 7. Add security headers
                self._add_security_headers(response, host)

                # 8. Log the admin action
                await self._log_admin_action(db, client_ip, request, response, duration, user_id)

                return response

            except Exception as e:
                logger.error(
                    f"Error in Super Admin security middleware: {str(e)}")
                await self._log_security_event(db, client_ip, request, "middleware_error", {"error": str(e)})
                # Allow request to continue but log the error
                response = await call_next(request)
                self._add_security_headers(response, host)
                return response

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address from request."""
        # Check for forwarded headers (load balancer/proxy)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # Take the first IP in the chain
            return forwarded_for.split(",")[0].strip()

        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip

        # Fallback to direct client IP
        return request.client.host if request.client else "unknown"

    def _is_allowed_admin_domain(self, host: str) -> bool:
        """Check if the host is an allowed admin domain."""
        # Remove port if present for comparison
        domain = host.split(":")[0] if ":" in host else host
        return domain in self.allowed_admin_domains or host in self.allowed_admin_domains

    async def _get_authenticated_user_id(self, request: Request) -> Optional[str]:
        """Extract user ID from authentication token if present."""
        try:
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header[7:]
                token_data = verify_clerk_token(token)
                return token_data.user_id
        except Exception:
            pass
        return None

    async def _check_emergency_lockout(self, db: AsyncSession, request: Request) -> bool:
        """Check if system is in emergency lockout mode."""
        try:
            # Check for active platform-wide lockouts
            result = await db.execute(
                "SELECT COUNT(*) FROM system_lockouts WHERE is_platform_wide = true AND is_active = true"
            )
            count = result.scalar()
            return count > 0
        except Exception as e:
            logger.error(f"Error checking emergency lockout: {str(e)}")
            return False

    async def _check_ip_allowlist(self, db: AsyncSession, client_ip: str, request: Request) -> bool:
        """Check if client IP is in the allowlist."""
        try:
            # First check if IP allowlisting is enforced
            result = await db.execute(
                "SELECT is_enforced FROM ip_allowlist_settings WHERE role_id IS NULL AND tenant_id IS NULL LIMIT 1"
            )
            setting = result.fetchone()

            # If no global setting or not enforced, allow access
            if not setting or not setting[0]:
                return True

            # Check if IP is in allowlist
            ip_addr = ipaddress.ip_address(client_ip)

            # Query active allowlist entries
            result = await db.execute(
                """
                SELECT ip_range FROM ip_allowlist_entries
                WHERE is_active = true
                AND (expires_at IS NULL OR expires_at > NOW())
                AND (is_global = true OR user_id IS NOT NULL OR role_id IS NOT NULL)
                """
            )

            for row in result:
                try:
                    allowed_network = ipaddress.ip_network(
                        str(row[0]), strict=False)
                    if ip_addr in allowed_network:
                        return True
                except ValueError:
                    continue

            return False

        except Exception as e:
            logger.error(f"Error checking IP allowlist: {str(e)}")
            # On error, allow access to prevent lockout
            return True

    async def _check_rate_limits(self, db: AsyncSession, client_ip: str, request: Request) -> bool:
        """Check rate limits for the client IP."""
        try:
            current_time = time.time()

            # Clean up old entries periodically
            if current_time - self.last_cleanup > 60:
                self._cleanup_rate_limit_cache()
                self.last_cleanup = current_time

            # Initialize IP tracking if needed
            if client_ip not in self.rate_limit_cache:
                self.rate_limit_cache[client_ip] = []

            # Clean old requests (last 60 seconds)
            self.rate_limit_cache[client_ip] = [
                t for t in self.rate_limit_cache[client_ip]
                if current_time - t < 60
            ]

            # Check if limit exceeded (100 requests per minute for admin endpoints)
            if len(self.rate_limit_cache[client_ip]) >= 100:
                return False

            # Add current request
            self.rate_limit_cache[client_ip].append(current_time)
            return True

        except Exception as e:
            logger.error(f"Error checking rate limits: {str(e)}")
            return True

    def _cleanup_rate_limit_cache(self):
        """Clean up old rate limit entries."""
        current_time = time.time()
        for ip in list(self.rate_limit_cache.keys()):
            self.rate_limit_cache[ip] = [
                t for t in self.rate_limit_cache[ip]
                if current_time - t < 60
            ]
            if not self.rate_limit_cache[ip]:
                del self.rate_limit_cache[ip]

    def _add_security_headers(self, response: Response, host: str):
        """Add security headers to the response."""
        # Only add enhanced security headers for admin domains
        if self._is_allowed_admin_domain(host):
            for header, value in self.admin_security_headers.items():
                response.headers[header] = value
        else:
            # Basic security headers for other domains
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["X-Frame-Options"] = "DENY"

    async def _log_admin_action(self, db: AsyncSession, client_ip: str, request: Request,
                                response: Response, duration: float, user_id: Optional[str] = None):
        """Log admin action for audit trail."""
        try:
            # Create audit log entry
            audit_log = AuditLog(
                user_id=user_id,
                ip_address=client_ip,
                user_agent=request.headers.get("User-Agent"),
                timestamp=datetime.now(timezone.utc),
                action=f"{request.method} {request.url.path}",
                status="success" if response.status_code < 400 else "error",
                resource_type="admin_endpoint",
                resource_id=request.url.path,
                details={
                    "method": request.method,
                    "path": request.url.path,
                    "query_params": dict(request.query_params),
                    "status_code": response.status_code,
                    "duration": duration,
                    "user_agent": request.headers.get("User-Agent"),
                    "host": request.headers.get("host"),
                    "organization_validated": user_id is not None
                }
            )

            db.add(audit_log)
            await db.commit()

        except Exception as e:
            logger.error(f"Error logging admin action: {str(e)}")

    async def _log_security_event(self, db: AsyncSession, client_ip: str, request: Request,
                                  event_type: str, details: Optional[Dict] = None):
        """Log security events."""
        try:
            audit_log = AuditLog(
                user_id=None,  # Security events may not have authenticated user
                ip_address=client_ip,
                user_agent=request.headers.get("User-Agent"),
                timestamp=datetime.now(timezone.utc),
                action=f"security_event_{event_type}",
                status="blocked",
                resource_type="security",
                resource_id=request.url.path,
                details={
                    "event_type": event_type,
                    "method": request.method,
                    "path": request.url.path,
                    "user_agent": request.headers.get("User-Agent"),
                    "host": request.headers.get("host"),
                    **(details or {})
                }
            )

            db.add(audit_log)
            await db.commit()

        except Exception as e:
            logger.error(f"Error logging security event: {str(e)}")
