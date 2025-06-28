import os
import sys
from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # API Settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Conversational Commerce Platform"
    ENVIRONMENT: str = "development"  # Options: development, testing, production

    # Security
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days

    # Database
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "conversational_commerce"
    DATABASE_URL: Optional[str] = None

    # Flag to control if we're running in test mode
    TESTING: bool = False

    # External Services
    CLOUDINARY_CLOUD_NAME: str
    CLOUDINARY_API_KEY: str
    CLOUDINARY_API_SECRET: str

    TWILIO_ACCOUNT_SID: str
    TWILIO_AUTH_TOKEN: str
    TWILIO_PHONE_NUMBER: str

    # Storefront Settings
    BASE_DOMAIN: str = "localhost"
    ENABLE_STOREFRONT: bool = True
    SUBDOMAIN_SEPARATOR: str = "."  # How subdomains are separated in local dev

    # CORS Settings
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost",
        "http://localhost:3000",
        "http://127.0.0.1",
        "http://127.0.0.1:3000",
    ]

    # Redis and Caching Settings
    # IMPORTANT: Set REDIS_URL in your environment for production deployments.
    REDIS_URL: str = "redis://localhost:6379/0"
    ENABLE_CACHE: bool = True
    # Redis configuration flags
    REDIS_DISABLED: bool = False  # Set to True to completely disable Redis
    # Set to True to disable Redis in production only
    DISABLE_REDIS_IN_PRODUCTION: bool = False
    # Flag to indicate if running in container environment (for service discovery)
    IS_CONTAINER: bool = False
    CACHE_EXPIRATION: int = 300  # Default cache expiration in seconds
    TWILIO_WHATSAPP_FROM: str = ""  # WhatsApp number with country code (no +)

    # CORS
    BACKEND_CORS_ORIGINS: list[str] = [
        "https://enwhe.io", "https://*.enwhe.io"]

    # Payment/Encryption Secrets
    PAYMENT_REF_SECRET: str = "changeme"

    # Payment Provider Credentials
    PAYSTACK_SECRET_KEY: str = ""
    FLUTTERWAVE_SECRET_KEY: str = ""
    STRIPE_SECRET_KEY: str = ""

    # M-Pesa Credentials
    MPESA_CONSUMER_KEY: str = ""
    MPESA_CONSUMER_SECRET: str = ""
    MPESA_SHORTCODE: str = ""
    MPESA_PASSKEY: str = ""

    # Sendy API Credentials
    SENDY_API_KEY: str = ""
    SENDY_API_USERNAME: str = ""
    SENDY_API_URL: str = "https://api.sendyit.com/v1"
    SENDY_VENDOR_TYPE: str = "express"  # Options: express, motorcycle, pickup

    # New fields
    ASSET_UPLOAD_DIR: str = "/tmp/storefront_assets"
    MAX_UPLOAD_SIZE_MB: int = 10
    CDN_BASE_URL: str = ""

    VALIDATE_WEBHOOK_IPS: bool = False
    REDIS_MAX_CONNECTIONS: int = 10
    REDIS_SOCKET_TIMEOUT: int = 5

    model_config = SettingsConfigDict(
        env_file=[
            "backend/.env.test",
            "backend/.env.local",
            "backend/.env",
            ".env.test",
            ".env.local",
            ".env",
        ],
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",  # Ignore extra fields in .env
    )

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

        # Check if we're in a test environment
        is_test = os.getenv("TESTING", "").lower() in (
            "true", "1", "t", "yes", "y")

        # If we're in a test environment, use the test database URL
        if is_test:
            test_db_url = os.environ.get(
                "TEST_DATABASE_URL",
                "postgresql+asyncpg://postgres:postgres@localhost/conversational_commerce",
            )
            self.DATABASE_URL = test_db_url

        # For production deployment, ensure we have a valid DATABASE_URL
        if self.ENVIRONMENT == "production" and not self.DATABASE_URL:
            self.DATABASE_URL = f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}/{self.POSTGRES_DB}"

    @property
    def get_database_url(self) -> str:
        # If DATABASE_URL is explicitly set, use it
        if self.DATABASE_URL:
            return self.DATABASE_URL

        # For all environments, use the configured PostgreSQL server
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}/{self.POSTGRES_DB}"


def is_test_environment() -> bool:
    """Detect if we're running in a test environment"""
    return "pytest" in sys.modules


@lru_cache()
def get_settings() -> Settings:
    # Create settings instance with appropriate environment variables
    return Settings()
