from fastapi import FastAPI, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.api import api_router
from app.core.config.settings import Settings, get_settings
from app.core.middleware.rate_limit import RateLimitMiddleware
from app.core.errors.exception_handlers import register_exception_handlers
from starlette.middleware.base import BaseHTTPMiddleware
from dotenv import load_dotenv
from pathlib import Path
import time
import logging

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
            logger.warning(f"Slow request: {request.method} {request.url.path} took {process_time:.2f}s")
            
        return response


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
    app.add_middleware(RateLimitMiddleware, requests_per_minute=60)

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
