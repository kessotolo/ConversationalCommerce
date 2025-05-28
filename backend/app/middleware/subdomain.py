import logging
from typing import Optional, Dict, Any, Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from sqlalchemy.orm import Session
import uuid

from app.db.session import SessionLocal
from app.models.tenant import Tenant
from app.models.storefront import StorefrontConfig
from app.utils.domain_validator import validate_subdomain
from app.core.cache.redis_cache import redis_cache
from app.core.config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Cache duration for tenant lookups (1 hour)
TENANT_CACHE_DURATION = 3600


class SubdomainMiddleware(BaseHTTPMiddleware):
    """
    Middleware that extracts tenant information from subdomains and custom domains.
    
    This middleware extracts the tenant context from the request's Host header,
    either by parsing a subdomain or by looking up a custom domain. It then
    stores this context in request.state for access by route handlers.
    """
    
    def __init__(
        self,
        app: ASGIApp,
        base_domain: str = None,
        subdomain_separator: str = ".",
        exclude_paths: list = None
    ):
        super().__init__(app)
        self.base_domain = base_domain or settings.BASE_DOMAIN
        self.subdomain_separator = subdomain_separator or settings.SUBDOMAIN_SEPARATOR
        self.exclude_paths = exclude_paths or ["/api/v1/admin/", "/admin/", "/_next/", "/static/"]
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process the request and extract tenant information."""
        # Skip middleware for excluded paths
        if any(request.url.path.startswith(path) for path in self.exclude_paths):
            return await call_next(request)
        
        # Extract host from headers
        host = request.headers.get("host", "")
        
        # Extract tenant context from host
        tenant_context = await self._get_tenant_context(host)
        
        # Store tenant context in request state
        request.state.tenant_context = tenant_context
        
        # Continue processing the request
        response = await call_next(request)
        
        return response
    
    async def _get_tenant_context(self, host: str) -> Dict[str, Any]:
        """
        Extract tenant context from host header.
        
        Args:
            host: Host header value
            
        Returns:
            Tenant context dictionary
        """
        # Default tenant context (no tenant)
        default_context = {
            "tenant_id": None,
            "subdomain": None,
            "custom_domain": None,
            "is_active": False,
            "storefront_enabled": False
        }
        
        # Skip processing for empty host or localhost without subdomain
        if not host or host == "localhost" or host == "127.0.0.1":
            return default_context
        
        # Clean the host (remove port if present)
        if ":" in host:
            host = host.split(":")[0]
        
        # Check if this is a custom domain or a subdomain
        is_subdomain = self.base_domain in host
        
        if is_subdomain:
            # Extract subdomain from host
            subdomain = self._extract_subdomain(host)
            if not subdomain:
                return default_context
            
            # Look up tenant by subdomain
            return await self._get_tenant_by_subdomain(subdomain)
        else:
            # Look up tenant by custom domain
            return await self._get_tenant_by_custom_domain(host)
    
    def _extract_subdomain(self, host: str) -> Optional[str]:
        """
        Extract subdomain from host.
        
        Args:
            host: Host header value
            
        Returns:
            Subdomain or None if not found
        """
        # Handle case where there is no subdomain
        if host == self.base_domain:
            return None
        
        # Extract subdomain part
        parts = host.split(self.subdomain_separator)
        if len(parts) <= 1 or parts[-1] != self.base_domain.replace(".", ""):
            return None
        
        # Get subdomain (everything before the base domain)
        subdomain = parts[0]
        
        # Validate subdomain
        is_valid, _ = validate_subdomain(subdomain)
        if not is_valid:
            return None
        
        return subdomain
    
    async def _get_tenant_by_subdomain(self, subdomain: str) -> Dict[str, Any]:
        """
        Look up tenant by subdomain.
        
        Args:
            subdomain: Subdomain to look up
            
        Returns:
            Tenant context dictionary
        """
        # Try to get from cache first
        cache_key = f"tenant:subdomain:{subdomain}"
        if redis_cache.is_available:
            cached_context = await redis_cache.get(cache_key)
            if cached_context:
                return cached_context
        
        # Not in cache, query database
        db = SessionLocal()
        try:
            # Query for StorefrontConfig and related Tenant
            config = (
                db.query(StorefrontConfig)
                .join(Tenant)
                .filter(StorefrontConfig.subdomain == subdomain)
                .filter(Tenant.is_active == True)
                .filter(Tenant.storefront_enabled == True)
                .first()
            )
            
            if not config:
                # No matching tenant found
                return {
                    "tenant_id": None,
                    "subdomain": subdomain,
                    "custom_domain": None,
                    "is_active": False,
                    "storefront_enabled": False
                }
            
            # Create tenant context
            tenant_context = {
                "tenant_id": str(config.tenant_id),
                "subdomain": subdomain,
                "custom_domain": None,
                "is_active": True,
                "storefront_enabled": True,
                "tenant_name": config.tenant.name if config.tenant else None,
                "theme": config.theme or "default"
            }
            
            # Cache the tenant context
            if redis_cache.is_available:
                await redis_cache.set(cache_key, tenant_context, TENANT_CACHE_DURATION)
            
            return tenant_context
        finally:
            db.close()
    
    async def _get_tenant_by_custom_domain(self, domain: str) -> Dict[str, Any]:
        """
        Look up tenant by custom domain.
        
        Args:
            domain: Custom domain to look up
            
        Returns:
            Tenant context dictionary
        """
        # Try to get from cache first
        cache_key = f"tenant:domain:{domain}"
        if redis_cache.is_available:
            cached_context = await redis_cache.get(cache_key)
            if cached_context:
                return cached_context
        
        # Not in cache, query database
        db = SessionLocal()
        try:
            # Query for StorefrontConfig and related Tenant
            config = (
                db.query(StorefrontConfig)
                .join(Tenant)
                .filter(StorefrontConfig.custom_domain == domain)
                .filter(StorefrontConfig.domain_verified == True)
                .filter(Tenant.is_active == True)
                .filter(Tenant.storefront_enabled == True)
                .first()
            )
            
            if not config:
                # No matching tenant found
                return {
                    "tenant_id": None,
                    "subdomain": None,
                    "custom_domain": domain,
                    "is_active": False,
                    "storefront_enabled": False
                }
            
            # Create tenant context
            tenant_context = {
                "tenant_id": str(config.tenant_id),
                "subdomain": config.subdomain,
                "custom_domain": domain,
                "is_active": True,
                "storefront_enabled": True,
                "tenant_name": config.tenant.name if config.tenant else None,
                "theme": config.theme or "default"
            }
            
            # Cache the tenant context
            if redis_cache.is_available:
                await redis_cache.set(cache_key, tenant_context, TENANT_CACHE_DURATION)
            
            return tenant_context
        finally:
            db.close()


# Helper function to get tenant context from request
def get_tenant_context(request: Request) -> Dict[str, Any]:
    """
    Get tenant context from request state.
    
    Args:
        request: FastAPI request
        
    Returns:
        Tenant context dictionary
    """
    return getattr(request.state, "tenant_context", {}) or {}
