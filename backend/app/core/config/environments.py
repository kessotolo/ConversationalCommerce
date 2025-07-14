"""
Environment-specific configuration settings.

Defines settings for development, UAT, and production environments.
"""

import os
from enum import Enum
from typing import Optional
from pydantic import BaseModel


class Environment(str, Enum):
    """Environment types."""
    DEVELOPMENT = "development"
    UAT = "uat"
    PRODUCTION = "production"


class DatabaseConfig(BaseModel):
    """Database configuration for each environment."""
    host: str
    port: int
    database: str
    username: str
    password: str
    pool_size: int = 10
    max_overflow: int = 20


class RedisConfig(BaseModel):
    """Redis configuration for each environment."""
    host: str
    port: int
    password: Optional[str] = None
    database: int = 0


class EnvironmentConfig(BaseModel):
    """Complete environment configuration."""
    environment: Environment
    debug: bool
    database: DatabaseConfig
    redis: RedisConfig
    cors_origins: list[str]
    allowed_hosts: list[str]
    api_prefix: str = "/api/v1"
    admin_prefix: str = "/api/admin"

    # Security settings
    secret_key: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expiry_hours: int = 24

    # External services
    clerk_secret_key: Optional[str] = None
    cloudinary_url: Optional[str] = None
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None

    # Monitoring
    sentry_dsn: Optional[str] = None
    log_level: str = "INFO"

    # Rate limiting
    rate_limit_requests: int = 100
    rate_limit_window: int = 60  # seconds

    # File upload
    max_file_size: int = 10 * 1024 * 1024  # 10MB
    allowed_file_types: list[str] = [
        "jpg", "jpeg", "png", "gif", "pdf", "doc", "docx"]


def get_environment() -> Environment:
    """Get current environment from environment variable."""
    env = os.getenv("ENVIRONMENT", "development").lower()
    try:
        return Environment(env)
    except ValueError:
        return Environment.DEVELOPMENT


def get_environment_config() -> EnvironmentConfig:
    """Get configuration for current environment."""
    env = get_environment()

    if env == Environment.DEVELOPMENT:
        return _get_development_config()
    elif env == Environment.UAT:
        return _get_uat_config()
    else:
        return _get_production_config()


def _get_development_config() -> EnvironmentConfig:
    """Development environment configuration."""
    return EnvironmentConfig(
        environment=Environment.DEVELOPMENT,
        debug=True,
        database=DatabaseConfig(
            host=os.getenv("DEV_DB_HOST", "localhost"),
            port=int(os.getenv("DEV_DB_PORT", "5432")),
            database=os.getenv("DEV_DB_NAME", "conversationalcommerce_dev"),
            username=os.getenv("DEV_DB_USER", "postgres"),
            password=os.getenv("DEV_DB_PASSWORD", "password"),
            pool_size=5,
            max_overflow=10
        ),
        redis=RedisConfig(
            host=os.getenv("DEV_REDIS_HOST", "localhost"),
            port=int(os.getenv("DEV_REDIS_PORT", "6379")),
            password=os.getenv("DEV_REDIS_PASSWORD"),
            database=0
        ),
        cors_origins=[
            "http://localhost:3000",
            "http://localhost:3001",
            "http://dev.enwhe.io",
            "https://dev.enwhe.io"
        ],
        allowed_hosts=[
            "localhost",
            "127.0.0.1",
            "dev.enwhe.io"
        ],
        secret_key=os.getenv(
            "DEV_SECRET_KEY", "dev-secret-key-change-in-production"),
        jwt_secret=os.getenv(
            "DEV_JWT_SECRET", "dev-jwt-secret-change-in-production"),
        clerk_secret_key=os.getenv("DEV_CLERK_SECRET_KEY"),
        cloudinary_url=os.getenv("DEV_CLOUDINARY_URL"),
        twilio_account_sid=os.getenv("DEV_TWILIO_ACCOUNT_SID"),
        twilio_auth_token=os.getenv("DEV_TWILIO_AUTH_TOKEN"),
        log_level="DEBUG",
        rate_limit_requests=1000,  # More lenient in dev
        rate_limit_window=60
    )


def _get_uat_config() -> EnvironmentConfig:
    """UAT environment configuration."""
    return EnvironmentConfig(
        environment=Environment.UAT,
        debug=False,
        database=DatabaseConfig(
            host=os.getenv("UAT_DB_HOST", "uat-db.enwhe.io"),
            port=int(os.getenv("UAT_DB_PORT", "5432")),
            database=os.getenv("UAT_DB_NAME", "conversationalcommerce_uat"),
            username=os.getenv("UAT_DB_USER", "uat_user"),
            password=os.getenv("UAT_DB_PASSWORD"),
            pool_size=20,
            max_overflow=30
        ),
        redis=RedisConfig(
            host=os.getenv("UAT_REDIS_HOST", "uat-redis.enwhe.io"),
            port=int(os.getenv("UAT_REDIS_PORT", "6379")),
            password=os.getenv("UAT_REDIS_PASSWORD"),
            database=1
        ),
        cors_origins=[
            "https://uat.enwhe.io",
            "https://admin.uat.enwhe.io",
            "https://app.uat.enwhe.io"
        ],
        allowed_hosts=[
            "uat.enwhe.io",
            "admin.uat.enwhe.io",
            "app.uat.enwhe.io",
            "api.uat.enwhe.io"
        ],
        secret_key=os.getenv("UAT_SECRET_KEY"),
        jwt_secret=os.getenv("UAT_JWT_SECRET"),
        clerk_secret_key=os.getenv("UAT_CLERK_SECRET_KEY"),
        cloudinary_url=os.getenv("UAT_CLOUDINARY_URL"),
        twilio_account_sid=os.getenv("UAT_TWILIO_ACCOUNT_SID"),
        twilio_auth_token=os.getenv("UAT_TWILIO_AUTH_TOKEN"),
        sentry_dsn=os.getenv("UAT_SENTRY_DSN"),
        log_level="INFO",
        rate_limit_requests=500,
        rate_limit_window=60
    )


def _get_production_config() -> EnvironmentConfig:
    """Production environment configuration."""
    return EnvironmentConfig(
        environment=Environment.PRODUCTION,
        debug=False,
        database=DatabaseConfig(
            host=os.getenv("PROD_DB_HOST", "prod-db.enwhe.io"),
            port=int(os.getenv("PROD_DB_PORT", "5432")),
            database=os.getenv("PROD_DB_NAME", "conversationalcommerce_prod"),
            username=os.getenv("PROD_DB_USER", "prod_user"),
            password=os.getenv("PROD_DB_PASSWORD"),
            pool_size=50,
            max_overflow=100
        ),
        redis=RedisConfig(
            host=os.getenv("PROD_REDIS_HOST", "prod-redis.enwhe.io"),
            port=int(os.getenv("PROD_REDIS_PORT", "6379")),
            password=os.getenv("PROD_REDIS_PASSWORD"),
            database=0
        ),
        cors_origins=[
            "https://enwhe.io",
            "https://admin.enwhe.io",
            "https://app.enwhe.io",
            "https://*.enwhe.io"  # Allow merchant subdomains
        ],
        allowed_hosts=[
            "enwhe.io",
            "admin.enwhe.io",
            "app.enwhe.io",
            "api.enwhe.io",
            "*.enwhe.io"  # Allow merchant subdomains
        ],
        secret_key=os.getenv("PROD_SECRET_KEY"),
        jwt_secret=os.getenv("PROD_JWT_SECRET"),
        clerk_secret_key=os.getenv("PROD_CLERK_SECRET_KEY"),
        cloudinary_url=os.getenv("PROD_CLOUDINARY_URL"),
        twilio_account_sid=os.getenv("PROD_TWILIO_ACCOUNT_SID"),
        twilio_auth_token=os.getenv("PROD_TWILIO_AUTH_TOKEN"),
        sentry_dsn=os.getenv("PROD_SENTRY_DSN"),
        log_level="WARNING",
        rate_limit_requests=100,
        rate_limit_window=60
    )
