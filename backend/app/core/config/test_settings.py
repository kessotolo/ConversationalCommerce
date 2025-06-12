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
    DATABASE_URL: str = f"postgresql+asyncpg://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_SERVER}/{POSTGRES_DB}"

    # Override any other settings needed for testing
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Test Conversational Commerce Platform"

    # Mock Clerk JWT settings for tests
    CLERK_JWT_PUBLIC_KEY: str = "mock_public_key_for_testing"
    CLERK_JWT_AUDIENCE: str = "mock_audience_for_testing"
    SECRET_KEY: str = "mock_secret_key_for_testing"

    model_config = ConfigDict(
        case_sensitive=True,
        env_file=".env.test",
        extra="ignore"  # Ignore extra fields like TEST_DATABASE_URL in environment
    )
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # If TEST_DATABASE_URL is explicitly provided in env, use it directly
        test_db_url = os.environ.get("TEST_DATABASE_URL")
        if test_db_url:
            self.DATABASE_URL = test_db_url


@lru_cache()
def get_test_settings() -> TestSettings:
    return TestSettings()
