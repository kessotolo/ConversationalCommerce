"""
Synchronous database engine configuration for Alembic migrations.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.engines.base import get_database_url


def get_sync_engine():
    """
    Create and return a synchronous SQLAlchemy engine using psycopg2.
    
    This engine is specifically for Alembic migrations and any sync operations.
    The application code should use the async engine instead.
    """
    database_url = get_database_url(use_async_driver=False)
    return create_engine(
        database_url,
        # Important settings for migrations
        pool_pre_ping=True,  # Verify connections
        echo=False,  # Don't log all SQL
        future=True,  # Use SQLAlchemy 2.0 features
        connect_args={
            "connect_timeout": 30,  # Increase timeout for reliability
            "options": "-c search_path=public"  # Set search path for PostgreSQL
        }
    )


def get_sync_session_maker():
    """
    Create and return a synchronous session maker.
    
    This should only be used for migrations or background tasks that can't use async.
    """
    engine = get_sync_engine()
    return sessionmaker(
        autocommit=False, 
        autoflush=False, 
        bind=engine
    )
