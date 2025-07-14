"""
Domain-Specific CORS Middleware

This middleware provides different CORS configurations based on the requesting domain:
- enwhe.com (SuperAdmin): Strict CORS with limited origins
- enwhe.io (Main App): Standard CORS for merchant/buyer interface
"""

import os
from typing import List, Set
from fastapi import Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

from app.core.logging import logger
from app.core.config.settings import get_settings

# Check if we're in test mode
TESTING = str(os.environ.get("TESTING", "false")
              ).lower() in ("1", "true", "yes", "t", "y")


class DomainSpecificCORSMiddleware(BaseHTTPMiddleware):
    """
    Middleware that applies different CORS policies based on the requesting domain.

    - SuperAdmin domains (enwhe.com): Strict CORS with limited origins
    - Main app domains (enwhe.io): Standard CORS for merchant/buyer interface
    """

    def __init__(self, app):
        super().__init__(app)
        self.settings = get_settings()

        # SuperAdmin domain configuration
        self.admin_domains = {
            "enwhe.com",
            "admin.enwhe.com",
            "localhost:3000",  # Development
            "localhost:3001",  # Development
            "localhost:3002",  # Development
            "127.0.0.1:3000",  # Development
            "127.0.0.1:3001",  # Development
            "127.0.0.1:3002"   # Development
        }

        # Main app domain configuration
        self.main_app_domains = {
            "enwhe.io",
            "app.enwhe.io",
            "www.enwhe.io",
            "localhost:3000",  # Development (frontend)
            "localhost:3001",  # Development (frontend)
            "localhost:3002",  # Development (frontend)
            "127.0.0.1:3000",  # Development (frontend)
            "127.0.0.1:3001",  # Development (frontend)
            "127.0.0.1:3002"   # Development (frontend)
        }

        # Test domains (for pytest TestClient)
        self.test_domains = {
            "testserver",
            "localhost",
            "127.0.0.1",
            "localhost:3000",
            "127.0.0.1:3000"
        }

        # SuperAdmin CORS configuration (Strict)
        self.admin_cors_config = {
            "allow_origins": [
                "https://enwhe.com",
                "https://admin.enwhe.com",
                "http://localhost:3000",  # Development
                "http://localhost:3001",  # Development
                "http://localhost:3002",  # Development
                "http://127.0.0.1:3000",  # Development
                "http://127.0.0.1:3001",  # Development
                "http://127.0.0.1:3002"   # Development
            ],
            "allow_credentials": True,
            "allow_methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
            "allow_headers": [
                "Authorization",
                "Content-Type",
                "X-Requested-With",
                "X-CSRF-Token",
                "X-Tenant-ID",
                "Accept",
                "Origin",
                "User-Agent",
                "DNT",
                "Cache-Control",
                "X-Mx-ReqToken",
                "Keep-Alive",
                "If-Modified-Since"
            ],
            "expose_headers": [
                "X-Request-ID",
                "X-Process-Time",
                "X-Rate-Limit-Remaining",
                "X-Rate-Limit-Reset"
            ],
            "max_age": 86400  # 24 hours
        }

        # Main app CORS configuration (More permissive)
        self.main_app_cors_config = {
            "allow_origins": [
                "https://enwhe.io",
                "https://app.enwhe.io",
                "https://www.enwhe.io",
                "http://localhost:3000",  # Development (frontend)
                "http://localhost:3001",  # Development (frontend)
                "http://localhost:3002",  # Development (frontend)
                "http://127.0.0.1:3000",  # Development (frontend)
                "http://127.0.0.1:3001",  # Development (frontend)
                "http://127.0.0.1:3002"   # Development (frontend)
            ],
            "allow_credentials": True,
            "allow_methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
            "allow_headers": [
                "Authorization",
                "Content-Type",
                "X-Requested-With",
                "X-CSRF-Token",
                "X-Tenant-ID",
                "Accept",
                "Origin",
                "User-Agent",
                "DNT",
                "Cache-Control",
                "X-Mx-ReqToken",
                "Keep-Alive",
                "If-Modified-Since",
                "X-Device-Type",
                "X-App-Version"
            ],
            "expose_headers": [
                "X-Request-ID",
                "X-Process-Time",
                "X-Rate-Limit-Remaining",
                "X-Rate-Limit-Reset",
                "X-Total-Count",
                "X-Page-Count"
            ],
            "max_age": 3600  # 1 hour
        }

        # Test CORS configuration (Permissive for tests)
        self.test_cors_config = {
            "allow_origins": ["*"],
            "allow_credentials": True,
            "allow_methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
            "allow_headers": [
                "Authorization",
                "Content-Type",
                "X-Requested-With",
                "X-CSRF-Token",
                "X-Tenant-ID",
                "Accept",
                "Origin",
                "User-Agent",
                "DNT",
                "Cache-Control",
                "X-Mx-ReqToken",
                "Keep-Alive",
                "If-Modified-Since"
            ],
            "expose_headers": [
                "X-Request-ID",
                "X-Process-Time",
                "X-Rate-Limit-Remaining",
                "X-Rate-Limit-Reset"
            ],
            "max_age": 86400  # 24 hours
        }

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        """Main middleware dispatch method."""

        # Get the host from the request
        host = request.headers.get("host", "")
        origin = request.headers.get("origin", "")

        # Determine which CORS configuration to apply
        cors_config = self._get_cors_config_for_domain(host, origin)

        # Handle preflight requests
        if request.method == "OPTIONS":
            return self._handle_preflight(request, cors_config)

        # Process the request
        response = await call_next(request)

        # Add CORS headers to the response
        self._add_cors_headers(response, request, cors_config)

        # Log CORS policy application for security monitoring
        self._log_cors_application(request, cors_config, host, origin)

        return response

    def _get_cors_config_for_domain(self, host: str, origin: str) -> dict:
        """
        Determine which CORS configuration to apply based on host and origin.

        Args:
            host: The Host header value
            origin: The Origin header value

        Returns:
            CORS configuration dictionary
        """
        # Remove port for comparison if present
        domain = host.split(":")[0] if ":" in host else host

        # Debug logging for test mode
        logger.info(
            f"CORS Debug - TESTING: {TESTING}, host: {host}, domain: {domain}")

        # In test mode, allow all test domains and return permissive config
        if TESTING:
            # Add test domains to the list
            test_domains = [
                "testserver", "localhost", "127.0.0.1",
                "localhost:8000", "127.0.0.1:8000",
                "localhost:3000", "127.0.0.1:3000"
            ]
            if domain in test_domains or host in test_domains:
                logger.info(f"CORS Debug - Using test config for {host}")
                return self.test_cors_config
            # For any other domain in test mode, use permissive config
            logger.info(
                f"CORS Debug - Using test config for unknown domain {host}")
            return self.test_cors_config

        # Check if this is an admin domain request
        if domain in self.admin_domains or host in self.admin_domains:
            return self.admin_cors_config

        # Check if this is a main app domain request
        if domain in self.main_app_domains or host in self.main_app_domains:
            return self.main_app_cors_config

        # Default to strict admin configuration for unknown domains
        logger.warning(
            f"Unknown domain requesting CORS: {host}, applying strict admin policy")
        return self.admin_cors_config

    def _handle_preflight(self, request: Request, cors_config: dict) -> Response:
        """
        Handle CORS preflight OPTIONS requests.

        Args:
            request: The preflight request
            cors_config: CORS configuration to apply

        Returns:
            Preflight response with appropriate CORS headers
        """
        origin = request.headers.get("origin")

        # Check if origin is allowed
        if not self._is_origin_allowed(origin, cors_config["allow_origins"]):
            return Response(status_code=403, content="Origin not allowed")

        # Create preflight response
        response = Response(status_code=200)

        # Add CORS headers
        response.headers["Access-Control-Allow-Origin"] = origin or "*"
        response.headers["Access-Control-Allow-Methods"] = ", ".join(
            cors_config["allow_methods"])
        response.headers["Access-Control-Allow-Headers"] = ", ".join(
            cors_config["allow_headers"])
        response.headers["Access-Control-Max-Age"] = str(
            cors_config["max_age"])

        if cors_config["allow_credentials"]:
            response.headers["Access-Control-Allow-Credentials"] = "true"

        return response

    def _add_cors_headers(self, response: Response, request: Request, cors_config: dict):
        """
        Add CORS headers to the response.

        Args:
            response: The response to add headers to
            request: The original request
            cors_config: CORS configuration to apply
        """
        origin = request.headers.get("origin")

        # Check if origin is allowed
        if self._is_origin_allowed(origin, cors_config["allow_origins"]):
            response.headers["Access-Control-Allow-Origin"] = origin or "*"

            if cors_config["allow_credentials"]:
                response.headers["Access-Control-Allow-Credentials"] = "true"

            if cors_config["expose_headers"]:
                response.headers["Access-Control-Expose-Headers"] = ", ".join(
                    cors_config["expose_headers"])
        else:
            # Log unauthorized origin attempt
            logger.warning(
                f"Unauthorized CORS origin attempt: {origin} for host: {request.headers.get('host')}")

    def _is_origin_allowed(self, origin: str, allowed_origins: List[str]) -> bool:
        """
        Check if the origin is in the list of allowed origins.

        Args:
            origin: The origin to check
            allowed_origins: List of allowed origins

        Returns:
            True if origin is allowed, False otherwise
        """
        # In test mode, allow all origins
        if TESTING:
            return True

        if not origin:
            return False

        # Check exact matches
        if origin in allowed_origins:
            return True

        # Check for wildcard matches (if any)
        for allowed in allowed_origins:
            if allowed == "*":
                return True
            # Add more sophisticated pattern matching if needed

        return False

    def _log_cors_application(self, request: Request, cors_config: dict, host: str, origin: str):
        """
        Log CORS policy application for security monitoring.

        Args:
            request: The request
            cors_config: Applied CORS configuration
            host: Request host
            origin: Request origin
        """
        try:
            # Determine policy type
            policy_type = "admin" if cors_config == self.admin_cors_config else "main_app"

            # Log for security monitoring
            logger.info(
                f"CORS policy applied: {policy_type} for host={host}, origin={origin}, "
                f"method={request.method}, path={request.url.path}"
            )

            # Log suspicious patterns
            if origin and not self._is_origin_allowed(origin, cors_config["allow_origins"]):
                logger.warning(
                    f"CORS blocked unauthorized origin: {origin} for host={host}, "
                    f"method={request.method}, path={request.url.path}, "
                    f"ip={request.client.host if request.client else 'unknown'}"
                )

        except Exception as e:
            logger.error(f"Error logging CORS application: {str(e)}")


def get_domain_specific_cors_middleware():
    """
    Factory function to create the domain-specific CORS middleware.

    Returns:
        Configured DomainSpecificCORSMiddleware instance
    """
    return DomainSpecificCORSMiddleware
