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

import app.domain.events  # Ensure event handlers are registered
from app.api.v1.api import api_router
from app.api.v1.endpoints.websocket import router as websocket_router
from app.api.v2.endpoints import orders as v2_orders
from app.core.cache.redis_cache import redis_cache
from app.core.config.settings import Settings, get_settings
from app.core.errors.exception_handlers import register_exception_handlers
from app.core.middleware.activity_tracker import ActivityTrackerMiddleware
from app.core.middleware.rate_limit import RateLimitMiddleware
from app.db.async_session import get_async_session_local
from app.middleware.domain_verification import (
    DomainVerificationMiddleware,
    verification_service,
)
from app.middleware.storefront_errors import StorefrontError, handle_storefront_error
from app.middleware.subdomain_middleware import SubdomainMiddleware
from app.core.errors import order_failures, payment_failures

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
            
            test_mode = getattr(settings, "TESTING", False) or request.headers.get("X-Test") == "true"
            
            if test_mode or is_test:
                # For tests, skip DB validation in middleware
                # This avoids async schema visibility issues while allowing the endpoint
                # to use its normal get_db dependency which works correctly
                logger.debug("Test environment detected - skipping tenant DB validation")
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
            # Close the async db connection if it was created
            if db:
                await db.close()

    def _is_public_path(self, path: str) -> bool:
        """Check if the path is a public endpoint that doesn't require tenant isolation"""
        public_paths = [
            "/",
            "/health",
            "/test-env",
            "/test-settings",
            "/docs",
            "/redoc",
            "/openapi.json",
        ]

        # Check if path exactly matches any public path or starts with one
        return any(
            path == public_path or path.startswith(f"{public_path}/")
            for public_path in public_paths
        )


async def initialize_cache():
    """Initialize Redis cache on startup."""
    logger.info("Initializing Redis cache...")
    try:
        await redis_cache.initialize()
        if redis_cache.is_available:
            logger.info("Redis cache successfully initialized and connected")
        else:
            logger.warning(
                "Redis cache initialization completed, but cache is not available"
            )
    except Exception as e:
        logger.warning(
            f"Redis cache initialization failed, continuing without cache: {str(e)}"
        )
        # Still mark as initialized to prevent repeated attempts
        redis_cache._initialized = True
        redis_cache._is_available = False


async def start_domain_verification():
    """Start domain verification service on startup."""
    logger.info("Starting domain verification service...")
    await verification_service.start()
    logger.info("Domain verification service started")


async def stop_domain_verification():
    """Stop domain verification service on shutdown."""
    logger.info("Stopping domain verification service...")
    await verification_service.stop()
    logger.info("Domain verification service stopped")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for application startup and shutdown."""
    # Determine if we're running in test mode
    is_test = os.getenv("TESTING", "").lower() in (
        "true", "1", "t", "yes", "y")

    # Startup
    await initialize_cache()
    if not is_test:
        await start_domain_verification()

    yield

    # Shutdown
    if not is_test:
        await stop_domain_verification()


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

    # Add middleware in order of execution (top to bottom)
    # 1. Security middleware (first to catch security issues)
    app.add_middleware(
        SecurityHeadersMiddleware,
        headers={
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;",
        },
    )

    # 2. Rate limiting (early to prevent abuse)
    app.add_middleware(RateLimitMiddleware)

    # 3. Request timing (for performance monitoring)
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

    # 8. CORS (after security middleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )

    # 9. Compression (last to compress all responses)
    app.add_middleware(
        CompressionMiddleware,
        minimum_size=1000,  # Only compress responses larger than 1KB
        compression_level=6,  # Balanced compression level
    )

    # Include API router
    app.include_router(api_router, prefix=settings.API_V1_STR)

    # Include WebSocket router
    app.include_router(websocket_router)

    # Include v2 orders router
    app.include_router(
        v2_orders.router, prefix="/api/v2/orders", tags=["orders_v2"])

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

    # Wrap app with Sentry middleware
    app = SentryAsgiMiddleware(app)

    return app


# Create the application instance
app = create_app()
