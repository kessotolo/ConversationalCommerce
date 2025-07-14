from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta, timezone

from app.app.api.deps import get_db
from app.app.core.config.settings import get_settings
from app.app.db.models.webhook_event import WebhookEvent

router = APIRouter()
settings = get_settings()


@router.get("/health")
async def health_check():
    """Basic health check endpoint"""
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


@router.get("/health/webhook")
async def webhook_health(db: AsyncSession = Depends(get_db)):
    """
    Check webhook system health

    Verifies:
    1. Database connection is working
    2. Can query webhook_events table
    3. Recent webhook events have been processed
    """
    try:
        # Check database connection
        result = await db.execute(text("SELECT 1"))
        db_available = result.scalar() == 1

        # Check if webhook_events table is accessible
        webhook_table_available = False
        recent_events = {}

        if db_available:
            try:
                # Check for recent webhook events (last 24 hours)
                yesterday = datetime.utcnow() - timedelta(hours=24)

                # Count events by provider and success/error
                query = text("""
                    SELECT provider,
                           COUNT(*) as total_events,
                           MAX(processed_at) as latest_event
                    FROM webhook_events
                    WHERE processed_at > :yesterday
                    GROUP BY provider
                """)

                result = await db.execute(query, {"yesterday": yesterday})
                webhook_table_available = True

                # Format the results
                for row in result:
                    provider, count, latest = row
                    recent_events[provider] = {
                        "count": count,
                        "latest_event": latest.isoformat() if latest else None
                    }

            except Exception as e:
                webhook_table_available = False

        # Determine overall health status
        is_healthy = db_available and webhook_table_available

        # Create response with appropriate status code
        response_data = {
            "status": "healthy" if is_healthy else "unhealthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "components": {
                "database": "available" if db_available else "unavailable",
                "webhook_table": "available" if webhook_table_available else "unavailable",
                "recent_events": recent_events if recent_events else None
            }
        }

        status_code = status.HTTP_200_OK if is_healthy else status.HTTP_503_SERVICE_UNAVAILABLE
        return Response(
            content=response_data,
            status_code=status_code,
            media_type="application/json"
        )

    except Exception as e:
        return Response(
            content={"status": "unhealthy", "error": str(e)},
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            media_type="application/json"
        )
