"""
Merchant-specific authentication dependencies and services.

This module provides authentication dependencies that integrate merchant/tenant
context validation with the existing multi-organization Clerk support.

Phase 2 Track A: Modular auth service with merchant-specific authentication
"""

import uuid
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.deps import get_db
from app.core.security.clerk_multi_org import MultiOrgClerkTokenData
from app.core.security.dependencies import get_current_user, get_current_seller
from app.models.tenant import Tenant
from app.models.user import User


class MerchantAuthContext:
    """
    Merchant authentication context containing user, tenant, and merchant data.
    """

    def __init__(
        self,
        user_data: MultiOrgClerkTokenData,
        user: User,
        tenant: Tenant,
        merchant_id: str
    ):
        self.user_data = user_data
        self.user = user
        self.tenant = tenant
        self.merchant_id = merchant_id

    @property
    def is_merchant_owner(self) -> bool:
        """Check if user is the owner of this merchant."""
        return self.user.tenant_id == self.tenant.id

    @property
    def has_merchant_access(self) -> bool:
        """Check if user has access to this merchant."""
        return (
            self.is_merchant_owner or
            self.user_data.is_admin() or
            self.user_data.is_super_admin()
        )

    def get_merchant_context(self) -> Dict[str, Any]:
        """Get merchant context for request processing."""
        return {
            "merchant_id": self.merchant_id,
            "tenant_id": str(self.tenant.id),
            "subdomain": self.tenant.subdomain,
            "custom_domain": self.tenant.custom_domain,
            "user_id": self.user_data.user_id,
            "user_roles": self.user_data.roles,
            "organization_source": self.user_data.organization_source,
            "is_merchant_owner": self.is_merchant_owner,
            "has_admin_access": self.user_data.is_admin(),
        }


async def get_merchant_from_path(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> str:
    """
    Extract merchant ID from request path.
    Expected patterns: /api/v1/admin/{merchant-id}/*, /api/v1/storefront/{merchant-id}/*
    """
    path_parts = request.url.path.strip('/').split('/')

    # Look for merchant ID in path patterns
    merchant_id = None

    # Admin pattern: /api/v1/admin/{merchant-id}/
    if len(path_parts) >= 4 and path_parts[0] == 'api' and path_parts[1] == 'v1' and path_parts[2] == 'admin':
        merchant_id = path_parts[3]

    # Storefront pattern: /api/v1/storefront/{merchant-id}/
    elif len(path_parts) >= 4 and path_parts[0] == 'api' and path_parts[1] == 'v1' and path_parts[2] == 'storefront':
        merchant_id = path_parts[3]

    # Alternative: check for merchant ID in headers
    if not merchant_id:
        merchant_id = request.headers.get("X-Merchant-ID")

    if not merchant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Merchant ID required in path or headers"
        )

    return merchant_id


async def get_merchant_tenant(
    merchant_id: str = Depends(get_merchant_from_path),
    db: AsyncSession = Depends(get_db)
) -> Tenant:
    """
    Get tenant by merchant ID with validation.
    Supports both UUID tenant IDs and subdomain lookups.
    """
    try:
        # Try to parse as UUID first
        tenant_uuid = uuid.UUID(merchant_id)
        query = select(Tenant).where(Tenant.id == tenant_uuid)
    except ValueError:
        # If not UUID, treat as subdomain
        query = select(Tenant).where(Tenant.subdomain == merchant_id)

    result = await db.execute(query)
    tenant = result.scalar_one_or_none()

    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Merchant '{merchant_id}' not found"
        )

    if not tenant.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Merchant '{merchant_id}' is not active"
        )

    return tenant


async def get_merchant_user(
    current_user: MultiOrgClerkTokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Get user from database with merchant context validation.
    """
    # Get user from database by Clerk user ID
    query = select(User).where(User.id == current_user.user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in database"
        )

    return user


async def get_merchant_auth_context(
    merchant_id: str = Depends(get_merchant_from_path),
    current_user: MultiOrgClerkTokenData = Depends(get_current_user),
    user: User = Depends(get_merchant_user),
    tenant: Tenant = Depends(get_merchant_tenant),
    db: AsyncSession = Depends(get_db)
) -> MerchantAuthContext:
    """
    Get complete merchant authentication context.
    Validates user access to the specific merchant.
    """
    context = MerchantAuthContext(
        user_data=current_user,
        user=user,
        tenant=tenant,
        merchant_id=merchant_id
    )

    if not context.has_merchant_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied to merchant '{merchant_id}'"
        )

    return context


async def require_merchant_seller(
    context: MerchantAuthContext = Depends(get_merchant_auth_context)
) -> MerchantAuthContext:
    """
    Require seller access to specific merchant.
    User must be either the merchant owner or have seller role.
    """
    if not (context.user_data.is_seller() or context.is_merchant_owner):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seller access required for this merchant"
        )

    return context


async def require_merchant_admin(
    context: MerchantAuthContext = Depends(get_merchant_auth_context)
) -> MerchantAuthContext:
    """
    Require admin access to specific merchant.
    User must be either merchant owner, admin, or super admin.
    """
    if not (context.is_merchant_owner or context.user_data.is_admin() or context.user_data.is_super_admin()):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required for this merchant"
        )

    return context


async def require_merchant_owner(
    context: MerchantAuthContext = Depends(get_merchant_auth_context)
) -> MerchantAuthContext:
    """
    Require owner access to specific merchant.
    User must be the merchant owner or super admin.
    """
    if not (context.is_merchant_owner or context.user_data.is_super_admin()):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Merchant owner access required"
        )

    return context


# Convenience functions for backward compatibility
async def get_current_merchant_seller(
    context: MerchantAuthContext = Depends(require_merchant_seller)
) -> MultiOrgClerkTokenData:
    """Get current merchant seller user data."""
    return context.user_data


async def get_current_merchant_admin(
    context: MerchantAuthContext = Depends(require_merchant_admin)
) -> MultiOrgClerkTokenData:
    """Get current merchant admin user data."""
    return context.user_data


async def get_current_merchant_owner(
    context: MerchantAuthContext = Depends(require_merchant_owner)
) -> MultiOrgClerkTokenData:
    """Get current merchant owner user data."""
    return context.user_data
