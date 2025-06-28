import os
from functools import lru_cache

from pydantic import ConfigDict
from pydantic_settings import BaseSettings


class TestSettings(BaseSettings):
    # Test settings for database - use local PostgreSQL for testing
    POSTGRES_SERVER: str = "127.0.0.1"  # Force localhost
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "conversational_commerce_test"

    # Explicitly set both sync and async URLs
    DATABASE_URL: str = (
        f"postgresql+asyncpg://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_SERVER}/{POSTGRES_DB}"
    )
    DATABASE_URL_SYNC: str = (
        f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_SERVER}/{POSTGRES_DB}"
    )

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
        extra="ignore",  # Ignore extra fields like TEST_DATABASE_URL in environment
    )

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # If TEST_DATABASE_URL is explicitly provided in env, use it directly
        test_db_url = os.environ.get("TEST_DATABASE_URL")
        if test_db_url:
            self.DATABASE_URL = test_db_url
            # Also update sync URL if it's an async URL
            if test_db_url.startswith("postgresql+asyncpg"):
                self.DATABASE_URL_SYNC = test_db_url.replace(
                    "postgresql+asyncpg", "postgresql"
                )


@lru_cache()
def get_test_settings() -> TestSettings:
    return TestSettings()
