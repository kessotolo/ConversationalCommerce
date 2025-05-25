from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from app.core.errors.error_response import (
    create_error_response,
    server_error,
    not_found_error,
    validation_error,
    forbidden_error
)
from app.core.exceptions import (
    ProductNotFoundError,
    ProductPermissionError,
    ProductValidationError,
    DatabaseError,
    AuthenticationError,
    AuthorizationError,
    ResourceNotFoundError,
    ValidationError,
    BusinessLogicError
)
from app.services.product_service import ConcurrentModificationError
import logging

# Configure logger
logger = logging.getLogger(__name__)


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Handle FastAPI's built-in validation errors and return a standardized response
    """
    # Extract validation error details for better client feedback
    errors = {}
    for error in exc.errors():
        loc = ".".join([str(l) for l in error["loc"]])
        errors[loc] = error["msg"]
    
    return validation_error(
        detail="Request validation failed",
        fields=errors
    )


async def product_not_found_handler(request: Request, exc: ProductNotFoundError):
    """
    Handle product not found errors
    """
    return not_found_error(detail=str(exc))


async def product_permission_handler(request: Request, exc: ProductPermissionError):
    """
    Handle product permission errors
    """
    return forbidden_error(detail=str(exc))


async def concurrent_modification_handler(request: Request, exc: ConcurrentModificationError):
    """
    Handle concurrent modification errors
    """
    return create_error_response(
        status_code=status.HTTP_409_CONFLICT,
        detail=str(exc),
        error_code="CONCURRENT_MODIFICATION"
    )


async def database_error_handler(request: Request, exc: DatabaseError):
    """
    Handle database errors
    """
    # Log the full error for debugging
    logger.error(f"Database error: {exc}", exc_info=True)
    
    return create_error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="A database error occurred",
        error_code="DATABASE_ERROR",
        additional_info={"internal_message": str(exc)} if request.app.debug else None
    )


async def authentication_error_handler(request: Request, exc: AuthenticationError):
    """
    Handle authentication errors
    """
    return create_error_response(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=str(exc),
        error_code="AUTHENTICATION_ERROR"
    )


async def authorization_error_handler(request: Request, exc: AuthorizationError):
    """
    Handle authorization errors
    """
    return forbidden_error(detail=str(exc))


async def resource_not_found_handler(request: Request, exc: ResourceNotFoundError):
    """
    Handle resource not found errors
    """
    return not_found_error(detail=str(exc))


async def validation_error_handler(request: Request, exc: ValidationError):
    """
    Handle custom validation errors
    """
    return validation_error(detail=str(exc))


async def business_logic_error_handler(request: Request, exc: BusinessLogicError):
    """
    Handle business logic errors
    """
    return create_error_response(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail=str(exc),
        error_code="BUSINESS_LOGIC_ERROR"
    )


async def global_exception_handler(request: Request, exc: Exception):
    """
    Catch-all handler for unhandled exceptions
    """
    # Log the unexpected error
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    
    # Return a generic error message to avoid exposing implementation details
    return server_error(
        detail="An unexpected error occurred",
        error_code="INTERNAL_SERVER_ERROR"
    )


def register_exception_handlers(app):
    """
    Register all exception handlers with the FastAPI app
    """
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(ProductNotFoundError, product_not_found_handler)
    app.add_exception_handler(ProductPermissionError, product_permission_handler)
    app.add_exception_handler(ConcurrentModificationError, concurrent_modification_handler)
    app.add_exception_handler(DatabaseError, database_error_handler)
    app.add_exception_handler(AuthenticationError, authentication_error_handler)
    app.add_exception_handler(AuthorizationError, authorization_error_handler)
    app.add_exception_handler(ResourceNotFoundError, resource_not_found_handler)
    app.add_exception_handler(ValidationError, validation_error_handler)
    app.add_exception_handler(BusinessLogicError, business_logic_error_handler)
    
    # Catch-all handler for unhandled exceptions
    app.add_exception_handler(Exception, global_exception_handler)
