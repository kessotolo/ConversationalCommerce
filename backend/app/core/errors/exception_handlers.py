import logging
import traceback

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from backend.app.core.errors.error_response import (
    authentication_error,
    authorization_error,
    business_logic_error,
    forbidden_error,
    not_found_error,
    rate_limit_error,
    server_error,
    validation_error,
)
from backend.app.core.exceptions import (
    AuthenticationError,
    AuthorizationError,
    BusinessLogicError,
    ConcurrentModificationError,
    DatabaseError,
    ProductNotFoundError,
    ProductPermissionError,
    RateLimitError,
    ResourceNotFoundError,
    ValidationError,
    AppError,
)

# Import settings for environment check
from backend.app.core.config.settings import get_settings
settings = get_settings()

# Configure logger
logger = logging.getLogger(__name__)


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """
    Handle FastAPI's built-in validation errors and return a standardized response.

    Args:
        request: FastAPI request object
        exc: Validation error exception

    Returns:
        JSONResponse: Standardized error response
    """
    # Extract validation error details for better client feedback
    errors = {}
    for error in exc.errors():
        loc = ".".join([str(field) for field in error["loc"]])
        errors[loc] = error["msg"]

    return validation_error(detail="Request validation failed", fields=errors)


async def product_not_found_handler(
    request: Request, exc: ProductNotFoundError
) -> JSONResponse:
    """Handle product not found errors."""
    return not_found_error(
        detail=str(exc), resource_type="product", resource_id=exc.product_id
    )


async def product_permission_handler(
    request: Request, exc: ProductPermissionError
) -> JSONResponse:
    """Handle product permission errors."""
    return forbidden_error(
        detail=str(exc),
        resource_type="product",
        resource_id=exc.product_id,
        required_permission=exc.required_permission,
    )


async def concurrent_modification_handler(
    request: Request, exc: ConcurrentModificationError
) -> JSONResponse:
    """Handle concurrent modification errors."""
    return business_logic_error(
        detail=str(exc),
        code="concurrent_modification",
        resource_type=exc.resource_type,
        resource_id=exc.resource_id,
    )


async def database_error_handler(request: Request, exc: DatabaseError) -> JSONResponse:
    """Handle database errors."""
    logger.error(f"Database error: {str(exc)}\n{traceback.format_exc()}")
    return server_error(detail="A database error occurred", code="database_error")


async def authentication_error_handler(
    request: Request, exc: AuthenticationError
) -> JSONResponse:
    """Handle authentication errors."""
    return authentication_error(detail=str(exc), code=exc.code)


async def authorization_error_handler(
    request: Request, exc: AuthorizationError
) -> JSONResponse:
    """Handle authorization errors."""
    return authorization_error(
        detail=str(exc), code=exc.code, required_permission=exc.required_permission
    )


async def resource_not_found_handler(
    request: Request, exc: ResourceNotFoundError
) -> JSONResponse:
    """Handle resource not found errors."""
    return not_found_error(
        detail=str(exc), resource_type=exc.resource_type, resource_id=exc.resource_id
    )


async def validation_error_handler(
    request: Request, exc: ValidationError
) -> JSONResponse:
    """Handle validation errors."""
    return validation_error(detail=str(exc), fields=exc.fields)


async def business_logic_error_handler(
    request: Request, exc: BusinessLogicError
) -> JSONResponse:
    """Handle business logic errors."""
    return business_logic_error(
        detail=str(exc),
        code=exc.code,
        resource_type=exc.resource_type,
        resource_id=exc.resource_id,
    )


async def rate_limit_error_handler(
    request: Request, exc: RateLimitError
) -> JSONResponse:
    """Handle rate limit errors."""
    return rate_limit_error(detail=str(exc), retry_after=exc.retry_after)


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Global exception handler for unhandled exceptions.

    Args:
        request: FastAPI request object
        exc: Exception that was raised

    Returns:
        JSONResponse: Standardized error response
    """
    # Log the full exception with traceback
    logger.error(f"Unhandled exception: {str(exc)}\n{traceback.format_exc()}")

    # Return a generic server error in production
    if settings.ENVIRONMENT == "production":
        return server_error(
            detail="An unexpected error occurred", code="internal_server_error"
        )

    # Return detailed error in development
    return server_error(
        detail=str(exc),
        code="internal_server_error",
        debug_info={"type": type(exc).__name__,
                    "traceback": traceback.format_exc()},
    )


def register_exception_handlers(app):
    """
    Register all exception handlers with the FastAPI app.

    Args:
        app: FastAPI application instance
    """
    app.add_exception_handler(RequestValidationError,
                              validation_exception_handler)
    app.add_exception_handler(ProductNotFoundError, product_not_found_handler)
    app.add_exception_handler(ProductPermissionError,
                              product_permission_handler)
    app.add_exception_handler(
        ConcurrentModificationError, concurrent_modification_handler
    )
    app.add_exception_handler(DatabaseError, database_error_handler)
    app.add_exception_handler(
        AuthenticationError, authentication_error_handler)
    app.add_exception_handler(AuthorizationError, authorization_error_handler)
    app.add_exception_handler(ResourceNotFoundError,
                              resource_not_found_handler)
    app.add_exception_handler(ValidationError, validation_error_handler)
    app.add_exception_handler(BusinessLogicError, business_logic_error_handler)
    app.add_exception_handler(RateLimitError, rate_limit_error_handler)
    app.add_exception_handler(AppError, global_exception_handler)
