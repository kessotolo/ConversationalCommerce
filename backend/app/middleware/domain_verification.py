import logging
import time
import ssl
import socket
import asyncio
from typing import Dict, Any, List, Optional, Tuple, Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from sqlalchemy.orm import Session
import uuid
import dns.resolver
import dns.exception

from app.db.session import SessionLocal
from app.models.storefront import StorefrontConfig
from app.models.tenant import Tenant
from app.utils.domain_validator import verify_domain_dns, generate_verification_token
from app.core.cache.redis_cache import redis_cache

logger = logging.getLogger(__name__)

# Cache duration for domain verification status (24 hours)
VERIFICATION_CACHE_DURATION = 86400

# SSL verification statuses
SSL_STATUS_VALID = "valid"
SSL_STATUS_INVALID = "invalid"
SSL_STATUS_EXPIRED = "expired"
SSL_STATUS_UNKNOWN = "unknown"


class DomainVerificationMiddleware(BaseHTTPMiddleware):
    """
    Middleware for verifying custom domains attached to tenant storefronts.
    
    This middleware performs various checks on custom domains including:
    - DNS verification
    - SSL certificate validation
    - Domain ownership verification
    
    Results are cached to avoid repeated checks on every request.
    """
    
    def __init__(
        self,
        app: ASGIApp,
        exclude_paths: List[str] = None,
        verification_interval: int = 86400  # 24 hours
    ):
        super().__init__(app)
        self.exclude_paths = exclude_paths or ["/api/", "/admin/", "/_next/", "/static/"]
        self.verification_interval = verification_interval
        # Store last verification time for each domain
        self.last_verification = {}
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process the request and verify domain if needed."""
        # Skip middleware for excluded paths
        if any(request.url.path.startswith(path) for path in self.exclude_paths):
            return await call_next(request)
        
        # Only process requests with Host header
        host = request.headers.get("host", "")
        if not host or "localhost" in host or "127.0.0.1" in host:
            return await call_next(request)
        
        # Clean the host (remove port if present)
        if ":" in host:
            host = host.split(":")[0]
        
        # Check if this is a custom domain (not a subdomain of our base domain)
        tenant_context = getattr(request.state, "tenant_context", None)
        is_custom_domain = tenant_context and tenant_context.get("custom_domain") == host
        
        if is_custom_domain:
            # Get tenant ID from context
            tenant_id = tenant_context.get("tenant_id")
            if tenant_id:
                # Perform background verification if needed
                await self._verify_domain_if_needed(host, tenant_id)
        
        # Continue processing the request
        return await call_next(request)
    
    async def _verify_domain_if_needed(self, domain: str, tenant_id: str) -> None:
        """
        Verify domain if it hasn't been verified recently.
        
        Args:
            domain: Domain to verify
            tenant_id: Tenant ID
        """
        now = time.time()
        
        # Check if we've verified this domain recently
        last_check = self.last_verification.get(domain, 0)
        if now - last_check < self.verification_interval:
            return
        
        # Update last verification time
        self.last_verification[domain] = now
        
        # Perform verification in the background
        asyncio.create_task(self._perform_domain_verification(domain, tenant_id))
    
    async def _perform_domain_verification(self, domain: str, tenant_id: str) -> None:
        """
        Perform comprehensive domain verification.
        
        Args:
            domain: Domain to verify
            tenant_id: Tenant ID
        """
        try:
            # Cache key for verification results
            cache_key = f"domain_verification:{domain}"
            
            # Check DNS verification
            dns_verified, dns_error = await self._verify_dns(domain, tenant_id)
            
            # Check SSL certificate
            ssl_status, ssl_error = await self._verify_ssl(domain)
            
            # Get domain info from database
            db = SessionLocal()
            try:
                config = db.query(StorefrontConfig).filter(
                    StorefrontConfig.tenant_id == uuid.UUID(tenant_id),
                    StorefrontConfig.custom_domain == domain
                ).first()
                
                if config:
                    # Update domain verification status in database if needed
                    if config.domain_verified != dns_verified:
                        config.domain_verified = dns_verified
                        db.commit()
                
                # Create verification result
                result = {
                    "domain": domain,
                    "tenant_id": tenant_id,
                    "dns_verified": dns_verified,
                    "dns_error": dns_error,
                    "ssl_status": ssl_status,
                    "ssl_error": ssl_error,
                    "verified_at": now
                }
                
                # Cache the verification result
                if redis_cache.is_available:
                    await redis_cache.set(cache_key, result, VERIFICATION_CACHE_DURATION)
                
                logger.info(f"Domain verification for {domain}: DNS={dns_verified}, SSL={ssl_status}")
            
            finally:
                db.close()
        
        except Exception as e:
            logger.error(f"Error during domain verification for {domain}: {str(e)}")
    
    async def _verify_dns(self, domain: str, tenant_id: str) -> Tuple[bool, Optional[str]]:
        """
        Verify domain DNS records.
        
        Args:
            domain: Domain to verify
            tenant_id: Tenant ID
            
        Returns:
            Tuple of (is_verified, error_message)
        """
        # Generate verification token
        token = generate_verification_token(tenant_id, domain)
        
        # Check DNS verification
        return await verify_domain_dns(domain, token)
    
    async def _verify_ssl(self, domain: str) -> Tuple[str, Optional[str]]:
        """
        Verify SSL certificate for domain.
        
        Args:
            domain: Domain to verify
            
        Returns:
            Tuple of (status, error_message)
        """
        try:
            # Create SSL context
            context = ssl.create_default_context()
            
            # Create socket
            with socket.create_connection((domain, 443)) as sock:
                with context.wrap_socket(sock, server_hostname=domain) as ssock:
                    # Get certificate
                    cert = ssock.getpeercert()
                    
                    # Check expiration
                    import datetime
                    expires = datetime.datetime.strptime(cert['notAfter'], "%b %d %H:%M:%S %Y %Z")
                    now = datetime.datetime.utcnow()
                    
                    if expires < now:
                        return SSL_STATUS_EXPIRED, "SSL certificate has expired"
                    
                    # Certificate is valid
                    return SSL_STATUS_VALID, None
        
        except ssl.SSLError as e:
            return SSL_STATUS_INVALID, f"SSL error: {str(e)}"
        except socket.error as e:
            return SSL_STATUS_UNKNOWN, f"Connection error: {str(e)}"
        except Exception as e:
            return SSL_STATUS_UNKNOWN, f"Unknown error: {str(e)}"


# Background verification service
class DomainVerificationService:
    """
    Service for periodic background verification of all domains.
    
    This service runs in the background and verifies all domains
    registered in the system on a regular schedule.
    """
    
    def __init__(self, verification_interval: int = 86400):
        """
        Initialize the domain verification service.
        
        Args:
            verification_interval: Interval between verifications in seconds
        """
        self.verification_interval = verification_interval
        self._running = False
        self._task = None
    
    async def start(self):
        """Start the background verification service."""
        if self._running:
            return
        
        self._running = True
        self._task = asyncio.create_task(self._verification_loop())
        logger.info("Domain verification service started")
    
    async def stop(self):
        """Stop the background verification service."""
        if not self._running:
            return
        
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        
        logger.info("Domain verification service stopped")
    
    async def _verification_loop(self):
        """Main verification loop."""
        while self._running:
            try:
                await self._verify_all_domains()
            except Exception as e:
                logger.error(f"Error in domain verification loop: {str(e)}")
            
            # Wait for next verification interval
            await asyncio.sleep(self.verification_interval)
    
    async def _verify_all_domains(self):
        """Verify all domains in the system."""
        db = SessionLocal()
        try:
            # Get all domains with custom domains
            configs = db.query(StorefrontConfig).filter(
                StorefrontConfig.custom_domain.isnot(None)
            ).all()
            
            logger.info(f"Verifying {len(configs)} domains")
            
            for config in configs:
                if not self._running:
                    break
                
                domain = config.custom_domain
                tenant_id = str(config.tenant_id)
                
                # Verify DNS
                dns_verified, dns_error = await self._verify_dns(domain, tenant_id)
                
                # Verify SSL
                ssl_status, ssl_error = await self._verify_ssl(domain)
                
                # Update domain verification status in database
                if config.domain_verified != dns_verified:
                    config.domain_verified = dns_verified
                    db.commit()
                
                # Cache verification result
                if redis_cache.is_available:
                    cache_key = f"domain_verification:{domain}"
                    result = {
                        "domain": domain,
                        "tenant_id": tenant_id,
                        "dns_verified": dns_verified,
                        "dns_error": dns_error,
                        "ssl_status": ssl_status,
                        "ssl_error": ssl_error,
                        "verified_at": time.time()
                    }
                    await redis_cache.set(cache_key, result, VERIFICATION_CACHE_DURATION)
                
                logger.info(f"Domain verification for {domain}: DNS={dns_verified}, SSL={ssl_status}")
                
                # Sleep briefly to avoid overwhelming resources
                await asyncio.sleep(1)
        
        finally:
            db.close()
    
    async def _verify_dns(self, domain: str, tenant_id: str) -> Tuple[bool, Optional[str]]:
        """
        Verify domain DNS records.
        
        Args:
            domain: Domain to verify
            tenant_id: Tenant ID
            
        Returns:
            Tuple of (is_verified, error_message)
        """
        # Generate verification token
        token = generate_verification_token(tenant_id, domain)
        
        # Check DNS verification
        return await verify_domain_dns(domain, token)
    
    async def _verify_ssl(self, domain: str) -> Tuple[str, Optional[str]]:
        """
        Verify SSL certificate for domain.
        
        Args:
            domain: Domain to verify
            
        Returns:
            Tuple of (status, error_message)
        """
        try:
            # Create SSL context
            context = ssl.create_default_context()
            
            # Create socket
            with socket.create_connection((domain, 443)) as sock:
                with context.wrap_socket(sock, server_hostname=domain) as ssock:
                    # Get certificate
                    cert = ssock.getpeercert()
                    
                    # Check expiration
                    import datetime
                    expires = datetime.datetime.strptime(cert['notAfter'], "%b %d %H:%M:%S %Y %Z")
                    now = datetime.datetime.utcnow()
                    
                    if expires < now:
                        return SSL_STATUS_EXPIRED, "SSL certificate has expired"
                    
                    # Certificate is valid
                    return SSL_STATUS_VALID, None
        
        except ssl.SSLError as e:
            return SSL_STATUS_INVALID, f"SSL error: {str(e)}"
        except socket.error as e:
            return SSL_STATUS_UNKNOWN, f"Connection error: {str(e)}"
        except Exception as e:
            return SSL_STATUS_UNKNOWN, f"Unknown error: {str(e)}"


# Create singleton instance of verification service
verification_service = DomainVerificationService()
