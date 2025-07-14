import os
from typing import Callable, Optional
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

from app.app.core.logging import logger

# Helper: is test mode?
IS_TEST_MODE = os.getenv("TESTING", "").lower() in (
    "true", "1", "t", "yes", "y")


class TenantMiddleware(BaseHTTPMiddleware):
    """
    Middleware for tenant isolation and routing.

    Extracts tenant ID from headers or subdomain and validates access.
    """

    def __init__(self, app):
        super().__init__(app)
        self.tenant_header = "X-Tenant-ID"
        self.subdomain_tenant_pattern = r"^([a-zA-Z0-9-]+)\.enwhe\.io$"

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Main middleware dispatch method."""

        # Extract tenant ID from header or subdomain
        tenant_id = self._extract_tenant_id(request)

        if not tenant_id:
            # Allow requests without tenant ID for public endpoints
            if self._is_public_endpoint(request.url.path):
                return await call_next(request)

            logger.warning(
                f"No tenant ID found for request: {request.url.path}")
            return Response(
                content="Tenant ID required",
                status_code=400,
                media_type="text/plain"
            )

        # Validate tenant ID format
        if not self._is_valid_tenant_id(tenant_id):
            logger.warning(f"Invalid tenant ID format: {tenant_id}")
            return Response(
                content="Invalid tenant ID format",
                status_code=400,
                media_type="text/plain"
            )

        # Add tenant ID to request state for downstream use
        request.state.tenant_id = tenant_id

        # Continue with the request
        return await call_next(request)

    def _extract_tenant_id(self, request: Request) -> Optional[str]:
        """Extract tenant ID from request headers or subdomain."""
        # Check header first
        tenant_id = request.headers.get(self.tenant_header)
        if tenant_id:
            return tenant_id.strip()

        # Check subdomain
        host = request.headers.get("host", "")
        if host:
            import re
            match = re.match(self.subdomain_tenant_pattern, host)
            if match:
                return match.group(1)

        return None

    def _is_valid_tenant_id(self, tenant_id: str) -> bool:
        """Validate tenant ID format."""
        if not tenant_id:
            return False

        # Basic validation: alphanumeric and hyphens only, 3-50 chars
        import re
        return bool(re.match(r"^[a-zA-Z0-9-]{3,50}$", tenant_id))

    def _is_public_endpoint(self, path: str) -> bool:
        """Check if endpoint is public (doesn't require tenant ID)."""
        public_paths = [
            "/health",
            "/docs",
            "/openapi.json",
            "/api/public",
            "/api/auth",
        ]

        return any(path.startswith(public_path) for public_path in public_paths)
