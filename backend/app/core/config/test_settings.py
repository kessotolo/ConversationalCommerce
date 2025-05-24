from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional
from pydantic import BaseModel, ConfigDict


class TestSettings(BaseSettings):
    # Test settings for database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/test_db"
    
    # Override any other settings needed for testing
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Test Conversational Commerce Platform"
    
    model_config = ConfigDict(
        case_sensitive=True,
        env_file=".env.test"
    )


@lru_cache()
def get_test_settings() -> TestSettings:
    return TestSettings()
