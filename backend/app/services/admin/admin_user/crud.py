"""
CRUD operations for the AdminUser model.
"""

from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.app.models.admin.admin_user import AdminUser
from app.app.models.user import User
from app.app.core.exceptions import ResourceNotFoundError, ValidationError


async def create_admin_user(
    db: AsyncSession,
    user_id: UUID,
    is_super_admin: bool = False,
    require_2fa: bool = True,
    allowed_ip_ranges: Optional[List[str]] = None,
    preferences: Optional[Dict[str, Any]] = None
) -> AdminUser:
    """
    Create a new admin user.

    Args:
        db: Database session
        user_id: ID of the base user to associate with the admin user
        is_super_admin: Whether this is a super admin
        require_2fa: Whether 2FA is required for this admin user
        allowed_ip_ranges: List of allowed IP ranges for this admin user
        preferences: Admin interface preferences

    Returns:
        The created admin user

    Raises:
        ResourceNotFoundError: If the user does not exist
        ValidationError: If an admin user already exists for this user
    """
    # Verify user exists
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise ResourceNotFoundError("User", user_id)
        
    # Validate IP ranges if provided
    if allowed_ip_ranges:
        from app.app.services.admin.admin_user.auth import validate_ip_ranges
        validate_ip_ranges(allowed_ip_ranges)
    
    try:
        admin_user = AdminUser(
            user_id=user_id,
            is_super_admin=is_super_admin,
            require_2fa=require_2fa,
            allowed_ip_ranges=allowed_ip_ranges,
            preferences=preferences or {}
        )
        db.add(admin_user)
        await db.flush()
        return admin_user
    except IntegrityError:
        await db.rollback()
        raise ValidationError(f"Admin user already exists for user {user_id}")


async def get_admin_user(
    db: AsyncSession,
    admin_user_id: UUID
) -> AdminUser:
    """
    Get an admin user by ID.

    Args:
        db: Database session
        admin_user_id: ID of the admin user to retrieve

    Returns:
        The admin user

    Raises:
        ResourceNotFoundError: If the admin user does not exist
    """
    result = await db.execute(
        select(AdminUser).where(AdminUser.id == admin_user_id)
    )
    admin_user = result.scalars().first()
    if not admin_user:
        raise ResourceNotFoundError("AdminUser", admin_user_id)
    return admin_user


async def get_admin_user_by_user_id(
    db: AsyncSession,
    user_id: UUID
) -> Optional[AdminUser]:
    """
    Get an admin user by user ID.

    Args:
        db: Database session
        user_id: ID of the base user

    Returns:
        The admin user if found, None otherwise
    """
    result = await db.execute(
        select(AdminUser).where(AdminUser.user_id == user_id)
    )
    return result.scalars().first()


async def list_admin_users(
    db: AsyncSession,
    is_active: Optional[bool] = None,
    is_super_admin: Optional[bool] = None
) -> List[AdminUser]:
    """
    List admin users with optional filtering.

    Args:
        db: Database session
        is_active: Filter by is_active flag
        is_super_admin: Filter by is_super_admin flag

    Returns:
        List of admin users matching the criteria
    """
    query = select(AdminUser)
    
    # Apply filters if provided
    if is_active is not None:
        query = query.where(AdminUser.is_active == is_active)
    if is_super_admin is not None:
        query = query.where(AdminUser.is_super_admin == is_super_admin)
        
    result = await db.execute(query)
    return list(result.scalars().all())


async def update_admin_user(
    db: AsyncSession,
    admin_user_id: UUID,
    **update_data
) -> AdminUser:
    """
    Update an admin user.

    Args:
        db: Database session
        admin_user_id: ID of the admin user to update
        **update_data: Data to update on the admin user

    Returns:
        The updated admin user

    Raises:
        ResourceNotFoundError: If the admin user does not exist
    """
    # Get the admin user to update
    admin_user = await get_admin_user(db, admin_user_id)
    
    # Validate IP ranges if provided
    if "allowed_ip_ranges" in update_data and update_data["allowed_ip_ranges"]:
        from app.app.services.admin.admin_user.auth import validate_ip_ranges
        validate_ip_ranges(update_data["allowed_ip_ranges"])
        
    # Update attributes that are provided
    for key, value in update_data.items():
        if hasattr(admin_user, key):
            setattr(admin_user, key, value)
            
    await db.flush()
    return admin_user


async def delete_admin_user(
    db: AsyncSession,
    admin_user_id: UUID
) -> None:
    """
    Delete an admin user.

    Args:
        db: Database session
        admin_user_id: ID of the admin user to delete

    Raises:
        ResourceNotFoundError: If the admin user does not exist
    """
    admin_user = await get_admin_user(db, admin_user_id)
    await db.delete(admin_user)
    await db.flush()


async def record_login(
    db: AsyncSession,
    admin_user_id: UUID,
    login_ip: str
) -> AdminUser:
    """
    Record a successful login for an admin user.
    
    Args:
        db: Database session
        admin_user_id: ID of the admin user
        login_ip: IP address of the client
        
    Returns:
        The updated admin user
    """
    admin_user = await get_admin_user(db, admin_user_id)
    admin_user.last_login_at = datetime.now()
    admin_user.last_login_ip = login_ip
    await db.flush()
    return admin_user
