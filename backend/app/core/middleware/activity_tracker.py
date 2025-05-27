from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.websocket.monitoring import activity_monitor
from datetime import datetime, timezone
import json
import logging

logger = logging.getLogger(__name__)


class ActivityTrackerMiddleware(BaseHTTPMiddleware):
    """Middleware for tracking and broadcasting activities"""

    async def dispatch(self, request: Request, call_next):
        # Skip tracking for certain paths
        if self._should_skip_tracking(request.url.path):
            return await call_next(request)

        # Get tenant and user info from request state
        tenant_id = getattr(request.state, 'tenant_id', None)
        user_id = getattr(request.state, 'user_id', None)

        if not tenant_id or not user_id:
            return await call_next(request)

        # Track the request
        start_time = datetime.now(timezone.utc)

        # Process the request
        response = await call_next(request)

        # Calculate duration
        duration = (datetime.now(timezone.utc) - start_time).total_seconds()

        # Create activity record
        activity = {
            "user_id": user_id,
            "tenant_id": tenant_id,
            "action": request.method,
            "resource_type": self._get_resource_type(request.url.path),
            "resource_id": self._get_resource_id(request.url.path),
            "details": {
                "path": str(request.url.path),
                "method": request.method,
                "status_code": response.status_code,
                "duration": duration,
                "ip_address": request.client.host if request.client else None,
                "user_agent": request.headers.get("user-agent")
            },
            "timestamp": start_time.isoformat()
        }

        # Process the activity asynchronously
        try:
            await activity_monitor.process_activity(activity)
        except Exception as e:
            logger.error(f"Error processing activity: {str(e)}")

        return response

    def _should_skip_tracking(self, path: str) -> bool:
        """Determine if the path should be skipped for tracking"""
        skip_paths = [
            "/health",
            "/docs",
            "/redoc",
            "/openapi.json",
            "/ws/monitoring"  # Skip WebSocket endpoint itself
        ]
        return any(path.startswith(skip_path) for skip_path in skip_paths)

    def _get_resource_type(self, path: str) -> str:
        """Extract resource type from path"""
        # Example: /api/v1/products -> products
        parts = path.strip("/").split("/")
        if len(parts) >= 3:
            return parts[-1]
        return "unknown"

    def _get_resource_id(self, path: str) -> str:
        """Extract resource ID from path if present"""
        # Example: /api/v1/products/123 -> 123
        parts = path.strip("/").split("/")
        if len(parts) >= 4:
            return parts[-1]
        return "none"
