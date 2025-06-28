"""
Async database engine configuration for application runtime.
"""
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.db.engines.base import get_database_url


def get_async_engine():
    """
    Create and return an async SQLAlchemy engine using asyncpg.
    Always uses the current environment settings.
    """
    # Always get the current database URL to ensure we're using the right DB
    # This is especially important for tests where the environment changes
    database_url = get_database_url(use_async_driver=True)
    
    # Get current settings for connect args
    from app.core.config.settings import get_settings
    settings = get_settings()
    
    return create_async_engine(
        database_url,
        # Important performance and behavior settings
        pool_pre_ping=True,  # Verify connections before use
        echo=False,  # Don't log all SQL (turn on for debugging only)
        future=True,  # Use SQLAlchemy 2.0 features
        connect_args={
            "timeout": getattr(settings, "DB_CONNECT_TIMEOUT", 30),  # Use settings if available
        }
    )


def get_async_session_maker():
    """
    Create and return an async session maker.
    """
    engine = get_async_engine()
    return async_sessionmaker(
        engine, 
        expire_on_commit=False, 
        class_=AsyncSession
    )
