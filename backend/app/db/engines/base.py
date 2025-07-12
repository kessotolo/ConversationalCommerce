"""
Base database configuration settings and URL management.

This module provides the foundation for both async and sync database access
while ensuring consistent configuration between application code and migrations.
"""
from typing import Optional
import os
from urllib.parse import urlparse, parse_qs

from backend.app.core.config.settings import get_settings

def get_database_url(*, use_async_driver: bool = True) -> str:
    """
    Get the database URL with the appropriate driver.
    Always uses current environment settings.
    
    Args:
        use_async_driver: If True, uses asyncpg driver, otherwise uses psycopg2
    
    Returns:
        Database URL with appropriate driver
    """
    # Get current settings to ensure we're using the latest environment variables
    # This is especially important for tests where the environment changes
    settings = get_settings()
    
    # Get raw DB URL from settings - access get_database_url as a property, not a method
    url = settings.get_database_url
    
    # Parse URL to extract components
    parsed = urlparse(url)
    
    # Extract any query parameters
    query_params = parse_qs(parsed.query)
    query_string = '&'.join(f"{k}={v[0]}" for k, v in query_params.items()) if query_params else ""
    
    # Determine correct scheme based on driver preference
    if use_async_driver:
        # Ensure we're using asyncpg
        if not parsed.scheme.endswith('+asyncpg'):
            scheme = "postgresql+asyncpg"
        else:
            scheme = parsed.scheme
    else:
        # Use psycopg2 for Alembic/sync operations
        scheme = "postgresql+psycopg2"
    
    # Reconstruct URL with appropriate driver
    netloc = parsed.netloc or ""
    path = parsed.path or ""
    
    result = f"{scheme}://{netloc}{path}"
    if query_string:
        result += f"?{query_string}"
    
    return result
