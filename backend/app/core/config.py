# Legacy config.py file for backward compatibility
# This file redirects to the new config structure

from .config.settings import Settings, get_settings

# Export for backward compatibility
settings = get_settings()

__all__ = ["Settings", "get_settings", "settings"]
