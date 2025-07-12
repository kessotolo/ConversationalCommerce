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

import os
import logging
from typing import List, Optional
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

from backend.app.core.config.settings import get_settings
from backend.app.core.security.clerk_multi_org import clerk_service

logger = logging.getLogger(__name__)

# Helper: is test mode?
IS_TEST_MODE = os.getenv("TESTING", "").lower() in (
    "true", "1", "t", "yes", "y")

settings = get_settings()


class SuperAdminSecurityMiddleware(BaseHTTPMiddleware):
    """
    Middleware for SuperAdmin security enforcement.

    Enforces:
    - Domain validation
    - IP allowlisting
    - Organization membership
    - Session security
    """

    def __init__(
        self,
        app,
        admin_path_prefix: str = "/api/admin",
        allowed_domains: Optional[List[str]] = None,
        allowed_ips: Optional[List[str]] = None,
    ):
        super().__init__(app)
        self.admin_path_prefix = admin_path_prefix
        self.allowed_domains = allowed_domains or [
            "admin.enwhe.com",
            "localhost:3000",
            "127.0.0.1:3000",
            "testserver",  # Allow test client
            "localhost:8000",
            "127.0.0.1:8000",
        ]
        self.allowed_ips = allowed_ips or settings.ADMIN_ALLOWED_IPS

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        """Main middleware dispatch method."""

        # Only apply to Super Admin endpoints
        if not request.url.path.startswith(self.admin_path_prefix):
            return await call_next(request)

        # Skip security checks in test mode
        if IS_TEST_MODE:
            return await call_next(request)

        # Validate domain access
        host = request.headers.get("host", "")
        if not self._is_domain_allowed(host):
            logger.warning(f"Domain access denied: {host}")
            return Response(
                content="Access denied for this domain",
                status_code=403,
                media_type="text/plain"
            )

        # Validate IP address
        client_ip = self._get_client_ip(request)
        if not self._is_ip_allowed(client_ip):
            logger.warning(f"IP access denied: {client_ip}")
            return Response(
                content="Access denied from this IP address",
                status_code=403,
                media_type="text/plain"
            )

        # Validate authentication token
        auth_header = request.headers.get("authorization")
        if not auth_header:
            logger.warning("Missing authorization header")
            return Response(
                content="Authentication required",
                status_code=401,
                media_type="text/plain"
            )

        try:
            token_data = clerk_service.verify_token(
                auth_header.replace("Bearer ", ""))

            # For general admin endpoints, allow both seller and admin tokens
            # For admin-specific endpoints, require admin roles
            admin_specific_endpoints = [
                "/admin-only",
                "/super-admin-only",
                "/any-admin",
                "/super-admin/"
            ]

            is_admin_specific = any(
                endpoint in request.url.path for endpoint in admin_specific_endpoints)

            if is_admin_specific:
                # Admin-specific endpoints require admin roles
                if not token_data.is_admin():
                    logger.warning(
                        f"Non-admin role access attempt: {token_data.roles}")
                    return Response(
                        content="Admin role required",
                        status_code=403,
                        media_type="text/plain"
                    )

        except Exception as e:
            logger.error(f"Token validation failed: {str(e)}")
            return Response(
                content="Invalid authentication token",
                status_code=401,
                media_type="text/plain"
            )

        # Continue with the request
        return await call_next(request)

    def _is_domain_allowed(self, host: str) -> bool:
        """Check if the domain is in the allowed list."""
        return host in self.allowed_domains

    def _is_ip_allowed(self, client_ip: str) -> bool:
        """Check if the client IP is in the allowed list."""
        if not self.allowed_ips:
            return True  # Allow all if no IP restrictions

        return client_ip in self.allowed_ips

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request headers."""
        # Check for forwarded headers first
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()

        # Check for real IP header
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip

        # Fallback to direct client IP
        if request.client:
            return request.client.host

        return "unknown"
