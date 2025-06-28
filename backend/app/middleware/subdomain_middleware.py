import logging
import time
import uuid
from typing import Any, Callable, Dict, Optional
from urllib.parse import urlparse

from fastapi import Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.db.async_session import get_async_session_local
from app.middleware.storefront_errors import (
    InactiveTenantError,
    InvalidSubdomainError,
    MaintenanceModeError,
    handle_storefront_error,
)
from app.models.storefront import StorefrontConfig
from app.models.tenant import Tenant

logger = logging.getLogger(__name__)


class SubdomainMiddleware(BaseHTTPMiddleware):
    """
    Middleware that extracts tenant information from subdomains and custom domains.

    - Sets tenant context in request.state for use by dependencies and DB session.
    - Uses async session management for all DB access.
    - Ensures tenant isolation and RLS enforcement by setting the correct tenant_id for each request.
    """

    def __init__(
        self,
        app: ASGIApp,
        base_domain: str = "example.com",
        exclude_paths: list = None,
        cache_ttl: int = 300,  # Cache TTL in seconds (5 minutes default)
    ):
        super().__init__(app)
        self.base_domain = base_domain
        self.exclude_paths = exclude_paths or [
            "/api/",
            "/admin/",
            "/_next/",
            "/static/",
            "/docs/",
            "/redoc/",
        ]
        self.cache_ttl = cache_ttl
        self.tenant_cache = {}
        self.cache_timestamp = {}

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Always allow public endpoints (docs, openapi, favicon, test-env) to pass with default context
        public_paths = ["/docs", "/redoc", "/openapi.json", "/favicon.ico", "/test-env"]
        if any(request.url.path.startswith(path) for path in public_paths):
            request.state.tenant_context = {
                "tenant_id": None,
                "tenant_name": None,
                "storefront_id": None,
                "subdomain": None,
                "custom_domain": None,
                "theme_settings": None,
            }
            return await call_next(request)

        # Skip middleware for excluded paths
        if any(request.url.path.startswith(path) for path in self.exclude_paths):
            return await call_next(request)

        # Get the host from the request
        host = request.headers.get("host", "")
        tenant_context = None
        subdomain = None

        try:
            # Try to get tenant from cache first
            tenant_context = self._get_from_cache(host)

            # If not in cache, query the database
            if not tenant_context:
                # Initialize DB session
                sessionmaker = get_async_session_local()
                async with sessionmaker() as db:
                    # Check if this is a custom domain
                    config = await self._get_storefront_by_domain(db, host)

                    # If not a custom domain, check if it's a subdomain
                    if not config and "." in host:
                        parts = host.split(".")
                        if len(parts) >= 3:  # subdomain.example.com format
                            subdomain = parts[0]
                            domain = ".".join(parts[1:])

                            # Only process if the domain matches our base domain
                            if domain == self.base_domain:
                                config = await self._get_storefront_by_subdomain(
                                    db, subdomain
                                )

                    # If we found a storefront config, get the tenant
                    if config:
                        tenant = await self._get_tenant(db, config.tenant_id)

                        # Check if tenant is active
                        if not tenant:
                            raise InvalidSubdomainError(subdomain or host)

                        # Check if storefront is enabled
                        if not tenant.storefront_enabled:
                            raise InactiveTenantError(tenant.name)

                        # Create tenant context
                        tenant_context = {
                            "tenant_id": str(tenant.id),
                            "tenant_name": tenant.name,
                            "storefront_id": str(config.id),
                            "subdomain": config.subdomain_name,
                            "custom_domain": config.custom_domain,
                            "theme_settings": config.theme_settings,
                        }

                        # Cache the tenant context
                        self._add_to_cache(host, tenant_context)

            # If tenant_context is found, store it in request state
            if tenant_context:
                # Defensive: ensure tenant_id is a valid UUID string
                try:
                    if not tenant_context.get("tenant_id"):
                        raise ValueError("tenant_id missing in tenant_context")
                    uuid.UUID(tenant_context["tenant_id"])
                except Exception as e:
                    logger.error(
                        f"Invalid tenant_id in tenant_context: {tenant_context.get('tenant_id')}, error: {e}"
                    )
                    return await handle_storefront_error(
                        request, InvalidSubdomainError(subdomain or host)
                    )
                request.state.tenant_context = tenant_context
                logger.info(
                    f"Resolved tenant: {tenant_context['tenant_name']} for host: {host}"
                )
                return await call_next(request)
            else:
                # No tenant found for this domain/subdomain
                logger.error(
                    f"No tenant found for host: {host}, subdomain: {subdomain}"
                )
                return await handle_storefront_error(
                    request, InvalidSubdomainError(subdomain or host)
                )

        except (
            InvalidSubdomainError,
            InactiveTenantError,
            MaintenanceModeError,
        ) as exc:
            return await handle_storefront_error(request, exc)
        except Exception as e:
            # If the error is a DNS resolution error, return a default context and proceed
            if "nodename nor servname provided" in str(e):
                logger.warning(
                    f"Host '{host}' could not be resolved. Using default tenant context for this request."
                )
                request.state.tenant_context = {
                    "tenant_id": None,
                    "tenant_name": None,
                    "storefront_id": None,
                    "subdomain": None,
                    "custom_domain": None,
                    "theme_settings": None,
                }
                return await call_next(request)
            else:
                logger.error(
                    f"Error in subdomain middleware for Host '{host}': {str(e)}"
                )
                return await call_next(request)

    def _get_from_cache(self, key: str) -> Optional[Dict[str, Any]]:
        """
        Get tenant context from cache if it exists and is not expired.

        Args:
            key: Cache key (typically the host)

        Returns:
            Cached tenant context or None if not found or expired
        """
        now = time.time()

        if key in self.tenant_cache and key in self.cache_timestamp:
            # Check if cache is still valid
            if now - self.cache_timestamp[key] < self.cache_ttl:
                return self.tenant_cache[key]
            else:
                # Expired, remove from cache
                del self.tenant_cache[key]
                del self.cache_timestamp[key]

        return None

    def _add_to_cache(self, key: str, tenant_context: Dict[str, Any]) -> None:
        """
        Add tenant context to cache with current timestamp.

        Args:
            key: Cache key (typically the host)
            tenant_context: Tenant context to cache
        """
        self.tenant_cache[key] = tenant_context
        self.cache_timestamp[key] = time.time()

        # Simple cache cleanup - remove oldest entries if cache gets too large
        if len(self.tenant_cache) > 1000:  # Arbitrary limit
            oldest_key = min(self.cache_timestamp, key=self.cache_timestamp.get)
            if oldest_key:
                del self.tenant_cache[oldest_key]
                del self.cache_timestamp[oldest_key]

    async def _get_storefront_by_domain(
        self, db: Session, domain: str
    ) -> Optional[StorefrontConfig]:
        """
        Get StorefrontConfig by domain.
        """
        parsed = urlparse(f"http://{domain}")
        clean_domain = parsed.netloc.split(":")[0]
        result = await db.execute(
            select(StorefrontConfig).where(
                StorefrontConfig.custom_domain == clean_domain,
                StorefrontConfig.domain_verified,
            )
        )
        return result.scalars().first()

    async def _get_storefront_by_subdomain(
        self, db: Session, subdomain: str
    ) -> Optional[StorefrontConfig]:
        """
        Get StorefrontConfig by subdomain.
        """
        result = await db.execute(
            select(StorefrontConfig).where(StorefrontConfig.subdomain_name == subdomain)
        )
        return result.scalars().first()

    async def _get_tenant(self, db: Session, tenant_id: uuid.UUID) -> Optional[Tenant]:
        """
        Get Tenant by ID.
        """
        result = await db.execute(
            select(Tenant).where(Tenant.id == tenant_id, Tenant.storefront_enabled)
        )
        return result.scalars().first()


# Example async DB access in subdomain middleware


async def get_tenant_by_subdomain_async(subdomain, db=None):
    db = db or get_async_session_local()
    try:
        # await db.execute(...)
        # await db.commit()
        pass
    finally:
        await db.close()
