"""
API endpoints for feature flag management in the admin dashboard.
"""

import uuid
from typing import Dict, List, Optional, Any

from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_db, get_current_admin_user_with_permissions
from backend.app.services.feature_flags.service import FeatureFlagService
from backend.app.schemas.feature_flags import (
    FeatureFlagCreate, 
    FeatureFlagUpdate, 
    FeatureFlagResponse,
    TenantOverrideCreate,
    TenantOverrideResponse,
    FeatureFlagWithOverridesResponse
)
from backend.app.models.auth.admin_user import AdminUser

router = APIRouter()


@router.post("/", response_model=FeatureFlagResponse)
async def create_feature_flag(
    *,
    db: AsyncSession = Depends(get_db),
    data: FeatureFlagCreate,
    current_admin: AdminUser = Depends(get_current_admin_user_with_permissions(["feature_flags:create"]))
):
    """
    Create a new feature flag.
    
    Requires 'feature_flags:create' permission.
    """
    feature_flag_service = FeatureFlagService()
    
    # Check if feature flag with this key already exists
    existing = await feature_flag_service.get_feature_flag_by_key(db, data.key)
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Feature flag with key '{data.key}' already exists"
        )
    
    feature_flag = await feature_flag_service.create_feature_flag(
        db=db,
        key=data.key,
        name=data.name,
        description=data.description,
        is_enabled=data.is_enabled,
        feature_type=data.feature_type,
        config=data.config,
        created_by=current_admin.user_id
    )
    
    return feature_flag


@router.get("/", response_model=List[FeatureFlagResponse])
async def list_feature_flags(
    *,
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    feature_type: Optional[str] = None,
    current_admin: AdminUser = Depends(get_current_admin_user_with_permissions(["feature_flags:read"]))
):
    """
    List all feature flags.
    
    Requires 'feature_flags:read' permission.
    """
    feature_flag_service = FeatureFlagService()
    feature_flags = await feature_flag_service.list_feature_flags(
        db=db,
        skip=skip,
        limit=limit,
        feature_type=feature_type
    )
    
    return feature_flags


@router.get("/{flag_id}", response_model=FeatureFlagWithOverridesResponse)
async def get_feature_flag_details(
    *,
    db: AsyncSession = Depends(get_db),
    flag_id: uuid.UUID,
    current_admin: AdminUser = Depends(get_current_admin_user_with_permissions(["feature_flags:read"]))
):
    """
    Get detailed information about a feature flag, including tenant overrides.
    
    Requires 'feature_flags:read' permission.
    """
    feature_flag_service = FeatureFlagService()
    feature_flag = await feature_flag_service.get_feature_flag(db, flag_id)
    
    if not feature_flag:
        raise HTTPException(status_code=404, detail="Feature flag not found")
    
    return feature_flag


@router.put("/{flag_id}", response_model=FeatureFlagResponse)
async def update_feature_flag(
    *,
    db: AsyncSession = Depends(get_db),
    flag_id: uuid.UUID,
    data: FeatureFlagUpdate,
    current_admin: AdminUser = Depends(get_current_admin_user_with_permissions(["feature_flags:update"]))
):
    """
    Update a feature flag.
    
    Requires 'feature_flags:update' permission.
    """
    feature_flag_service = FeatureFlagService()
    updated_flag = await feature_flag_service.update_feature_flag(
        db=db,
        flag_id=flag_id,
        name=data.name,
        description=data.description,
        is_enabled=data.is_enabled,
        feature_type=data.feature_type,
        config=data.config,
        updated_by=current_admin.user_id
    )
    
    if not updated_flag:
        raise HTTPException(status_code=404, detail="Feature flag not found")
    
    return updated_flag


@router.delete("/{flag_id}", status_code=204)
async def delete_feature_flag(
    *,
    db: AsyncSession = Depends(get_db),
    flag_id: uuid.UUID,
    current_admin: AdminUser = Depends(get_current_admin_user_with_permissions(["feature_flags:delete"]))
):
    """
    Delete a feature flag.
    
    Requires 'feature_flags:delete' permission.
    """
    feature_flag_service = FeatureFlagService()
    deleted = await feature_flag_service.delete_feature_flag(db, flag_id)
    
    if not deleted:
        raise HTTPException(status_code=404, detail="Feature flag not found")
    
    return


# Tenant override endpoints

@router.post("/{flag_id}/tenant/{tenant_id}", response_model=TenantOverrideResponse)
async def create_tenant_override(
    *,
    db: AsyncSession = Depends(get_db),
    flag_id: uuid.UUID,
    tenant_id: uuid.UUID,
    data: TenantOverrideCreate,
    current_admin: AdminUser = Depends(get_current_admin_user_with_permissions(["feature_flags:tenant_override"]))
):
    """
    Create or update a tenant-specific override for a feature flag.
    
    Requires 'feature_flags:tenant_override' permission.
    """
    feature_flag_service = FeatureFlagService()
    
    # Check if feature flag exists
    feature_flag = await feature_flag_service.get_feature_flag(db, flag_id)
    if not feature_flag:
        raise HTTPException(status_code=404, detail="Feature flag not found")
    
    override = await feature_flag_service.set_tenant_override(
        db=db,
        flag_id=flag_id,
        tenant_id=tenant_id,
        is_enabled=data.is_enabled,
        config_override=data.config_override,
        updated_by=current_admin.user_id
    )
    
    return override


@router.delete("/{flag_id}/tenant/{tenant_id}", status_code=204)
async def remove_tenant_override(
    *,
    db: AsyncSession = Depends(get_db),
    flag_id: uuid.UUID,
    tenant_id: uuid.UUID,
    current_admin: AdminUser = Depends(get_current_admin_user_with_permissions(["feature_flags:tenant_override"]))
):
    """
    Remove a tenant-specific override for a feature flag.
    
    Requires 'feature_flags:tenant_override' permission.
    """
    feature_flag_service = FeatureFlagService()
    
    removed = await feature_flag_service.remove_tenant_override(
        db=db,
        flag_id=flag_id,
        tenant_id=tenant_id
    )
    
    if not removed:
        raise HTTPException(status_code=404, detail="Tenant override not found")
    
    return


@router.get("/tenant/{tenant_id}", response_model=List[FeatureFlagResponse])
async def get_tenant_feature_flags(
    *,
    db: AsyncSession = Depends(get_db),
    tenant_id: uuid.UUID,
    current_admin: AdminUser = Depends(get_current_admin_user_with_permissions(["feature_flags:read"]))
):
    """
    Get all feature flags with tenant-specific settings applied.
    
    Requires 'feature_flags:read' permission.
    """
    feature_flag_service = FeatureFlagService()
    
    # Get all global feature flags
    all_flags = await feature_flag_service.list_feature_flags(db)
    
    # Get all tenant overrides
    tenant_overrides = await feature_flag_service.get_tenant_overrides(db, tenant_id)
    
    # Convert overrides to a dict for quick lookup
    override_map = {
        str(override.feature_flag_id): override
        for override in tenant_overrides
    }
    
    # Apply tenant overrides to the response
    for flag in all_flags:
        flag_id_str = str(flag.id)
        if flag_id_str in override_map:
            override = override_map[flag_id_str]
            flag.is_enabled = override.is_enabled
            flag.config = {**flag.config, **(override.config_override or {})}
    
    return all_flags
