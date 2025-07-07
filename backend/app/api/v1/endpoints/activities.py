import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.audit.audit_log import AuditLog

router = APIRouter()
logger = logging.getLogger(__name__)


class ActivityDetails(BaseModel):
    path: Optional[str] = None
    method: Optional[str] = None
    status_code: Optional[int] = None
    duration: Optional[float] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


class ActivityResponse(BaseModel):
    id: str
    user_id: str
    tenant_id: str
    action: str
    resource_type: str
    resource_id: str
    details: ActivityDetails
    severity: str
    timestamp: str
    user_name: Optional[str] = None


class PaginatedActivitiesResponse(BaseModel):
    items: List[ActivityResponse]
    total: int
    limit: int
    offset: int


@router.get("/activities", response_model=PaginatedActivitiesResponse)
async def get_activities(
    request: Request,
    time_range: str = Query(
        "24h", description="Time range to filter activities (1h, 24h, 7d, 30d)"
    ),
    filter_type: str = Query(
        "all", description="Filter type (all, high, alerts, errors)"
    ),
    limit: int = Query(50, description="Number of items to return"),
    offset: int = Query(0, description="Offset for pagination"),
    db: Session = Depends(get_db),
):
    """
    Get activities with filtering options.

    This endpoint is intended for admin/monitoring use and is not exposed in the regular UI.
    """
    try:
        # Get tenant ID from request state
        tenant_id = getattr(request.state, "tenant_id", None)
        if not tenant_id:
            return {"items": [], "total": 0, "limit": limit, "offset": offset}

        # Calculate time filter
        now = datetime.now(timezone.utc)
        time_filters = {
            "1h": now - timedelta(hours=1),
            "24h": now - timedelta(hours=24),
            "7d": now - timedelta(days=7),
            "30d": now - timedelta(days=30),
        }
        time_filter = time_filters.get(time_range, time_filters["24h"])

        # Build query
        query = db.query(AuditLog).filter(
            AuditLog.tenant_id == UUID(
                tenant_id), AuditLog.timestamp >= time_filter
        )

        # Apply filter type
        if filter_type == "high":
            # Filter for high severity events (determined by patterns)
            query = query.filter(
                # This is a simplified example - in practice, you'd have a severity field
                # or more complex logic to determine high severity events
                AuditLog.action.in_(["DELETE", "PATCH", "PUT"])
            )
        elif filter_type == "alerts":
            # Filter for events that would trigger alerts
            query = query.filter(
                AuditLog.details.has_key("status_code")
                & (AuditLog.details["status_code"].astext.cast(int) >= 400)
            )
        elif filter_type == "errors":
            # Filter for error events
            query = query.filter(
                AuditLog.details.has_key("status_code")
                & (AuditLog.details["status_code"].astext.cast(int) >= 500)
            )

        # Get total count for pagination
        total = query.count()

        # Apply pagination
        activities = (
            query.order_by(AuditLog.timestamp.desc()).offset(
                offset).limit(limit).all()
        )

        # Convert to response format
        response_items = []
        for activity in activities:
            # Determine severity based on patterns
            severity = "low"
            if activity.action in ["DELETE", "PATCH", "PUT"]:
                severity = "medium"

            details = activity.details or {}
            if details.get("status_code", 0) >= 500:
                severity = "high"
            elif details.get("status_code", 0) >= 400:
                severity = "medium"

            response_items.append(
                ActivityResponse(
                    id=str(activity.id),
                    user_id=str(activity.user_id),
                    tenant_id=str(activity.tenant_id),
                    action=activity.action,
                    resource_type=activity.resource_type,
                    resource_id=activity.resource_id or "none",
                    details=(
                        ActivityDetails(**activity.details)
                        if activity.details
                        else ActivityDetails()
                    ),
                    severity=severity,
                    timestamp=activity.timestamp.isoformat(),
                    user_name=None,  # Would need to join with users table to get this
                )
            )

        return {
            "items": response_items,
            "total": total,
            "limit": limit,
            "offset": offset,
        }

    except Exception as e:
        logger.error(f"Error fetching activities: {str(e)}")
        return {"items": [], "total": 0, "limit": limit, "offset": offset}
