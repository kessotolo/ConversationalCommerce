"""
API endpoints for audit log management in the admin dashboard.
"""

import uuid
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_admin_user_with_permissions
from app.services.audit.audit_service import AuditService
from app.schemas.audit import AuditLogResponse, AuditLogFilter
from app.models.auth.admin_user import AdminUser

router = APIRouter()


@router.get("/", response_model=List[AuditLogResponse])
async def list_audit_logs(
    *,
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    user_id: Optional[uuid.UUID] = None,
    tenant_id: Optional[uuid.UUID] = None,
    resource_type: Optional[str] = None,
    action: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    search: Optional[str] = None,
    current_admin: AdminUser = Depends(get_current_admin_user_with_permissions(["audit:read"]))
):
    """
    List audit logs with filtering options.
    
    Requires 'audit:read' permission.
    """
    audit_service = AuditService()
    
    audit_logs = await audit_service.get_audit_logs(
        db=db,
        skip=skip,
        limit=limit,
        user_id=user_id,
        tenant_id=tenant_id,
        resource_type=resource_type,
        action=action,
        start_date=start_date,
        end_date=end_date,
        search=search
    )
    
    return audit_logs


@router.get("/{log_id}", response_model=AuditLogResponse)
async def get_audit_log(
    *,
    db: AsyncSession = Depends(get_db),
    log_id: uuid.UUID = Path(...),
    current_admin: AdminUser = Depends(get_current_admin_user_with_permissions(["audit:read"]))
):
    """
    Get a specific audit log entry by ID.
    
    Requires 'audit:read' permission.
    """
    audit_service = AuditService()
    
    audit_log = await audit_service.get_audit_log(db, log_id)
    if not audit_log:
        raise HTTPException(status_code=404, detail="Audit log not found")
    
    return audit_log


@router.get("/user/{user_id}", response_model=List[AuditLogResponse])
async def get_user_activity(
    *,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Path(...),
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(100, ge=1, le=1000),
    current_admin: AdminUser = Depends(get_current_admin_user_with_permissions(["audit:read"]))
):
    """
    Get recent activity for a specific user.
    
    Requires 'audit:read' permission.
    """
    audit_service = AuditService()
    
    audit_logs = await audit_service.get_user_activity(
        db=db,
        user_id=user_id,
        days=days,
        limit=limit
    )
    
    return audit_logs


@router.get("/tenant/{tenant_id}", response_model=List[AuditLogResponse])
async def get_tenant_activity(
    *,
    db: AsyncSession = Depends(get_db),
    tenant_id: uuid.UUID = Path(...),
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(100, ge=1, le=1000),
    current_admin: AdminUser = Depends(get_current_admin_user_with_permissions(["audit:read"]))
):
    """
    Get recent activity for a specific tenant.
    
    Requires 'audit:read' permission.
    """
    audit_service = AuditService()
    
    audit_logs = await audit_service.get_tenant_activity(
        db=db,
        tenant_id=tenant_id,
        days=days,
        limit=limit
    )
    
    return audit_logs


@router.get("/resource/{resource_type}/{resource_id}", response_model=List[AuditLogResponse])
async def get_resource_history(
    *,
    db: AsyncSession = Depends(get_db),
    resource_type: str = Path(...),
    resource_id: str = Path(...),
    limit: int = Query(100, ge=1, le=1000),
    current_admin: AdminUser = Depends(get_current_admin_user_with_permissions(["audit:read"]))
):
    """
    Get audit history for a specific resource.
    
    Requires 'audit:read' permission.
    """
    audit_service = AuditService()
    
    audit_logs = await audit_service.get_resource_history(
        db=db,
        resource_type=resource_type,
        resource_id=resource_id,
        limit=limit
    )
    
    return audit_logs
