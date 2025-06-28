import os
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security.clerk import ClerkTokenData, verify_clerk_token

security = HTTPBearer()


async def require_auth(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> ClerkTokenData:
    """
    Dependency to require authentication for protected routes.

    Args:
        credentials: HTTP authorization credentials

    Returns:
        ClerkTokenData: Decoded token data

    Raises:
        HTTPException: If token is invalid or missing
    """
    # In test mode, allow requests without token
    if os.getenv("TESTING", "").lower() in ("true", "1", "t", "yes", "y"):
        return ClerkTokenData(
            sub="00000000-0000-0000-0000-000000000001",  # valid UUID
            email="test@example.com",
            roles=["test"],
            # valid UUID
            metadata={"store_id": "00000000-0000-0000-0000-000000000010"},
        )

    # Get token from authorization header
    token = credentials.credentials

    # Verify token
    try:
        token_data = verify_clerk_token(token)
        return token_data
    except AppError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )


async def require_role(
    role: str, token_data: ClerkTokenData = Depends(require_auth)
) -> ClerkTokenData:
    """
    Dependency to require a specific role for protected routes.

    Args:
        role: Required role
        token_data: Decoded token data

    Returns:
        ClerkTokenData: Decoded token data

    Raises:
        HTTPException: If user doesn't have required role
    """
    if not token_data.has_role(role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions"
        )
    return token_data


async def require_any_role(
    roles: list[str], token_data: ClerkTokenData = Depends(require_auth)
) -> ClerkTokenData:
    """
    Dependency to require any of the specified roles for protected routes.

    Args:
        roles: List of allowed roles
        token_data: Decoded token data

    Returns:
        ClerkTokenData: Decoded token data

    Raises:
        HTTPException: If user doesn't have any of the required roles
    """
    if not token_data.has_any_role(roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions"
        )
    return token_data


async def require_all_roles(
    roles: list[str], token_data: ClerkTokenData = Depends(require_auth)
) -> ClerkTokenData:
    """
    Dependency to require all of the specified roles for protected routes.

    Args:
        roles: List of required roles
        token_data: Decoded token data

    Returns:
        ClerkTokenData: Decoded token data

    Raises:
        HTTPException: If user doesn't have all of the required roles
    """
    if not token_data.has_all_roles(roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions"
        )
    return token_data


async def optional_auth(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[ClerkTokenData]:
    """
    Dependency for routes that can be accessed with or without authentication.

    Args:
        credentials: Optional HTTP authorization credentials

    Returns:
        Optional[ClerkTokenData]: Decoded token data if authenticated, None otherwise
    """
    if not credentials:
        return None

    try:
        return verify_clerk_token(credentials.credentials)
    except AppError:
        return None
