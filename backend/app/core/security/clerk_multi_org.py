"""
Multi-Organization Clerk Authentication Service

This service handles authentication for both seller and admin Clerk organizations.
It can validate tokens from either organization and assign appropriate roles.
"""

import os
import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from fastapi import HTTPException, status
from pydantic import BaseModel

from app.core.config.settings import get_settings

# Check if we're in test mode
IS_TEST_MODE = os.getenv("TESTING", "").lower() in (
    "true", "1", "t", "yes", "y")

settings = get_settings()


class MultiOrgClerkTokenData(BaseModel):
    """Multi-organization Clerk token data."""
    user_id: str
    email: str
    roles: List[str]
    metadata: Dict[str, Any]
    organization_source: str
    exp: Optional[int] = None
    iat: Optional[int] = None
    organization_id: Optional[str] = None

    def has_role(self, role: str) -> bool:
        """Check if user has the specified role."""
        return role in self.roles

    def is_admin(self) -> bool:
        """Check if user is an admin."""
        return any(role in ["admin", "super_admin"] for role in self.roles)

    def is_seller(self) -> bool:
        """Check if user is a seller."""
        return "seller" in self.roles

    def is_super_admin(self) -> bool:
        """Check if user is a super admin."""
        return "super_admin" in self.roles

    def has_any_role(self, roles: list[str]) -> bool:
        """Check if user has any of the specified roles."""
        return any(role in self.roles for role in roles)

    def has_all_roles(self, roles: list[str]) -> bool:
        """Check if user has all of the specified roles."""
        return all(role in self.roles for role in roles)


class MultiOrgClerkService:
    """Service for handling multi-organization Clerk authentication."""

    def __init__(self):
        self.seller_secret_key = settings.SELLER_CLERK_SECRET_KEY
        self.admin_secret_key = settings.ADMIN_CLERK_SECRET_KEY
        self.seller_public_key = settings.SELLER_CLERK_PUBLISHABLE_KEY
        self.admin_public_key = settings.ADMIN_CLERK_PUBLISHABLE_KEY

    def _generate_test_token(self, user_id: str, email: str, roles: List[str],
                             org_source: str, expires_in: int = 3600) -> str:
        """Generate a proper test JWT token that follows real validation flow."""
        # Use a timestamp that's just a few minutes in the past to avoid expiration
        import time
        iat_timestamp = int(time.time()) - 300  # 5 minutes ago
        exp_timestamp = iat_timestamp + expires_in

        payload = {
            "sub": user_id,
            "email": email,
            "roles": roles,
            "metadata": {"store_id": "test-store", "name": "Test User"},
            "organization_source": org_source,
            "iat": iat_timestamp,
            "exp": exp_timestamp,
            "iss": "test-issuer",
            "aud": "admin-audience" if org_source == "admin" else "seller-audience"
        }

        # Use the appropriate secret key based on org source
        secret_key = self.admin_secret_key if org_source == "admin" else self.seller_secret_key
        return jwt.encode(payload, secret_key, algorithm="HS256")

    def verify_token(self, token: str) -> MultiOrgClerkTokenData:
        """
        Verify a Clerk JWT token from either organization.
        In test mode, generate proper test tokens that follow real validation.
        """
        if not IS_TEST_MODE:
            # Real production token verification
            return self._verify_production_token(token)

        # Test mode: Generate proper test tokens
        if token == "test_token":
            test_token = self._generate_test_token(
                "00000000-0000-0000-0000-000000000001",
                "test@example.com",
                ["seller"],
                "seller"
            )
            return self._verify_production_token(test_token)

        elif token == "admin_token":
            test_token = self._generate_test_token(
                "00000000-0000-0000-0000-000000000002",
                "admin@example.com",
                ["admin", "super_admin"],
                "admin"
            )
            return self._verify_production_token(test_token)

        elif token == "super_admin_token":
            test_token = self._generate_test_token(
                "00000000-0000-0000-0000-000000000003",
                "superadmin@enwhe.com",
                ["admin", "super_admin"],
                "admin"
            )
            token_data = self._verify_production_token(test_token)
            # Add organization_id for super admin
            token_data.organization_id = "org_2zWGCeV8c2H56B4ZcK5QmDOv9vL"
            return token_data

        # For any other test token, treat as invalid
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid test token"
        )

    def _verify_production_token(self, token: str) -> MultiOrgClerkTokenData:
        """Verify a production Clerk JWT token."""
        # Try admin org first if admin secret key is available
        if self.admin_secret_key:
            try:
                payload = jwt.decode(
                    token,
                    self.admin_secret_key,
                    algorithms=["HS256"],
                    audience="admin-audience"
                )
                return MultiOrgClerkTokenData(
                    user_id=payload["sub"],
                    email=payload["email"],
                    roles=payload.get("roles", []),
                    metadata=payload.get("metadata", {}),
                    organization_source="admin",
                    exp=payload.get("exp"),
                    iat=payload.get("iat")
                )
            except (jwt.InvalidTokenError, Exception):
                # Continue to try seller key if admin key fails
                pass
                
        # Try seller org if seller secret key is available
        if self.seller_secret_key:
            try:
                payload = jwt.decode(
                    token,
                    self.seller_secret_key,
                    algorithms=["HS256"],
                    audience="seller-audience"
                )
                return MultiOrgClerkTokenData(
                    user_id=payload["sub"],
                    email=payload["email"],
                    roles=payload.get("roles", []),
                    metadata=payload.get("metadata", {}),
                    organization_source="seller",
                    exp=payload.get("exp"),
                    iat=payload.get("iat")
                )
            except (jwt.InvalidTokenError, jwt.ExpiredSignatureError):
                pass

        # If both fail, token is invalid
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token or missing authentication keys"
        )


# Singleton instance
clerk_service = MultiOrgClerkService()

multi_org_clerk_service = clerk_service
