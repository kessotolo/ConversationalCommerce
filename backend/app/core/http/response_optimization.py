import hashlib
import json
import time
from typing import Any, Optional, Dict, Callable
from fastapi import Request, Response, HTTPException, status
import logging

logger = logging.getLogger(__name__)

def generate_etag(data: Any) -> str:
    """
    Generate an ETag for a response.
    
    Args:
        data: Data to generate ETag for
        
    Returns:
        ETag string
    """
    if isinstance(data, dict) or isinstance(data, list):
        data_str = json.dumps(data, sort_keys=True)
    else:
        data_str = str(data)
    
    return hashlib.md5(data_str.encode()).hexdigest()


def set_cache_headers(
    response: Response,
    cache_control: str = "public",
    max_age: int = 300,
    etag: Optional[str] = None,
    vary: Optional[str] = None
) -> None:
    """
    Set cache headers on a response.
    
    Args:
        response: FastAPI response
        cache_control: Cache control directive
        max_age: Max age in seconds
        etag: Optional ETag value
        vary: Optional Vary header value
    """
    # Set Cache-Control header
    response.headers["Cache-Control"] = f"{cache_control}, max-age={max_age}"
    
    # Set ETag if provided
    if etag:
        response.headers["ETag"] = etag
    
    # Set Vary header if provided
    if vary:
        response.headers["Vary"] = vary
    
    # Set Date header
    response.headers["Date"] = time.strftime("%a, %d %b %Y %H:%M:%S GMT", time.gmtime())


def handle_conditional_request(request: Request, response: Response, etag: str) -> bool:
    """
    Handle conditional request based on ETag.
    
    Args:
        request: FastAPI request
        response: FastAPI response
        etag: ETag for the current resource version
        
    Returns:
        True if a 304 Not Modified response was sent, False otherwise
    """
    # Check If-None-Match header
    if_none_match = request.headers.get("If-None-Match")
    
    if if_none_match and if_none_match == etag:
        # Resource has not been modified
        response.status_code = status.HTTP_304_NOT_MODIFIED
        
        # Set ETag and other cache headers
        response.headers["ETag"] = etag
        
        # Clear response body
        response.body = b""
        response.headers.pop("Content-Length", None)
        response.headers.pop("Content-Type", None)
        
        return True
    
    return False


def optimize_response(
    response_data: Any,
    request: Request,
    response: Response,
    cache_control: str = "public",
    max_age: int = 300,
    vary: Optional[str] = None
) -> Any:
    """
    Optimize a response with caching headers and conditional request handling.
    
    Args:
        response_data: Data to return in response
        request: FastAPI request
        response: FastAPI response
        cache_control: Cache control directive
        max_age: Max age in seconds
        vary: Optional Vary header value
        
    Returns:
        Response data or None if a 304 Not Modified response was sent
    """
    # Generate ETag for the response data
    etag = generate_etag(response_data)
    
    # Check if we can return a 304 Not Modified
    if handle_conditional_request(request, response, etag):
        return None
    
    # Set cache headers
    set_cache_headers(
        response=response,
        cache_control=cache_control,
        max_age=max_age,
        etag=etag,
        vary=vary or "Accept, Accept-Encoding, X-Tenant-ID"
    )
    
    return response_data


def conditional_response(
    cache_control: str = "public",
    max_age: int = 300,
    vary: Optional[str] = None
):
    """
    Decorator for handling conditional requests and setting cache headers.
    
    Args:
        cache_control: Cache control directive
        max_age: Max age in seconds
        vary: Optional Vary header value
        
    Returns:
        Decorator function
    """
    def decorator(func: Callable):
        async def wrapper(*args, **kwargs):
            # Find request and response objects
            request = None
            response = None
            
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                if isinstance(arg, Response):
                    response = arg
            
            if not request:
                request = kwargs.get("request")
            
            if not response:
                response = kwargs.get("response")
            
            if not request or not response:
                # Can't optimize without request and response
                return await func(*args, **kwargs)
            
            # Call the original function
            result = await func(*args, **kwargs)
            
            # Optimize the response
            return optimize_response(
                response_data=result,
                request=request,
                response=response,
                cache_control=cache_control,
                max_age=max_age,
                vary=vary
            )
        
        return wrapper
    
    return decorator
