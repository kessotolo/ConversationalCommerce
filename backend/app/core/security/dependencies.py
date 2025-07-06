"""
Authentication dependencies with Clerk Organizations support and session management.

This module provides authentication dependencies that integrate with:
- Clerk Organizations for SuperAdmin access control
- Advanced session management with idle timeout
- Domain-specific authentication
"""

import os
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.security.clerk import verify_clerk_token, ClerkTokenData
from app.core.security.clerk_organizations import clerk_organizations_service
from app.core.security.session import super_admin_session_manager
from app.core.logging import logger
from app.models.admin.admin_user import AdminUser


# HTTP Bearer token scheme
bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        bearer_scheme),
    db: AsyncSession = Depends(get_db)
) -> ClerkTokenData:
    """
    Get current authenticated user from Clerk token.

    Args:
        request: FastAPI request object
        credentials: Bearer token credentials
        db: Database session

    Returns:
        ClerkTokenData with user information

    Raises:
        HTTPException: If authentication fails
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )

    try:
        token_data = verify_clerk_token(credentials.credentials)

        # Log authentication attempt
        logger.info(
            f"User authenticated: {token_data.user_id} from IP: {request.client.host if request.client else 'unknown'}"
        )

        return token_data

    except Exception as e:
        logger.error(f"Authentication failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token"
        )


async def get_current_super_admin(
    request: Request,
    current_user: ClerkTokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ClerkTokenData:
    """
    Get current authenticated SuperAdmin user with session management.

    Validates that the user is a member of the SuperAdmin organization,
    has appropriate domain access, and manages their session.

    Args:
        request: FastAPI request object
        current_user: Current authenticated user
        db: Database session

    Returns:
        ClerkTokenData for SuperAdmin user

    Raises:
        HTTPException: If user is not a SuperAdmin or access is denied
    """
    try:
        # Check if user is a SuperAdmin
        is_super_admin = await clerk_organizations_service.is_super_admin(current_user.user_id)

        if not is_super_admin:
            logger.warning(
                f"Non-SuperAdmin user attempted admin access: {current_user.user_id} from IP: {request.client.host if request.client else 'unknown'}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="SuperAdmin access required"
            )

        # Validate domain access
        host = request.headers.get("host", "")
        domain_allowed = await clerk_organizations_service.validate_domain_access(
            current_user.user_id, host
        )

        if not domain_allowed:
            logger.warning(
                f"SuperAdmin user denied domain access: {current_user.user_id} to {host} from IP: {request.client.host if request.client else 'unknown'}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied for this domain"
            )

        # Get client information for session management
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("User-Agent", "")

        # Check for existing session or create new one
        session_id = request.headers.get("X-Session-ID")
        session_info = None

        if session_id:
            # Validate existing session
            session_info = await super_admin_session_manager.validate_session(
                db, session_id, client_ip, user_agent
            )

        if not session_info:
            # Create new session
            session_info = await super_admin_session_manager.create_session(
                db, current_user.user_id, client_ip, user_agent
            )

        # Get SuperAdmin role
        super_admin_role = await clerk_organizations_service.get_super_admin_role(current_user.user_id)

        # Add organization and session info to token data
        current_user.organization_id = clerk_organizations_service.super_admin_org_id
        current_user.organization_role = super_admin_role
        current_user.session_id = session_info.session_id
        current_user.session_expires_at = session_info.expires_at
        current_user.security_level = session_info.security_level

        logger.info(
            f"SuperAdmin access granted: {current_user.user_id} (role: {super_admin_role}, session: {session_info.session_id}) "
            f"to {host} from IP: {client_ip}"
        )

        return current_user

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"SuperAdmin authentication error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service error"
        )


async def get_current_admin_user(
    request: Request,
    current_super_admin: ClerkTokenData = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db)
) -> AdminUser:
    """
    Get current SuperAdmin user as AdminUser model.

    Creates or updates the AdminUser record based on Clerk organization data
    and session information.

    Args:
        request: FastAPI request object
        current_super_admin: Current authenticated SuperAdmin
        db: Database session

    Returns:
        AdminUser model instance

    Raises:
        HTTPException: If AdminUser creation/retrieval fails
    """
    try:
        # Try to get existing AdminUser
        admin_user = await db.get(AdminUser, current_super_admin.user_id)

        if not admin_user:
            # Create new AdminUser for SuperAdmin
            admin_user = AdminUser(
                id=current_super_admin.user_id,
                email=current_super_admin.email,
                is_super_admin=True,
                is_active=True,
                clerk_organization_id=current_super_admin.organization_id,
                clerk_organization_role=current_super_admin.organization_role,
                session_timeout_minutes=_get_timeout_for_security_level(
                    current_super_admin.security_level
                )
            )
            db.add(admin_user)
            await db.commit()
            await db.refresh(admin_user)

            logger.info(f"Created new SuperAdmin user: {admin_user.id}")
        else:
            # Update existing AdminUser with latest organization and session info
            admin_user.is_super_admin = True
            admin_user.is_active = True
            admin_user.clerk_organization_id = current_super_admin.organization_id
            admin_user.clerk_organization_role = current_super_admin.organization_role

            if admin_user.email != current_super_admin.email:
                admin_user.email = current_super_admin.email

            # Update session timeout based on security level
            admin_user.session_timeout_minutes = _get_timeout_for_security_level(
                current_super_admin.security_level
            )

            # Update activity timestamp
            admin_user.update_activity()

            await db.commit()
            await db.refresh(admin_user)

        return admin_user

    except Exception as e:
        await db.rollback()
        logger.error(f"Error getting/creating AdminUser: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get admin user"
        )


async def require_super_admin_role(
    role: str,
    current_super_admin: ClerkTokenData = Depends(get_current_super_admin)
) -> ClerkTokenData:
    """
    Require a specific SuperAdmin role.

    Args:
        role: Required role (e.g., 'admin', 'owner')
        current_super_admin: Current authenticated SuperAdmin

    Returns:
        ClerkTokenData if role requirement is met

    Raises:
        HTTPException: If user doesn't have required role
    """
    if current_super_admin.organization_role != role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{role}' required"
        )

    return current_super_admin


async def require_elevated_security(
    current_super_admin: ClerkTokenData = Depends(get_current_super_admin)
) -> ClerkTokenData:
    """
    Require elevated security level for sensitive operations.

    Args:
        current_super_admin: Current authenticated SuperAdmin

    Returns:
        ClerkTokenData if security requirement is met

    Raises:
        HTTPException: If user doesn't have required security level
    """
    if current_super_admin.security_level not in ["elevated", "high"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Elevated security level required"
        )

    return current_super_admin


async def require_high_security(
    current_super_admin: ClerkTokenData = Depends(get_current_super_admin)
) -> ClerkTokenData:
    """
    Require high security level for critical operations.

    Args:
        current_super_admin: Current authenticated SuperAdmin

    Returns:
        ClerkTokenData if security requirement is met

    Raises:
        HTTPException: If user doesn't have required security level
    """
    if current_super_admin.security_level != "high":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="High security level required"
        )

    return current_super_admin


async def validate_domain_access(
    request: Request,
    current_user: ClerkTokenData = Depends(get_current_user)
) -> ClerkTokenData:
    """
    Validate domain-specific access for any authenticated user.

    Args:
        request: FastAPI request object
        current_user: Current authenticated user

    Returns:
        ClerkTokenData if domain access is allowed

    Raises:
        HTTPException: If domain access is denied
    """
    try:
        host = request.headers.get("host", "")
        domain_allowed = await clerk_organizations_service.validate_domain_access(
            current_user.user_id, host
        )

        if not domain_allowed:
            logger.warning(
                f"User denied domain access: {current_user.user_id} to {host} from IP: {request.client.host if request.client else 'unknown'}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied for this domain"
            )

        return current_user

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Domain validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Domain validation failed"
        )


async def logout_super_admin(
    request: Request,
    current_super_admin: ClerkTokenData = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, str]:
    """
    Logout SuperAdmin user and invalidate session.

    Args:
        request: FastAPI request object
        current_super_admin: Current authenticated SuperAdmin
        db: Database session

    Returns:
        Success message
    """
    try:
        # Invalidate current session
        if hasattr(current_super_admin, 'session_id') and current_super_admin.session_id:
            await super_admin_session_manager.invalidate_session(
                db, current_super_admin.session_id, "logout"
            )

        logger.info(f"SuperAdmin logged out: {current_super_admin.user_id}")
        return {"message": "Successfully logged out"}

    except Exception as e:
        logger.error(f"Error during SuperAdmin logout: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )


def _get_timeout_for_security_level(security_level: str) -> int:
    """Get timeout minutes for security level."""
    timeouts = {
        "standard": 60,    # 1 hour
        "elevated": 30,    # 30 minutes
        "high": 15         # 15 minutes
    }
    return timeouts.get(security_level, 60)


# Convenience functions for backward compatibility
require_auth = get_current_user
require_super_admin = get_current_super_admin


async def require_auth(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
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
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        bearer_scheme),
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
