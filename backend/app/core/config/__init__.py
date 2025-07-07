# This file marks the config directory as a Python package.

from .settings import Settings, get_settings

__all__ = ["Settings", "get_settings"]
