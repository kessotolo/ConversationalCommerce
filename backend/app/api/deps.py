"""
Dependencies for API endpoints.
"""

import uuid
from functools import lru_cache
from typing import Any, Dict, Optional

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security.clerk import ClerkTokenData
from app.core.security.dependencies import require_auth
from app.db.async_session import get_async_session_local
from app.models.storefront import StorefrontConfig
from app.models.tenant import Tenant


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


def get_current_user(request: Request = None) -> ClerkTokenData:
    """
    Get the current authenticated user.
    Wrapper around require_auth for backward compatibility.
    """
    return require_auth(request)


@lru_cache(maxsize=128)
def get_tenant_by_id(db: AsyncSession, tenant_id: uuid.UUID) -> Optional[Tenant]:
    """
    Get a tenant by ID with caching to avoid repeated DB lookups.

    Args:
        db: Database session
        tenant_id: UUID of the tenant

    Returns:
        Tenant object or None if not found
    """
    return db.query(Tenant).filter(Tenant.id == tenant_id).first()


def get_tenant_context(request: Request) -> Dict[str, Any]:
    """
    Get the current tenant context from the request state.
    If no tenant context is found, returns a default context.

    Args:
        request: FastAPI request object

    Returns:
        Tenant context dictionary
    """
    # Check if tenant context is in request state (set by middleware)
    if hasattr(request.state, "tenant_context") and request.state.tenant_context:
        return request.state.tenant_context

    # Return a default context for non-tenant requests
    return {
        "tenant_id": None,
        "tenant_name": None,
        "storefront_id": None,
        "subdomain": None,
        "custom_domain": None,
        "theme_settings": {},
    }


def get_current_tenant_id(request: Request) -> uuid.UUID:
    """
    Get the current tenant ID from the request context.
    Raises an HTTPException if no tenant context is found.

    Args:
        request: FastAPI request object

    Returns:
        UUID of the current tenant

    Raises:
        HTTPException: If no tenant context is found
    """
    tenant_context = get_tenant_context(request)

    if not tenant_context["tenant_id"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found in request context",
        )

    return uuid.UUID(tenant_context["tenant_id"])


def get_current_storefront_config(
    db: AsyncSession, tenant_id: uuid.UUID = Depends(get_current_tenant_id)
) -> StorefrontConfig:
    """
    Get the current storefront configuration for the tenant.

    Args:
        db: Database session
        tenant_id: UUID of the tenant

    Returns:
        StorefrontConfig for the tenant

    Raises:
        HTTPException: If no storefront config is found
    """
    config = (
        db.query(StorefrontConfig)
        .filter(StorefrontConfig.tenant_id == tenant_id)
        .first()
    )

    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Storefront configuration not found",
        )

    return config


def get_current_user_optional(request: Request = None) -> Optional[ClerkTokenData]:
    """
    Try to get the current authenticated user, but return None if not authenticated.
    """
    try:
        return require_auth(request)
    except AppError:
        return None


async def get_current_tenant(
    db: AsyncSession = Depends(get_db),
    request: Request = None
) -> Optional[Tenant]:
    """
    Dependency to get the current Tenant object from the request context.
    """
    tenant_context = get_tenant_context(request)
    tenant_id = tenant_context.get("tenant_id")
    if not tenant_id:
        return None
    return await db.get(Tenant, uuid.UUID(tenant_id))


def get_current_buyer(request: Request = None):
    """
    Returns an object with buyer.id and buyer.tenant_id from the current session.
    """
    user = get_current_user(request)
    tenant_id = get_current_tenant_id(request)
    if not user or not tenant_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated as buyer")
    return type("BuyerCtx", (), {"id": user.sub, "tenant_id": tenant_id})()
