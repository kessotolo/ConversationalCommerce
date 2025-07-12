import logging
from pathlib import Path

from fastapi import Request, status
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from backend.app.core.exceptions import AppError

logger = logging.getLogger(__name__)

# Setup templates
templates_dir = Path(__file__).parent.parent / "templates"
templates = Jinja2Templates(directory=str(templates_dir))


class StorefrontError(AppError):
    """Base exception for storefront-related errors."""

    def __init__(self, status_code: int, detail: str, tenant_name: str = None):
        self.status_code = status_code
        self.detail = detail
        self.tenant_name = tenant_name


class InvalidSubdomainError(StorefrontError):
    """Exception raised when an invalid subdomain is requested."""

    def __init__(self, subdomain: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Storefront not found for subdomain: {subdomain}",
        )
        self.subdomain = subdomain


class InactiveTenantError(StorefrontError):
    """Exception raised when a storefront for an inactive tenant is requested."""

    def __init__(self, tenant_name: str = None):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This storefront is currently inactive",
            tenant_name=tenant_name,
        )


class MaintenanceModeError(StorefrontError):
    """Exception raised when a storefront is in maintenance mode."""

    def __init__(self, tenant_name: str = None, expected_duration: str = None):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="This storefront is currently under maintenance",
            tenant_name=tenant_name,
        )
        self.expected_duration = expected_duration


async def handle_storefront_error(request: Request, exc: StorefrontError):
    """
    Handle storefront-related errors with custom error pages.

    Args:
        request: FastAPI request object
        exc: StorefrontError exception

    Returns:
        HTML response with appropriate error page or JSON response for API requests
    """
    # For API requests, return JSON
    if request.url.path.startswith("/api/"):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    # Check if templates directory exists
    if not templates_dir.exists():
        # Fallback to simple HTML response
        return HTMLResponse(
            content=f"""
            <html>
                <head>
                    <title>Error {exc.status_code}</title>
                </head>
                <body>
                    <h1>Error {exc.status_code}</h1>
                    <p>{exc.detail}</p>
                </body>
            </html>
            """,
            status_code=exc.status_code,
        )

    # For regular requests, return HTML
    context = {
        "request": request,
        "status_code": exc.status_code,
        "detail": exc.detail,
        "tenant_name": exc.tenant_name,
    }

    # Add exception-specific context
    if isinstance(exc, InvalidSubdomainError):
        template_name = "errors/invalid_subdomain.html"
        context["subdomain"] = exc.subdomain
    elif isinstance(exc, InactiveTenantError):
        template_name = "errors/inactive_tenant.html"
    elif isinstance(exc, MaintenanceModeError):
        template_name = "errors/maintenance.html"
        context["expected_duration"] = exc.expected_duration
    else:
        template_name = "errors/generic.html"

    try:
        return templates.TemplateResponse(
            template_name, context, status_code=exc.status_code
        )
    except Exception as e:
        logger.error(f"Failed to render error template: {str(e)}")
        return HTMLResponse(
            content=f"""
            <html>
                <head>
                    <title>Error {exc.status_code}</title>
                </head>
                <body>
                    <h1>Error {exc.status_code}</h1>
                    <p>{exc.detail}</p>
                </body>
            </html>
            """,
            status_code=exc.status_code,
        )
