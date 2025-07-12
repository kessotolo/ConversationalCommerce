from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, BackgroundTasks, HTTPException
from starlette.status import HTTP_404_NOT_FOUND

from app.api import deps
from app.services.activity_logging_service import ActivityLoggingService
from app.models.user import User

router = APIRouter()


@router.get("/admin/activities")
async def get_activities(
    tenant_id: Optional[UUID] = Query(None),
    severity: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Dict[str, Any]:
    """
    Get paginated activity logs with optional filtering.
    Only available to superusers.
    """
    # Access control: Only superusers can view all tenant data
    # For regular admin users, restrict to their own tenant
    if not current_user.is_superuser and tenant_id != current_user.tenant_id:
        tenant_id = current_user.tenant_id

    activities = await ActivityLoggingService.get_activities(
        tenant_id=tenant_id,
        severity=severity,
        page=page,
        page_size=page_size
    )
    
    return activities


@router.get("/admin/metrics")
async def get_system_metrics(
    tenant_id: Optional[UUID] = Query(None),
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Dict[str, Any]:
    """
    Get system metrics for admin dashboard.
    Only available to superusers.
    """
    # Access control: Only superusers can view all tenant data
    # For regular admin users, restrict to their own tenant
    if not current_user.is_superuser and tenant_id != current_user.tenant_id:
        tenant_id = current_user.tenant_id

    metrics = await ActivityLoggingService.get_system_metrics(
        tenant_id=tenant_id
    )
    
    return metrics


@router.post("/admin/activities/log")
async def log_activity(
    background_tasks: BackgroundTasks,
    tenant_id: UUID,
    action: str,
    resource_type: str,
    resource_id: str,
    severity: str = "low",
    details: Optional[Dict[str, Any]] = None,
    current_user: User = Depends(deps.get_current_active_user),
) -> Dict[str, str]:
    """
    Log an activity (async).
    Regular users can only log to their own tenant.
    """
    # Access control: Regular users can only log to their own tenant
    if not current_user.is_superuser and tenant_id != current_user.tenant_id:
        raise HTTPException(
            status_code=HTTP_404_NOT_FOUND,
            detail="Not enough permissions to log activity for this tenant",
        )

    # Validate severity
    if severity not in ["low", "medium", "high"]:
        severity = "low"
        
    # Log activity asynchronously
    await ActivityLoggingService.log_activity_async(
        background_tasks=background_tasks,
        user_id=str(current_user.id),
        tenant_id=tenant_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        severity=severity,
        details=details,
    )
    
    return {"status": "success", "message": "Activity logged successfully"}
