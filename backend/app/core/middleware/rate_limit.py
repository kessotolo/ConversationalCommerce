import os
import time
from typing import Dict, List
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

from app.app.core.logging import logger

# Helper: is test mode?
IS_TEST_MODE = os.getenv("TESTING", "").lower() in (
    "true", "1", "t", "yes", "y")


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware for rate limiting requests.

    Implements per-IP rate limiting with configurable limits.
    """

    def __init__(self, app, requests_per_minute: int = 60):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.rate_limit_cache: Dict[str, List[float]] = {}
        self.last_cleanup = time.time()

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        """Main middleware dispatch method."""

        # Skip rate limiting in test mode or for test clients
        if self._should_skip_rate_limit(request):
            return await call_next(request)

        # Get client IP
        client_ip = self._get_client_ip(request)

        # Check rate limit
        if not self._check_rate_limit(client_ip):
            logger.warning(f"Rate limit exceeded for IP: {client_ip}")
            return Response(
                content="Rate limit exceeded",
                status_code=429,
                media_type="text/plain",
                headers={"Retry-After": "60"}
            )

        # Continue with the request
        return await call_next(request)

    def _should_skip_rate_limit(self, request: Request) -> bool:
        """Check if rate limiting should be skipped for this request."""
        # Skip in test mode
        if IS_TEST_MODE:
            return True

        # Skip for test clients
        client_ip = self._get_client_ip(request)
        if client_ip in ["testclient", "127.0.0.1", "localhost"]:
            return True

        # Skip for test domains
        host = request.headers.get("host", "")
        if host in ["testserver", "localhost:8000", "127.0.0.1:8000"]:
            return True

        return False

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

    def _check_rate_limit(self, client_ip: str) -> bool:
        """Check if the client IP has exceeded the rate limit."""
        current_time = time.time()

        # Clean up old entries periodically
        if current_time - self.last_cleanup > 60:
            self._cleanup_rate_limit_cache()
            self.last_cleanup = current_time

        # Initialize IP tracking if needed
        if client_ip not in self.rate_limit_cache:
            self.rate_limit_cache[client_ip] = []

        # Clean old requests (last minute)
        self.rate_limit_cache[client_ip] = [
            t for t in self.rate_limit_cache[client_ip]
            if current_time - t < 60
        ]

        # Check if limit exceeded
        if len(self.rate_limit_cache[client_ip]) >= self.requests_per_minute:
            return False

        # Add current request
        self.rate_limit_cache[client_ip].append(current_time)
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
