import logging
import os
import time
from pathlib import Path

import sentry_sdk
from sentry_sdk.integrations.asgi import SentryAsgiMiddleware
from dotenv import load_dotenv
try:
    from prometheus_client import Counter, make_asgi_app
except ImportError:
    # Create dummy implementations if prometheus_client is not available
    class Counter:
        def __init__(self, *args, **kwargs):
            pass

        def inc(self, *args, **kwargs):
            pass

    def make_asgi_app():
        from fastapi import FastAPI
        return FastAPI()
from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.monitoring.metrics import metrics_middleware, setup_metrics

import app.domain.events  # Ensure event handlers are registered
from app.api.v1.api import api_router
from app.api.v1.endpoints.websocket import router as websocket_router
from app.api.v2.endpoints import orders as v2_orders
from app.core.cache.redis_cache import redis_cache
from app.core.config.settings import Settings, get_settings
from app.core.errors.exception_handlers import register_exception_handlers
from app.core.middleware.activity_tracker import ActivityTrackerMiddleware
from app.core.middleware.rate_limit import RateLimitMiddleware
from app.core.middleware.super_admin_security import SuperAdminSecurityMiddleware
from app.core.middleware.domain_specific_cors import DomainSpecificCORSMiddleware
from app.db.async_session import get_async_session_local
from app.middleware.domain_verification import (
    DomainVerificationMiddleware,
    verification_service,
)
from app.middleware.storefront_errors import StorefrontError, handle_storefront_error
from app.middleware.subdomain_middleware import SubdomainMiddleware
from app.core.errors import order_failures, payment_failures
from app.services.security.ip_allowlist_service import IPAllowlistService
from app.api.admin.endpoints import ip_allowlist as admin_ip_allowlist_router
from app.api.admin import router as admin_router

# Configure Sentry only if DSN is available
sentry_dsn = os.environ.get("SENTRY_DSN", "")
if sentry_dsn:
    sentry_sdk.init(
        dsn=sentry_dsn,
        traces_sample_rate=0.3,
        environment=os.environ.get("ENVIRONMENT", "development")
    )
else:
    # Skip Sentry initialization in development
    logging.info("Sentry disabled: No DSN configured")

# Prometheus metrics
webhook_errors = Counter("webhook_errors", "Number of webhook errors")

# Custom security headers middleware implementation


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, headers):
        super().__init__(app)
        self.headers = headers

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        # Add security headers to response
        for header_name, header_value in self.headers.items():
            response.headers[header_name] = header_value
        return response


# Custom compression middleware implementation


class CompressionMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, **options):
        super().__init__(app)
        self.options = options

    async def dispatch(self, request: Request, call_next):
        # This is a simplified version - in production, you'd want to handle
        # content compression based on Accept-Encoding headers
        response = await call_next(request)
        return response


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()],
)

logger = logging.getLogger(__name__)

# Load environment variables from the .env file in the backend directory
env_path = Path(__file__).parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path, override=True)

# Initialize settings after environment variables are loaded
settings = get_settings()


# Request timing middleware for performance monitoring
class RequestTimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time

        # Add X-Process-Time header
        response.headers["X-Process-Time"] = str(process_time)

        # Log request timing for slower requests (> 1 second)
        if process_time > 1.0:
            logger.warning(
                f"Slow request: {request.method} {request.url.path} took {process_time:.2f}s"
            )

        return response


class TenantMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Skip tenant check for public endpoints
        if self._is_public_path(request.url.path):
            return await call_next(request)

        tenant_id = request.headers.get("X-Tenant-ID")

        # For tests, we allow missing X-Tenant-ID header in specific environments
        is_test = os.getenv("TESTING", "").lower() in (
            "true", "1", "t", "yes", "y")

        if not tenant_id:
            if is_test:
                # When in test mode, allow the request to proceed
                # We'll use the TestClient's headers or middleware will handle it
                pass
            else:
                return Response("Missing X-Tenant-ID header", status_code=400)

        # Create a new AsyncSession for the request
        AsyncSessionLocal = get_async_session_local()
        db = None

        try:
            # Validate UUID format
            from uuid import UUID
            tenant_uuid = UUID(tenant_id)

            # Store tenant_id in request.state for use in dependencies
            request.state.tenant_id = str(tenant_uuid)

            # In test mode, skip DB validation in middleware
            # Detect test environment from settings or request headers
            from app.core.config.settings import get_settings
            settings = get_settings()

            test_mode = getattr(settings, "TESTING", False) or request.headers.get(
                "X-Test") == "true"

            if test_mode or is_test:
                # For tests, skip DB validation in middleware
                # This avoids async schema visibility issues while allowing the endpoint
                # to use its normal get_db dependency which works correctly
                logger.debug(
                    "Test environment detected - skipping tenant DB validation")
                # Skip DB creation in middleware for tests
                # request.state.db will be set by the endpoint's dependency
            else:
                # Production path - create an async database session
                db = AsyncSessionLocal()

                # Use the session directly in the request state
                # Do not set tenant context here - will be handled by the get_db dependency
                # when the endpoint is called
                request.state.db = db

            # Execute the rest of the request
            response = await call_next(request)
            return response
        except ValueError:
            return Response(f"Invalid tenant ID format: {tenant_id}", status_code=400)
        except Exception as e:
            logger.error(f"Tenant middleware error: {str(e)}")
            return Response("Internal server error in tenant handling", status_code=500)
        finally:
            if db:
                await db.close()

    def _is_public_path(self, path: str) -> bool:
        """
        Check if the path is public and doesn't require tenant validation.
        """
        public_paths = [
            "/docs",
            "/redoc",
            "/openapi.json",
            "/health",
            "/",
            "/test-env",
            "/test-settings",
            "/metrics",
            "/ws/monitoring",
        ]
        return any(path.startswith(public_path) for public_path in public_paths)


async def initialize_cache():
    """Initialize Redis cache connection."""
    try:
        await redis_cache.initialize()
        logger.info("Redis cache initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Redis cache: {e}")
        # Don't fail startup if cache is unavailable
        # The application should be able to run without cache


async def start_domain_verification():
    """Start the domain verification service."""
    await verification_service.start()


async def stop_domain_verification():
    """Stop the domain verification service."""
    await verification_service.stop()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan context manager for startup and shutdown events."""
    # Startup
    logger.info("Starting up ConversationalCommerce backend...")

    # Initialize cache
    await initialize_cache()

    # Start domain verification service
    await start_domain_verification()

    # Setup metrics
    setup_metrics()

    logger.info("Startup complete")

    yield

    # Shutdown
    logger.info("Shutting down ConversationalCommerce backend...")

    # Stop domain verification service
    await stop_domain_verification()

    logger.info("Shutdown complete")


class GlobalIPAllowlistMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, ip_allowlist_service: IPAllowlistService, admin_prefix: str = "/api/admin"):
        super().__init__(app)
        self.ip_allowlist_service = ip_allowlist_service
        self.admin_prefix = admin_prefix

    async def dispatch(self, request: Request, call_next):
        # Only enforce for admin endpoints
        if request.url.path.startswith(self.admin_prefix):
            client_ip = request.client.host
            db = None
            try:
                # Use a new DB session for the check
                AsyncSessionLocal = get_async_session_local()
                db = AsyncSessionLocal()
                # Check if IP is allowed globally
                allowed = await self.ip_allowlist_service.is_ip_allowed_global(db, client_ip)
                if not allowed:
                    return JSONResponse(status_code=403, content={"detail": "Access denied: IP not allowed."})
            except Exception as e:
                logger.error(f"IP allowlist check failed: {e}")
                return JSONResponse(status_code=500, content={"detail": "Internal server error (IP allowlist)"})
            finally:
                if db:
                    await db.close()
        return await call_next(request)


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title=settings.PROJECT_NAME,
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        debug=(settings.ENVIRONMENT != "production"),
        lifespan=lifespan,
    )

    # Register exception handlers
    register_exception_handlers(app)

    # Register storefront error handler
    app.add_exception_handler(StorefrontError, handle_storefront_error)

    # Register security headers middleware with comprehensive admin security headers
    app.add_middleware(
        SecurityHeadersMiddleware,
        headers={
            # Prevent MIME type sniffing
            "X-Content-Type-Options": "nosniff",
            # Prevent clickjacking
            "X-Frame-Options": "DENY",
            # Enable XSS protection (legacy, most browsers ignore in modern mode)
            "X-XSS-Protection": "1; mode=block",
            # Enforce HTTPS and subdomain security
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
            # Restrict resource loading and inline scripts/styles
            "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';",
            # Control referrer information
            "Referrer-Policy": "strict-origin-when-cross-origin",
            # Restrict browser features (camera, mic, geolocation, etc.)
            "Permissions-Policy": "geolocation=(), microphone=(), camera=(), fullscreen=(), payment=()",
        },
    )

    # 2. Rate limiting (early to prevent abuse)
    app.add_middleware(RateLimitMiddleware)

    # 3. Metrics middleware (for system monitoring)
    app.add_middleware(metrics_middleware)

    # 4. Request timing (for performance monitoring)
    app.add_middleware(RequestTimingMiddleware)

    # 4. Activity tracking (for audit and monitoring)
    app.add_middleware(
        ActivityTrackerMiddleware,
        skip_paths={
            "/docs",
            "/redoc",
            "/openapi.json",
            "/health",
            "/metrics",
            "/ws/monitoring",
        },
    )

    # 5. Tenant resolution (for multi-tenant support)
    app.add_middleware(TenantMiddleware)

    # 6. Domain verification (for security)
    app.add_middleware(
        DomainVerificationMiddleware,
        exclude_paths=["/api/", "/admin/", "/_next/",
                       "/static/", "/docs/", "/redoc/"],
    )

    # 7. Subdomain resolution (for multi-tenant storefronts)
    app.add_middleware(
        SubdomainMiddleware,
        base_domain=(
            settings.BASE_DOMAIN if hasattr(
                settings, "BASE_DOMAIN") else "example.com"
        ),
        exclude_paths=["/api/", "/admin/", "/_next/",
                       "/static/", "/docs/", "/redoc/"],
    )

    # 8. Domain-specific CORS (replaces generic CORS)
    app.add_middleware(DomainSpecificCORSMiddleware)

    # 9. Compression (last to compress all responses)
    app.add_middleware(
        CompressionMiddleware,
        minimum_size=1000,  # Only compress responses larger than 1KB
        compression_level=6,  # Balanced compression level
    )

    # Add global IP allowlist middleware for admin endpoints
    app.add_middleware(
        GlobalIPAllowlistMiddleware,
        ip_allowlist_service=IPAllowlistService(),
        admin_prefix="/api/admin"
    )

    # Add Super Admin security middleware
    app.add_middleware(SuperAdminSecurityMiddleware)

    # Include API router
    app.include_router(api_router, prefix=settings.API_V1_STR)

    # Include WebSocket router
    app.include_router(websocket_router)

    # Include v2 orders router
    app.include_router(
        v2_orders.router, prefix="/api/v2/orders", tags=["orders_v2"])

    # Include admin IP allowlist router for management
    app.include_router(admin_ip_allowlist_router.router, prefix="/api/admin")

    # Include main admin router for unified dashboard
    app.include_router(admin_router, prefix="/api/admin")

    # Test endpoint to verify environment variables
    @app.get("/test-env")
    async def test_env(settings: Settings = Depends(get_settings)):
        return {
            "project_name": settings.PROJECT_NAME,
            "postgres_server": settings.POSTGRES_SERVER,
            "cloudinary_configured": bool(settings.CLOUDINARY_CLOUD_NAME),
            "twilio_configured": bool(settings.TWILIO_ACCOUNT_SID),
        }

    @app.get("/")
    def root():
        return {
            "message": "Backend is running. Use /test-env to check environment variables."
        }

    @app.get("/health")
    def health_check():
        return {"status": "ok"}

    @app.get("/test-settings")
    async def test_settings():
        """Test endpoint to verify environment variables are loaded correctly"""
        from app.core.config.settings import get_settings

        settings = get_settings()

        return {
            "status": "success",
            "settings": {
                "project_name": settings.PROJECT_NAME,
                "database_configured": bool(settings.DATABASE_URL),
                "cloudinary_configured": bool(settings.CLOUDINARY_CLOUD_NAME),
                "twilio_configured": bool(settings.TWILIO_ACCOUNT_SID),
                "postgres_server": settings.POSTGRES_SERVER,
                "api_version": settings.API_V1_STR,
            },
        }

    # Add Prometheus metrics endpoint
    app.mount("/metrics", make_asgi_app())

    return app


# Create the app instance
app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
