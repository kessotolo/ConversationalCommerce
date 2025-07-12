from datetime import datetime
from uuid import UUID, uuid4
from typing import Any, Dict, List, Optional, Literal
from fastapi import BackgroundTasks

from app.db.session import AsyncSessionLocal
from app.models.activity_log import ActivityLog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc


class ActivityLoggingService:
    """
    Service for logging system activities and user actions
    Follows the tenant isolation pattern and supports both sync and async operations
    """

    @staticmethod
    async def log_activity(
        user_id: str,
        tenant_id: UUID,
        action: str,
        resource_type: str,
        resource_id: str,
        severity: Literal["low", "medium", "high"] = "low",
        details: Optional[Dict[str, Any]] = None,
        db: Optional[AsyncSession] = None,
    ) -> ActivityLog:
        """
        Log an activity synchronously
        """
        details = details or {}
        activity = ActivityLog(
            id=uuid4(),
            user_id=user_id,
            tenant_id=tenant_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            severity=severity,
            details=details,
            timestamp=datetime.utcnow(),
        )

        if db:
            db.add(activity)
            await db.commit()
            await db.refresh(activity)
        else:
            async with AsyncSessionLocal() as session:
                session.add(activity)
                await session.commit()
                await session.refresh(activity)

        return activity

    @staticmethod
    async def log_activity_async(
        background_tasks: BackgroundTasks,
        user_id: str,
        tenant_id: UUID,
        action: str,
        resource_type: str,
        resource_id: str,
        severity: Literal["low", "medium", "high"] = "low",
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Log an activity asynchronously using background tasks
        """
        details = details or {}
        background_tasks.add_task(
            ActivityLoggingService.log_activity,
            user_id=user_id,
            tenant_id=tenant_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            severity=severity,
            details=details,
        )

    @staticmethod
    async def get_activities(
        tenant_id: Optional[UUID] = None,
        user_id: Optional[str] = None,
        severity: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
        db: Optional[AsyncSession] = None,
    ) -> Dict[str, Any]:
        """
        Get paginated activity logs with optional filtering
        """
        if db:
            session = db
            close_session = False
        else:
            session = AsyncSessionLocal()
            close_session = True

        try:
            query = select(ActivityLog).order_by(desc(ActivityLog.timestamp))

            # Apply filters
            if tenant_id:
                query = query.filter(ActivityLog.tenant_id == tenant_id)
            if user_id:
                query = query.filter(ActivityLog.user_id == user_id)
            if severity:
                query = query.filter(ActivityLog.severity == severity.lower())

            # Count total matching items
            count_query = select(
                [func.count()]
            ).select_from(
                query.subquery()
            )
            total_count = await session.execute(count_query)
            total_count = total_count.scalar() or 0

            # Apply pagination
            offset = (page - 1) * page_size
            query = query.offset(offset).limit(page_size)

            result = await session.execute(query)
            activities = result.scalars().all()

            return {
                "items": [activity.as_dict() for activity in activities],
                "total": total_count,
                "page": page,
                "page_size": page_size,
                "has_more": (page * page_size) < total_count,
            }
        finally:
            if close_session:
                await session.close()

    @staticmethod
    async def get_system_metrics(
        tenant_id: Optional[UUID] = None,
        db: Optional[AsyncSession] = None,
    ) -> Dict[str, Any]:
        """
        Get system metrics for dashboard
        """
        if db:
            session = db
            close_session = False
        else:
            session = AsyncSessionLocal()
            close_session = True

        try:
            # Base query
            base_query = select(ActivityLog)
            if tenant_id:
                base_query = base_query.filter(ActivityLog.tenant_id == tenant_id)

            # Total activities
            total_query = select([func.count()]).select_from(base_query.subquery())
            total_result = await session.execute(total_query)
            total_activities = total_result.scalar() or 0

            # High severity count
            high_query = select([func.count()]).select_from(
                base_query.filter(ActivityLog.severity == "high").subquery()
            )
            high_result = await session.execute(high_query)
            high_severity_count = high_result.scalar() or 0

            # Active users (distinct user count in the last 24 hours)
            from sqlalchemy import func, distinct
            from datetime import timedelta

            one_day_ago = datetime.utcnow() - timedelta(days=1)
            active_users_query = select([func.count(distinct(ActivityLog.user_id))]).select_from(
                base_query.filter(ActivityLog.timestamp > one_day_ago).subquery()
            )
            active_users_result = await session.execute(active_users_query)
            active_users = active_users_result.scalar() or 0

            # Error rate (percentage of activities with status_code >= 400)
            error_query = select([func.count()]).select_from(
                base_query.filter(ActivityLog.details["status_code"].astext.cast(Integer) >= 400).subquery()
            )
            error_result = await session.execute(error_query)
            error_count = error_result.scalar() or 0

            error_rate = (error_count / total_activities) * 100 if total_activities > 0 else 0

            return {
                "active_users": active_users,
                "high_severity_count": high_severity_count,
                "total_activities": total_activities,
                "error_rate": error_rate,
            }
        finally:
            if close_session:
                await session.close()
