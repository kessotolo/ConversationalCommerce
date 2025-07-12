"""
User endpoints for user management and tenant checks.
"""

from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.api.deps import get_db
from backend.app.models.user import User
from backend.app.models.tenant import Tenant
from backend.app.schemas.user import UserHasTenantResponse

router = APIRouter()


@router.get("/has-tenant", response_model=UserHasTenantResponse)
async def check_user_has_tenant(
    user_id: str,
    db: AsyncSession = Depends(get_db)
) -> UserHasTenantResponse:
    """
    Check if a user has an associated tenant.

    Args:
        user_id: The Clerk user ID to check
        db: Database session

    Returns:
        UserHasTenantResponse with has_tenant boolean and optional tenant info
    """
    try:
        # Convert string to UUID
        user_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID format"
        )

    # Query for user
    query = select(User).where(User.id == user_uuid)
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if not user:
        return UserHasTenantResponse(
            has_tenant=False,
            tenant_id=None,
            tenant_name=None
        )

    # Check if user has a tenant
    if not user.tenant_id:
        return UserHasTenantResponse(
            has_tenant=False,
            tenant_id=None,
            tenant_name=None
        )

    # Get tenant information
    tenant_query = select(Tenant).where(Tenant.id == user.tenant_id)
    tenant_result = await db.execute(tenant_query)
    tenant = tenant_result.scalar_one_or_none()

    if not tenant:
        return UserHasTenantResponse(
            has_tenant=False,
            tenant_id=None,
            tenant_name=None
        )

    return UserHasTenantResponse(
        has_tenant=True,
        tenant_id=str(tenant.id),
        tenant_name=tenant.name
    )
