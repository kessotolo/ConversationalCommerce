from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class Settings(BaseSettings):
    # API Settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Conversational Commerce Platform"

    # Security
    SECRET_KEY: str = Field(..., min_length=32)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days

    # Database
    POSTGRES_SERVER: str = Field(...)
    POSTGRES_USER: str = Field(...)
    POSTGRES_PASSWORD: str = Field(...)
    POSTGRES_DB: str = Field(...)
    DATABASE_URL: Optional[str] = None

    # External Services
    CLOUDINARY_CLOUD_NAME: str = Field(...)
    CLOUDINARY_API_KEY: str = Field(...)
    CLOUDINARY_API_SECRET: str = Field(...)

    TWILIO_ACCOUNT_SID: str = Field(...)
    TWILIO_AUTH_TOKEN: str = Field(...)
    TWILIO_PHONE_NUMBER: str = Field(...)

    # CORS
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    model_config = ConfigDict(
        case_sensitive=True,
        env_file=".env"
    )

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.DATABASE_URL:
            self.DATABASE_URL = f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}/{self.POSTGRES_DB}"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
