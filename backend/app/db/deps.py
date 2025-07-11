from app.db.async_session import get_async_session_local
from sqlalchemy.ext.asyncio import AsyncSession


async def get_db() -> AsyncSession:
    """
    Get database session for async operations.
    Returns:
        AsyncSession: Database session
    """
    async_session_local = get_async_session_local()
    async with async_session_local() as session:
        yield session

# Alias for compatibility
async_get_db = get_db
