from typing import Any, Dict, Optional

from fastapi import status
from fastapi.responses import JSONResponse


def create_error_response(
    status_code: int,
    detail: str,
    error_code: Optional[str] = None,
    additional_info: Optional[Dict[str, Any]] = None,
) -> JSONResponse:
    """
    Create a standardized error response structure for the API.

    Args:
        status_code: HTTP status code to return
        detail: Detailed error message
        error_code: Optional specific error code for client handling
        additional_info: Optional additional contextual information

    Returns:
        JSONResponse with consistent error structure
    """
    # Create a default error code if none provided
    if not error_code:
        error_code = f"ERR_{status_code}"

    content = {"detail": detail, "error": {"code": error_code}}

    # Add additional info if provided
    if additional_info:
        content["error"]["additional_info"] = additional_info

    return JSONResponse(status_code=status_code, content=content)


# Predefined common errors
def unauthorized_error(
    detail: str = "Authentication required", error_code: str = "UNAUTHORIZED"
) -> JSONResponse:
    return create_error_response(status.HTTP_401_UNAUTHORIZED, detail, error_code)


def authentication_error(
    detail: str = "Authentication failed", error_code: str = "AUTHENTICATION_FAILED"
) -> JSONResponse:
    return create_error_response(status.HTTP_401_UNAUTHORIZED, detail, error_code)


def forbidden_error(
    detail: str = "Permission denied", error_code: str = "FORBIDDEN"
) -> JSONResponse:
    return create_error_response(status.HTTP_403_FORBIDDEN, detail, error_code)


def authorization_error(
    detail: str = "Authorization failed", error_code: str = "AUTHORIZATION_FAILED"
) -> JSONResponse:
    return create_error_response(status.HTTP_403_FORBIDDEN, detail, error_code)


def not_found_error(
    detail: str = "Resource not found", error_code: str = "NOT_FOUND"
) -> JSONResponse:
    return create_error_response(status.HTTP_404_NOT_FOUND, detail, error_code)


def validation_error(
    detail: str = "Validation error",
    fields: Dict[str, str] = None,
    error_code: str = "VALIDATION_ERROR",
) -> JSONResponse:
    additional_info = {"fields": fields} if fields else None
    return create_error_response(
        status.HTTP_422_UNPROCESSABLE_ENTITY, detail, error_code, additional_info
    )


def business_logic_error(
    detail: str = "Business logic error", error_code: str = "BUSINESS_LOGIC_ERROR"
) -> JSONResponse:
    return create_error_response(status.HTTP_400_BAD_REQUEST, detail, error_code)


def conflict_error(
    detail: str = "Resource conflict", error_code: str = "CONFLICT"
) -> JSONResponse:
    return create_error_response(status.HTTP_409_CONFLICT, detail, error_code)


def server_error(
    detail: str = "Internal server error", error_code: str = "SERVER_ERROR"
) -> JSONResponse:
    return create_error_response(
        status.HTTP_500_INTERNAL_SERVER_ERROR, detail, error_code
    )


def rate_limit_error(
    detail: str = "Rate limit exceeded", error_code: str = "RATE_LIMIT"
) -> JSONResponse:
    return create_error_response(status.HTTP_429_TOO_MANY_REQUESTS, detail, error_code)
