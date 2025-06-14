from sqlalchemy import create_engine, text
from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import sessionmaker
from app.core.config.settings import Settings

settings = Settings()

# Get the proper database URL from settings using the getter method
SQLALCHEMY_DATABASE_URL = settings.get_database_url

# Only create async engine/session when explicitly requested (not at import time)


def get_async_engine():
    return create_async_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"timeout": 15}
    )


def get_async_session_local():
    async_engine = get_async_engine()
    return async_sessionmaker(
        async_engine, expire_on_commit=False, class_=AsyncSession
    )

# Usage in app: AsyncSessionLocal = get_async_session_local()
# Do not create AsyncSessionLocal at import time


# Legacy sync version for test compatibility
# This is kept for backwards compatibility with tests
# New code should use AsyncSession directly
engine = create_engine(SQLALCHEMY_DATABASE_URL,
                       connect_args={"connect_timeout": 15})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
# End legacy sync support


async def set_tenant_id(session: AsyncSession, tenant_id):
    """
    Set the PostgreSQL session variable for tenant context (RLS enforcement).
    This ensures all queries in this session are scoped to the given tenant_id.
    """
    # Use SET LOCAL to ensure transaction-level isolation
    # This helps prevent the 'operation in progress' errors during concurrent connections
    await session.execute(text(f"SET LOCAL my.tenant_id = '{tenant_id}'"))


async def get_db(request: Request = None):
    """
    Async DB dependency that sets tenant context from request state.
    Ensures all DB access is async and tenant-aware for RLS enforcement.
    """
    AsyncSessionLocal = get_async_session_local()
    async with AsyncSessionLocal() as db:
        if request and hasattr(request.state, 'tenant_id'):
            await set_tenant_id(db, request.state.tenant_id)
        yield db

# (Legacy sync version for reference)
# def get_db(request: Request = None):
#     db = SessionLocal()
#     try:
#         if request and hasattr(request.state, 'tenant_id'):
#             set_tenant_id(db, request.state.tenant_id)
#         yield db
#     finally:
#         db.close()


def get_tenant_id_from_request(request: Request):
    """Extracts the tenant_id from request state (for use in services)"""
    if hasattr(request.state, 'tenant_id'):
        return request.state.tenant_id
    return None
