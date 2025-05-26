from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from typing import Optional, List
import os
import sys

class Settings(BaseSettings):
    # API Settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Conversational Commerce Platform"
    ENVIRONMENT: str = "development"  # Options: development, testing, production

    # Security
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days

    # Database
    POSTGRES_SERVER: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    DATABASE_URL: Optional[str] = None

    # External Services
    CLOUDINARY_CLOUD_NAME: str
    CLOUDINARY_API_KEY: str
    CLOUDINARY_API_SECRET: str

    TWILIO_ACCOUNT_SID: str
    TWILIO_AUTH_TOKEN: str
    TWILIO_PHONE_NUMBER: str
    TWILIO_WHATSAPP_FROM: str = ""  # WhatsApp number with country code (no +)

    # CORS
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    model_config = SettingsConfigDict(
        env_file=['.env.test', '.env.local', '.env'],
        env_file_encoding='utf-8',
        case_sensitive=True,
        extra='ignore'  # Ignore extra fields in .env
    )

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.DATABASE_URL:
            self.DATABASE_URL = f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}/{self.POSTGRES_DB}"

def is_test_environment() -> bool:
    """Detect if we're running in a test environment"""
    return 'pytest' in sys.modules

@lru_cache()
def get_settings() -> Settings:
    # Create settings instance with appropriate environment variables
    return Settings()
