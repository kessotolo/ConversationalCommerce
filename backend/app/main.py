from fastapi import FastAPI, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.api import api_router
from app.core.config.settings import Settings, get_settings
from app.core.middleware.rate_limit import RateLimitMiddleware
from app.core.middleware.activity_tracker import ActivityTrackerMiddleware
from app.core.errors.exception_handlers import register_exception_handlers
from starlette.middleware.base import BaseHTTPMiddleware
from dotenv import load_dotenv
from pathlib import Path
import time
import logging
from app.db.session import set_tenant_id, SessionLocal
from app.models.tenant import Tenant
from app.api.v1.endpoints.websocket import router as websocket_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# Load environment variables from the .env file in the backend directory
env_path = Path(__file__).parent.parent.parent / '.env'
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
                f"Slow request: {request.method} {request.url.path} took {process_time:.2f}s")

        return response


class TenantMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Skip tenant check for public endpoints
        if self._is_public_path(request.url.path):
            return await call_next(request)

        tenant_id = request.headers.get('X-Tenant-ID')
        if not tenant_id:
            return Response("Missing X-Tenant-ID header", status_code=400)

        try:
            # Validate UUID format
            from uuid import UUID
            tenant_uuid = UUID(tenant_id)

            # Store tenant_id in request.state for use in dependencies
            request.state.tenant_id = str(tenant_uuid)

            # Set tenant_id in DB session for this request
            db = SessionLocal()

            # Validate tenant exists
            tenant = db.query(Tenant).filter(Tenant.id == tenant_uuid).first()
            if not tenant:
                db.close()
                return Response(f"Invalid tenant ID: {tenant_id}", status_code=403)

            set_tenant_id(db, str(tenant_uuid))
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
            # Make sure to close the db connection
            if hasattr(request.state, 'db'):
                request.state.db.close()

    def _is_public_path(self, path: str) -> bool:
        """Check if the path is a public endpoint that doesn't require tenant isolation"""
        public_paths = [
            "/",
            "/health",
            "/test-env",
            "/test-settings",
            "/docs",
            "/redoc",
            "/openapi.json"
        ]

        # Check if path exactly matches any public path or starts with one
        return any(path == public_path or path.startswith(f"{public_path}/") for public_path in public_paths)


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title=settings.PROJECT_NAME,
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        # Add debug flag based on environment
        debug=(settings.ENVIRONMENT != "production")
    )

    # Register exception handlers
    register_exception_handlers(app)

    # Add request timing middleware
    app.add_middleware(RequestTimingMiddleware)

    # Add rate limiting middleware
    app.add_middleware(RateLimitMiddleware)

    # Add activity tracking middleware
    app.add_middleware(
        ActivityTrackerMiddleware,
        skip_paths={
            '/docs',
            '/redoc',
            '/openapi.json',
            '/health',
            '/metrics',
            '/ws/monitoring'
        }
    )

    # Add tenant middleware
    app.add_middleware(TenantMiddleware)

    # Set up CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include API router
    app.include_router(api_router, prefix=settings.API_V1_STR)

    # Include WebSocket router
    app.include_router(websocket_router)

    # Test endpoint to verify environment variables
    @app.get("/test-env")
    async def test_env(settings: Settings = Depends(get_settings)):
        return {
            "project_name": settings.PROJECT_NAME,
            "postgres_server": settings.POSTGRES_SERVER,
            "cloudinary_configured": bool(settings.CLOUDINARY_CLOUD_NAME),
            "twilio_configured": bool(settings.TWILIO_ACCOUNT_SID)
        }

    @app.get("/")
    def root():
        return {"message": "Backend is running. Use /test-env to check environment variables."}

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
                "api_version": settings.API_V1_STR
            }
        }

    return app


# Create the application instance
app = create_app()
