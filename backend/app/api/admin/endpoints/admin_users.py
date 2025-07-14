"""
API endpoints for admin user management across tenants.
"""

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Path, Body
from sqlalchemy.ext.asyncio import AsyncSession

from app.app.api.deps import get_db, get_current_admin_user_with_permissions
from app.app.schemas.admin_user import (
    AdminUserCreate,
    AdminUserUpdate,
    AdminUserResponse,
    AdminUserWithRolesResponse
)
from app.app.services.admin.users_service import AdminUserService
from app.app.models.auth.admin_user import AdminUser

router = APIRouter()


@router.get("/", response_model=List[AdminUserResponse])
async def list_admin_users(
    *,
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    tenant_id: Optional[uuid.UUID] = None,
    search: Optional[str] = None,
    current_admin: AdminUser = Depends(get_current_admin_user_with_permissions(["admin_users:read"]))
):
    """
    List all admin users with optional filtering by tenant.
    
    Requires 'admin_users:read' permission.
    """
    admin_user_service = AdminUserService()
    users = await admin_user_service.list_admin_users(
        db=db,
        skip=skip,
        limit=limit,
        tenant_id=tenant_id,
        search=search
    )
    
    return users


@router.get("/{user_id}", response_model=AdminUserWithRolesResponse)
async def get_admin_user(
    *,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Path(...),
    current_admin: AdminUser = Depends(get_current_admin_user_with_permissions(["admin_users:read"]))
):
    """
    Get detailed information about an admin user, including roles.
    
    Requires 'admin_users:read' permission.
    """
    admin_user_service = AdminUserService()
    user = await admin_user_service.get_admin_user(db, user_id)
    
    if not user:
        raise HTTPException(status_code=404, detail="Admin user not found")
    
    return user


@router.post("/", response_model=AdminUserResponse)
async def create_admin_user(
    *,
    db: AsyncSession = Depends(get_db),
    data: AdminUserCreate,
    current_admin: AdminUser = Depends(get_current_admin_user_with_permissions(["admin_users:create"]))
):
    """
    Create a new admin user.
    
    Requires 'admin_users:create' permission.
    """
    admin_user_service = AdminUserService()
    
    # Check if user with email already exists
    existing = await admin_user_service.get_admin_user_by_email(db, data.email)
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Admin user with email '{data.email}' already exists"
        )
    
    # Create user with roles
    new_user = await admin_user_service.create_admin_user(
        db=db,
        email=data.email,
        password=data.password,
        first_name=data.first_name,
        last_name=data.last_name,
        is_active=data.is_active,
        tenant_id=data.tenant_id,
        role_ids=data.role_ids,
        created_by=current_admin.user_id
    )
    
    # Log audit event
    await admin_user_service.log_audit_event(
        db=db,
        user_id=current_admin.user_id,
        action="create_admin_user",
        resource_type="admin_user",
        resource_id=str(new_user.id),
        tenant_id=data.tenant_id,
        details={
            "email": data.email,
            "roles": data.role_ids,
            "tenant_id": str(data.tenant_id) if data.tenant_id else None
        }
    )
    
    return new_user


@router.put("/{user_id}", response_model=AdminUserResponse)
async def update_admin_user(
    *,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Path(...),
    data: AdminUserUpdate,
    current_admin: AdminUser = Depends(get_current_admin_user_with_permissions(["admin_users:update"]))
):
    """
    Update an admin user.
    
    Requires 'admin_users:update' permission.
    """
    admin_user_service = AdminUserService()
    
    # Get existing user
    user = await admin_user_service.get_admin_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Admin user not found")
    
    # Super admins can only be updated by other super admins
    if user.is_superadmin and not current_admin.is_superadmin:
        raise HTTPException(
            status_code=403, 
            detail="Only super admins can modify other super admin accounts"
        )
    
    # Update user
    updated_user = await admin_user_service.update_admin_user(
        db=db,
        user_id=user_id,
        first_name=data.first_name,
        last_name=data.last_name,
        is_active=data.is_active,
        password=data.password,
        role_ids=data.role_ids,
        updated_by=current_admin.user_id
    )
    
    # Log audit event
    await admin_user_service.log_audit_event(
        db=db,
        user_id=current_admin.user_id,
        action="update_admin_user",
        resource_type="admin_user",
        resource_id=str(user_id),
        tenant_id=user.tenant_id,
        details={
            "updated_fields": [k for k, v in data.dict(exclude_unset=True).items()],
            "roles_updated": data.role_ids is not None
        }
    )
    
    return updated_user


@router.delete("/{user_id}", status_code=204)
async def delete_admin_user(
    *,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Path(...),
    current_admin: AdminUser = Depends(get_current_admin_user_with_permissions(["admin_users:delete"]))
):
    """
    Delete an admin user.
    
    Requires 'admin_users:delete' permission.
    Super admins cannot be deleted through this API.
    """
    admin_user_service = AdminUserService()
    
    # Get existing user to check if superadmin
    user = await admin_user_service.get_admin_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Admin user not found")
    
    # Prevent deletion of super admins
    if user.is_superadmin:
        raise HTTPException(
            status_code=403,
            detail="Super admin accounts cannot be deleted"
        )
    
    # Prevent self-deletion
    if str(user_id) == str(current_admin.user_id):
        raise HTTPException(
            status_code=400,
            detail="Cannot delete your own account"
        )
    
    # Delete user
    deleted = await admin_user_service.delete_admin_user(db, user_id)
    
    if not deleted:
        raise HTTPException(status_code=404, detail="Admin user not found")
    
    # Log audit event
    await admin_user_service.log_audit_event(
        db=db,
        user_id=current_admin.user_id,
        action="delete_admin_user",
        resource_type="admin_user",
        resource_id=str(user_id),
        tenant_id=user.tenant_id,
        details={
            "email": user.email
        }
    )
    
    return
