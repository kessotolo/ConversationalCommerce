"""
Dependencies for API endpoints.
"""
from fastapi import Depends, Request, HTTPException, status
from sqlalchemy.orm import Session
import uuid
from functools import lru_cache
from typing import Dict, Any, Optional

from app.db.session import SessionLocal
from app.core.security.dependencies import require_auth
from app.core.security.clerk import ClerkTokenData
from app.models.tenant import Tenant
from app.models.storefront import StorefrontConfig


def get_db():
    """
    Get database session.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(request: Request = None) -> ClerkTokenData:
    """
    Get the current authenticated user.
    Wrapper around require_auth for backward compatibility.
    """
    return require_auth(request)


@lru_cache(maxsize=128)
def get_tenant_by_id(db: Session, tenant_id: uuid.UUID) -> Optional[Tenant]:
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
        "theme_settings": {}
    }


def get_current_tenant_id(request: Request = Depends()) -> uuid.UUID:
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
            detail="Tenant not found in request context"
        )
    
    return uuid.UUID(tenant_context["tenant_id"])


def get_current_storefront_config(db: Session = Depends(get_db), tenant_id: uuid.UUID = Depends(get_current_tenant_id)) -> StorefrontConfig:
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
    config = db.query(StorefrontConfig).filter(StorefrontConfig.tenant_id == tenant_id).first()
    
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Storefront configuration not found"
        )
    
    return config
