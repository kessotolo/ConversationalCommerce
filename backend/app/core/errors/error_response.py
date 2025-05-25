from fastapi import status
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any


def create_error_response(
    status_code: int, 
    detail: str, 
    error_code: Optional[str] = None, 
    additional_info: Optional[Dict[str, Any]] = None
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
    
    content = {
        "error": {
            "code": error_code,
            "detail": detail
        }
    }
    
    # Add additional info if provided
    if additional_info:
        content["error"]["additional_info"] = additional_info
    
    return JSONResponse(
        status_code=status_code,
        content=content
    )


# Predefined common errors
def unauthorized_error(detail: str = "Authentication required", error_code: str = "UNAUTHORIZED") -> JSONResponse:
    return create_error_response(status.HTTP_401_UNAUTHORIZED, detail, error_code)


def forbidden_error(detail: str = "Permission denied", error_code: str = "FORBIDDEN") -> JSONResponse:
    return create_error_response(status.HTTP_403_FORBIDDEN, detail, error_code)


def not_found_error(detail: str = "Resource not found", error_code: str = "NOT_FOUND") -> JSONResponse:
    return create_error_response(status.HTTP_404_NOT_FOUND, detail, error_code)


def validation_error(detail: str = "Validation error", fields: Dict[str, str] = None, error_code: str = "VALIDATION_ERROR") -> JSONResponse:
    return create_error_response(
        status.HTTP_422_UNPROCESSABLE_ENTITY, 
        detail, 
        error_code,
        {"fields": fields} if fields else None
    )


def conflict_error(detail: str = "Resource conflict", error_code: str = "CONFLICT") -> JSONResponse:
    return create_error_response(status.HTTP_409_CONFLICT, detail, error_code)


def server_error(detail: str = "Internal server error", error_code: str = "SERVER_ERROR") -> JSONResponse:
    return create_error_response(status.HTTP_500_INTERNAL_SERVER_ERROR, detail, error_code)
