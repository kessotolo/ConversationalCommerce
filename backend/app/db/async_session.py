"""Async session management with modern dependency-injectable approach.

This module provides the async session for application usage,
building on the unified engine infrastructure.
"""
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.db.engines.async_engine import get_async_session_maker


async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency-injectable async session for FastAPI endpoints.

    Example usage:
        @app.get("/items/")
        async def read_items(db: AsyncSession = Depends(get_async_db)):
            items = await db.execute(select(Item))
            return items.scalars().all()
    """
    session_maker = get_async_session_maker()
    async with session_maker() as session:
        try:
            yield session
            await session.commit()
        except SQLAlchemyError:
            await session.rollback()
            raise


def get_async_session_local():
    """Legacy compatibility function - prefer get_async_db() for new code."""
    return get_async_session_maker()
