"""Test-specific middleware overrides for testing"""

from backend.app.core.middleware.rate_limit import RateLimitMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request, Response


class TestRateLimitMiddleware(RateLimitMiddleware):
    """Test version of RateLimitMiddleware with test database session"""

    def __init__(self, app):
        super().__init__(app)

    async def dispatch(self, request, call_next):
        # Skip rate limiting completely in tests
        # This prevents the middleware from trying to connect to the database
        # which is causing the hostname resolution error
        return await call_next(request)


class TestTenantMiddleware(BaseHTTPMiddleware):
    """Test version of TenantMiddleware that bypasses DB connections"""

    async def dispatch(self, request: Request, call_next):
        # Skip tenant check for public endpoints or just pass through
        # Add test tenant ID to request state
        tenant_id = request.headers.get("X-Tenant-ID")

        if not tenant_id:
            # Use a test tenant ID for testing
            tenant_id = "00000000-0000-0000-0000-000000000001"

        # Create a flag to track if we've added tenant context
        request.state.tenant_context_added = False

        try:
            # Validate UUID format
            from uuid import UUID

            tenant_uuid = UUID(tenant_id)

            # Store tenant_id in request.state for use in dependencies
            # This will be used by the get_db dependency
            request.state.tenant_id = str(tenant_uuid)
            request.state.tenant_context_added = True

            # Execute the rest of the request without any DB operations
            response = await call_next(request)
            return response
        except ValueError:
            return Response(f"Invalid tenant ID format: {tenant_id}", status_code=400)
        except Exception as e:
            import traceback

            print(f"Test tenant middleware error: {str(e)}")
            traceback.print_exc()  # Print stack trace for better debugging
            return Response(
                "Internal server error in test tenant handling", status_code=500
            )
