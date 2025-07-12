import os
from typing import List
from fastapi import Depends, HTTPException, status
from enum import Enum

from backend.app.core.security.clerk_multi_org import MultiOrgClerkTokenData as ClerkTokenData
from backend.app.core.security.auth_deps import require_auth

# Helper: is test mode?
IS_TEST_MODE = os.getenv("TESTING", "").lower() in (
    "true", "1", "t", "yes", "y")


class RoleType(str, Enum):
    """Role types for role-based access control."""
    SELLER = "seller"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"
    CUSTOMER = "customer"


class RoleChecker:
    """Class to check if a user has the required roles"""

    def __init__(self, allowed_roles: List[RoleType]):
        self.allowed_roles = [role.value for role in allowed_roles]

    def __call__(self, user: ClerkTokenData = Depends(require_auth)) -> bool:
        """Check if user has any of the allowed roles."""
        for role in self.allowed_roles:
            if user.has_role(role):
                return True

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Required roles: {', '.join(self.allowed_roles)}"
        )


def require_role(role: str):
    """Dependency to require a specific role."""
    def role_checker(user: ClerkTokenData = Depends(require_auth)) -> ClerkTokenData:
        if not user.has_role(role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{role}' required"
            )
        return user
    return role_checker


def require_any_role(roles: List[str]):
    """Dependency to require any of the specified roles."""
    def role_checker(user: ClerkTokenData = Depends(require_auth)) -> ClerkTokenData:
        for role in roles:
            if user.has_role(role):
                return user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"One of the following roles required: {', '.join(roles)}"
        )
    return role_checker


def require_all_roles(roles: List[str]):
    """Dependency to require all of the specified roles."""
    def role_checker(user: ClerkTokenData = Depends(require_auth)) -> ClerkTokenData:
        for role in roles:
            if not user.has_role(role):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"All of the following roles required: {', '.join(roles)}"
                )
        return user
    return role_checker


# Convenience functions for common role checks
require_seller = require_role("seller")
require_admin = require_role("admin")
require_super_admin = require_role("super_admin")
require_customer = require_role("customer")

# Role checkers for multiple roles
require_seller_or_admin = require_any_role(["seller", "admin"])
require_admin_or_super_admin = require_any_role(["admin", "super_admin"])
require_seller_admin_super = require_any_role(
    ["seller", "admin", "super_admin"])
