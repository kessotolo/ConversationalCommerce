from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.api import api_router
from app.core.config.settings import Settings
from dotenv import load_dotenv

load_dotenv()

settings = Settings()

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


@app.get("/")
def root():
    return {"message": "Backend is live "}


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
