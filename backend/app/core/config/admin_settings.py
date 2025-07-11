"""
Admin-specific configuration settings.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class AdminSettings(BaseSettings):
    """
    Admin-specific settings for the super admin backend (admin.enwhe.io).
    These settings do NOT affect seller/buyer/main app flows.

    - ADMIN_DOMAIN: The domain for the admin backend (e.g., admin.enwhe.io)
    - ADMIN_ACCESS_TOKEN_EXPIRE_MINUTES: JWT expiration for admin sessions (shorter than regular tokens)
    - ADMIN_REQUIRE_2FA: Require two-factor authentication for all admin users
    - ADMIN_SESSION_INACTIVITY_TIMEOUT: Session idle timeout in minutes
    - ADMIN_ENFORCE_IP_RESTRICTIONS: Enforce global IP allowlisting for all admin endpoints
    - WEBHOOK_SECRET_KEY: Secret key for webhook authentication
    """

    # Admin domain configuration
    ADMIN_DOMAIN: str = "admin.yourplatform.com"

    # JWT configuration for admin domain
    ADMIN_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * \
        8  # 8 hours (shorter than regular tokens)

    # Security settings
    ADMIN_REQUIRE_2FA: bool = True
    ADMIN_SESSION_INACTIVITY_TIMEOUT: int = 30  # minutes

    # IP restriction settings (optional)
    ADMIN_ENFORCE_IP_RESTRICTIONS: bool = True

    # Webhook authentication
    WEBHOOK_SECRET_KEY: str = "test_webhook_secret_key"

    model_config = SettingsConfigDict(
        env_prefix="ADMIN_",
        case_sensitive=True,
        env_file=".env",
        extra="ignore"  # Allow extra fields from environment
    )


admin_settings = AdminSettings()
