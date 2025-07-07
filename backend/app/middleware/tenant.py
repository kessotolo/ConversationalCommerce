from typing import Callable
from uuid import UUID

from config import settings
from fastapi import FastAPI, Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse


class TenantMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: FastAPI):
        super().__init__(app)
        self.app = app

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip tenant check for public paths
        if self._is_public_path(request.url.path):
            return await call_next(request)

        # Get tenant ID from header
        tenant_id = request.headers.get("X-Tenant-ID")

        # In test mode, allow requests without tenant ID and use a default
        if getattr(settings, "TESTING", False) and not tenant_id:
            tenant_id = "00000000-0000-0000-0000-000000000001"
            request.state.tenant_id = tenant_id
            return await call_next(request)

        if not tenant_id or not isinstance(tenant_id, str) or tenant_id.strip() == "":
            import logging

            logging.error(
                f"TenantMiddleware: Missing or empty X-Tenant-ID header on path {request.url.path}"
            )
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "detail": "X-Tenant-ID header is required and must be a non-empty string"
                },
            )

        # Validate UUID format
        try:
            if not tenant_id or not isinstance(tenant_id, str):
                raise ValueError("tenant_id must be a non-empty string")
            tenant_uuid = UUID(tenant_id)
        except Exception as e:
            import logging

            logging.error(
                f"TenantMiddleware: Invalid tenant ID format '{tenant_id}' on path {request.url.path}: {e}"
            )
            return JSONResponse(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                content={"detail": f"Invalid tenant ID format: {tenant_id}"},
            )
        request.state.tenant_id = str(tenant_uuid)

        # Get response
        response = await call_next(request)

        # Add tenant ID to response headers
        response.headers["X-Tenant-ID"] = tenant_id

        return response

    def _is_public_path(self, path: str) -> bool:
        """Check if the path is public and doesn't require tenant context."""
        public_paths = [
            "/api/v1/health",
            "/api/v1/docs",
            "/api/v1/openapi.json",
            "/api/v1/redoc",
            "/api/v1/auth",
            "/api/v1/tenants",
            "/api/v1/domains/verify",
            "/api/v1/domains/check",
            "/api/v1/domains/status",
            "/api/v1/domains/verify-dns",
            "/api/v1/domains/verify-ssl",
            "/api/v1/domains/verify-http",
            "/api/v1/domains/verify-all",
            "/api/v1/domains/verify-email",
            "/api/v1/domains/verify-ownership",
            "/api/v1/domains/verify-domain",
            "/api/v1/domains/verify-domain-ownership",
            "/api/v1/domains/verify-domain-email",
            "/api/v1/domains/verify-domain-dns",
            "/api/v1/domains/verify-domain-ssl",
            "/api/v1/domains/verify-domain-http",
            "/api/v1/domains/verify-domain-all",
            "/api/v1/domains/verify-domain-ownership-email",
            "/api/v1/domains/verify-domain-ownership-dns",
            "/api/v1/domains/verify-domain-ownership-ssl",
            "/api/v1/domains/verify-domain-ownership-http",
            "/api/v1/domains/verify-domain-ownership-all",
            "/api/v1/domains/verify-domain-email-dns",
            "/api/v1/domains/verify-domain-email-ssl",
            "/api/v1/domains/verify-domain-email-http",
            "/api/v1/domains/verify-domain-email-all",
            "/api/v1/domains/verify-domain-dns-ssl",
            "/api/v1/domains/verify-domain-dns-http",
            "/api/v1/domains/verify-domain-dns-all",
            "/api/v1/domains/verify-domain-ssl-http",
            "/api/v1/domains/verify-domain-ssl-all",
            "/api/v1/domains/verify-domain-http-all",
            "/api/v1/domains/verify-domain-ownership-email-dns",
            "/api/v1/domains/verify-domain-ownership-email-ssl",
            "/api/v1/domains/verify-domain-ownership-email-http",
            "/api/v1/domains/verify-domain-ownership-email-all",
            "/api/v1/domains/verify-domain-ownership-dns-ssl",
            "/api/v1/domains/verify-domain-ownership-dns-http",
            "/api/v1/domains/verify-domain-ownership-dns-all",
            "/api/v1/domains/verify-domain-ownership-ssl-http",
            "/api/v1/domains/verify-domain-ownership-ssl-all",
            "/api/v1/domains/verify-domain-ownership-http-all",
            "/api/v1/domains/verify-domain-email-dns-ssl",
            "/api/v1/domains/verify-domain-email-dns-http",
            "/api/v1/domains/verify-domain-email-dns-all",
            "/api/v1/domains/verify-domain-email-ssl-http",
            "/api/v1/domains/verify-domain-email-ssl-all",
            "/api/v1/domains/verify-domain-email-http-all",
            "/api/v1/domains/verify-domain-dns-ssl-http",
            "/api/v1/domains/verify-domain-dns-ssl-all",
            "/api/v1/domains/verify-domain-dns-http-all",
            "/api/v1/domains/verify-domain-ssl-http-all",
            "/api/v1/domains/verify-domain-ownership-email-dns-ssl",
            "/api/v1/domains/verify-domain-ownership-email-dns-http",
            "/api/v1/domains/verify-domain-ownership-email-dns-all",
            "/api/v1/domains/verify-domain-ownership-email-ssl-http",
            "/api/v1/domains/verify-domain-ownership-email-ssl-all",
            "/api/v1/domains/verify-domain-ownership-email-http-all",
            "/api/v1/domains/verify-domain-ownership-dns-ssl-http",
            "/api/v1/domains/verify-domain-ownership-dns-ssl-all",
            "/api/v1/domains/verify-domain-ownership-dns-http-all",
            "/api/v1/domains/verify-domain-ownership-ssl-http-all",
            "/api/v1/domains/verify-domain-email-dns-ssl-http",
            "/api/v1/domains/verify-domain-email-dns-ssl-all",
            "/api/v1/domains/verify-domain-email-dns-http-all",
            "/api/v1/domains/verify-domain-email-ssl-http-all",
            "/api/v1/domains/verify-domain-dns-ssl-http-all",
            "/api/v1/domains/verify-domain-ownership-email-dns-ssl-http",
            "/api/v1/domains/verify-domain-ownership-email-dns-ssl-all",
            "/api/v1/domains/verify-domain-ownership-email-dns-http-all",
            "/api/v1/domains/verify-domain-ownership-email-ssl-http-all",
            "/api/v1/domains/verify-domain-ownership-dns-ssl-http-all",
            "/api/v1/domains/verify-domain-email-dns-ssl-http-all",
            "/api/v1/domains/verify-domain-ownership-email-dns-ssl-http-all",
        ]
