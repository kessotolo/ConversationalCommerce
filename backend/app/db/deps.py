from app.app.db.async_session import get_async_session_local
from sqlalchemy.ext.asyncio import AsyncSession


from typing import AsyncGenerator


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Get database session for async operations.
    Returns:
        AsyncGenerator[AsyncSession, None]: Database session generator
    """
    async_session_local = get_async_session_local()
    async with async_session_local() as session:
        yield session

# Alias for compatibility
async_get_db = get_db
