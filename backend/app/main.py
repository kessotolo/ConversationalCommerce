from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.api import api_router
from app.core.config.settings import Settings, get_settings
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from the .env file in the backend directory
env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(dotenv_path=env_path, override=True)

# Initialize settings after environment variables are loaded
settings = get_settings()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

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
