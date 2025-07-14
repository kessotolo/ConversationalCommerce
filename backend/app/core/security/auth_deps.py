import os
from typing import Optional
from fastapi import HTTPException, status, Request
from app.core.security.clerk_multi_org import MultiOrgClerkTokenData, clerk_service


async def require_auth(request: Request, authorization: Optional[str] = None) -> MultiOrgClerkTokenData:
    """
    Dependency to require authentication for protected routes.
    Validates token and returns user data with roles.
    """
    if not authorization:
        authorization = request.headers.get("authorization")
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required"
        )
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer token required"
        )
    token = authorization.replace("Bearer ", "")
    try:
        return clerk_service.verify_token(token)
    except HTTPException:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
