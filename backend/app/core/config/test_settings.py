from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional
from pydantic import BaseModel, ConfigDict
import os


class TestSettings(BaseSettings):
    # Test settings for database - use local PostgreSQL for testing
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "localhost")
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "conversational_commerce")
    DATABASE_URL: str = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_SERVER}/{POSTGRES_DB}"
    
    # Override any other settings needed for testing
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Test Conversational Commerce Platform"
    
    # Mock Clerk JWT settings for tests
    CLERK_JWT_PUBLIC_KEY: str = "mock_public_key_for_testing"
    CLERK_JWT_AUDIENCE: str = "mock_audience_for_testing"
    SECRET_KEY: str = "mock_secret_key_for_testing"
    
    model_config = ConfigDict(
        case_sensitive=True,
        env_file=".env.test"
    )


@lru_cache()
def get_test_settings() -> TestSettings:
    return TestSettings()
