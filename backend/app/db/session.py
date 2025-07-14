"""Synchronous session management module.

This module provides the sync session for Alembic migrations and any legacy sync code.
Prefer the async_session module for all new application code.
"""
from contextlib import contextmanager
from typing import Generator

from sqlalchemy.orm import Session
from app.db.engines.sync_engine import get_sync_engine, get_sync_session_maker

# Create a session maker for sync code
SessionLocal = get_sync_session_maker()


@contextmanager
def get_db() -> Generator[Session, None, None]:
    """Get a database session for synchronous code.

    This should only be used for background jobs or Alembic migrations.
    New application code should use the async session instead.
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise
    finally:
        db.close()

# For compatibility with legacy code and tests
