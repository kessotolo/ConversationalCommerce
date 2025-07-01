"""
Admin-specific configuration settings.
"""

from pydantic import BaseSettings


class AdminSettings(BaseSettings):
    """Admin-specific settings."""
    
    # Admin domain configuration
    ADMIN_DOMAIN: str = "admin.yourplatform.com"
    
    # JWT configuration for admin domain
    ADMIN_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8  # 8 hours (shorter than regular tokens)
    
    # Security settings
    ADMIN_REQUIRE_2FA: bool = True
    ADMIN_SESSION_INACTIVITY_TIMEOUT: int = 30  # minutes
    
    # IP restriction settings (optional)
    ADMIN_ENFORCE_IP_RESTRICTIONS: bool = True
    
    class Config:
        env_prefix = "ADMIN_"
        case_sensitive = True
        env_file = ".env"


admin_settings = AdminSettings()
