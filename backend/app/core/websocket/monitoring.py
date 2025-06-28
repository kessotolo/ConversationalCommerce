import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List
from uuid import UUID

from fastapi import Depends, WebSocket, WebSocketDisconnect

from app.core.config.settings import get_settings
from app.core.security.clerk import ClerkTokenData
from app.core.security.dependencies import require_auth
from app.db.async_session import get_async_session_local
from app.models.audit_log import AuditLog

settings = get_settings()
logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections and message broadcasting"""

    def __init__(self):
        # Store active connections by tenant_id
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # Store user-specific connections
        self.user_connections: Dict[str, WebSocket] = {}
        # Store connection metadata
        self.connection_metadata: Dict[str, Dict[str, Any]] = {}

    async def connect(self, websocket: WebSocket, tenant_id: str, user_id: str):
        """Connect a new WebSocket client"""
        await websocket.accept()

        # Store connection
        if tenant_id not in self.active_connections:
            self.active_connections[tenant_id] = []
        self.active_connections[tenant_id].append(websocket)

        # Store user connection
        self.user_connections[user_id] = websocket

        # Store metadata
        self.connection_metadata[str(websocket)] = {
            "tenant_id": tenant_id,
            "user_id": user_id,
            "connected_at": datetime.now(timezone.utc),
        }

        logger.info(f"New WebSocket connection for tenant {tenant_id}, user {user_id}")

    def disconnect(self, websocket: WebSocket):
        """Remove a disconnected WebSocket client"""
        metadata = self.connection_metadata.get(str(websocket), {})
        tenant_id = metadata.get("tenant_id")
        user_id = metadata.get("user_id")

        if tenant_id and tenant_id in self.active_connections:
            self.active_connections[tenant_id].remove(websocket)
            if not self.active_connections[tenant_id]:
                del self.active_connections[tenant_id]

        if user_id in self.user_connections:
            del self.user_connections[user_id]

        if str(websocket) in self.connection_metadata:
            del self.connection_metadata[str(websocket)]

        logger.info(f"WebSocket disconnected for tenant {tenant_id}, user {user_id}")

    async def broadcast_to_tenant(self, tenant_id: str, message: dict):
        """Broadcast a message to all connections in a tenant"""
        if tenant_id in self.active_connections:
            for connection in self.active_connections[tenant_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error broadcasting to tenant {tenant_id}: {str(e)}")
                    await self.disconnect(connection)

    async def send_to_user(self, user_id: str, message: dict):
        """Send a message to a specific user"""
        if user_id in self.user_connections:
            try:
                await self.user_connections[user_id].send_json(message)
            except Exception as e:
                logger.error(f"Error sending to user {user_id}: {str(e)}")
                await self.disconnect(self.user_connections[user_id])


class ActivityMonitor:
    """Handles real-time activity monitoring and alerting"""

    def __init__(self, connection_manager: ConnectionManager):
        self.connection_manager = connection_manager
        self.alert_thresholds = {
            "high": 5,  # Number of high-severity events before alert
            "medium": 10,  # Number of medium-severity events before alert
            "low": 20,  # Number of low-severity events before alert
        }
        self.activity_windows = {
            "high": 300,  # 5 minutes
            "medium": 900,  # 15 minutes
            "low": 3600,  # 1 hour
        }

    async def process_activity(self, activity: dict):
        """Process a new activity and determine if alerts are needed"""
        try:
            # Store activity in database
            db = get_async_session_local()
            try:
                audit_log = AuditLog(
                    user_id=activity["user_id"],
                    tenant_id=activity["tenant_id"],
                    action=activity["action"],
                    resource_type=activity["resource_type"],
                    resource_id=activity["resource_id"],
                    ip_address=activity.get("ip_address"),
                    user_agent=activity.get("user_agent"),
                    details=activity.get("details", {}),
                    timestamp=datetime.now(timezone.utc),
                )
                db.add(audit_log)
                await db.commit()
            finally:
                await db.close()

            # Broadcast to tenant
            await self.connection_manager.broadcast_to_tenant(
                str(activity["tenant_id"]), {"type": "activity", "data": activity}
            )

            # Check for alerts
            await self._check_alerts(activity)

        except Exception as e:
            logger.error(f"Error processing activity: {str(e)}")

    async def _check_alerts(self, activity: dict):
        """Check if activity triggers any alerts"""
        try:
            tenant_id = str(activity["tenant_id"])
            user_id = str(activity["user_id"])
            action = activity["action"]
            resource_type = activity["resource_type"]

            # Get current time for windowed checks
            current_time = datetime.now(timezone.utc)

            # 1. Check for suspicious patterns
            if self._is_suspicious_activity(activity):
                await self._send_alert(
                    tenant_id,
                    "suspicious_activity",
                    f"Suspicious activity detected: {action} on {resource_type}",
                    activity,
                    "high",
                )

            # 2. Check for API rate limits (per user)
            sessionmaker = get_async_session_local()
            async with sessionmaker() as db:
                for severity, window in self.activity_windows.items():
                    window_start = current_time - timedelta(seconds=window)

                    # Get count of activities in time window
                    recent_count = await db.execute(
                        f"SELECT COUNT(*) FROM audit_log WHERE tenant_id = '{UUID(tenant_id)}' AND user_id = '{UUID(user_id)}' AND timestamp >= '{window_start}'"
                    )

                    # Check if count exceeds threshold
                    if recent_count.scalar() >= self.alert_thresholds.get(
                        severity, 100
                    ):
                        await self._send_alert(
                            tenant_id,
                            f"rate_limit_{severity}",
                            f"User has triggered {recent_count.scalar()} activities in the past {window/60} minutes",
                            {
                                "user_id": user_id,
                                "count": recent_count.scalar(),
                                "window": window,
                                "activity_type": action,
                            },
                            severity,
                        )

            # 3. Check for error rates
            if activity.get("details", {}).get("status_code", 200) >= 500:
                await self._send_alert(
                    tenant_id,
                    "server_error",
                    f"Server error detected: {activity.get('details', {}).get('status_code')}",
                    activity,
                    "high",
                )

            # 4. Check for failed authentication/authorization
            if activity.get("details", {}).get("status_code") in [401, 403]:
                await self._send_alert(
                    tenant_id,
                    "auth_failure",
                    "Authentication/Authorization failure",
                    activity,
                    "medium",
                )

        except Exception as e:
            logger.error(f"Error checking alerts: {str(e)}")

    def _is_suspicious_activity(self, activity: dict) -> bool:
        """Determine if an activity is suspicious based on patterns"""
        # Examples of suspicious activities:
        # 1. Multiple DELETE operations in short time
        # 2. Operations on sensitive resources
        # 3. Operations from unusual IP addresses
        # 4. Rapid sequence of failed operations

        details = activity.get("details", {})

        # Check for DELETE on sensitive resources
        if activity["action"] == "DELETE" and activity["resource_type"] in [
            "users",
            "seller_profiles",
            "products",
            "orders",
        ]:
            return True

        # Check for failed operations
        status_code = details.get("status_code", 200)
        if status_code >= 400:
            return True

        # More rules can be added here
        return False

    async def _send_alert(
        self,
        tenant_id: str,
        alert_type: str,
        message: str,
        details: dict,
        severity: str,
    ):
        """Send an alert to connected clients"""
        alert = {
            "type": "alert",
            "alert_type": alert_type,
            "message": message,
            "details": details,
            "severity": severity,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        # Send to all connected clients for this tenant
        await self.connection_manager.broadcast_to_tenant(tenant_id, alert)

        # Log the alert
        logger.warning(f"Alert sent: {message} (Severity: {severity})")

        # Store in database for future reference
        try:
            sessionmaker = get_async_session_local()
            async with sessionmaker() as db:
                # If you have an alerts table, you could store it here
                # alert_record = Alert(**alert)
                # db.add(alert_record)
                # await db.commit()
                pass
        except Exception as e:
            logger.error(f"Error storing alert: {str(e)}")


# Create global instances
connection_manager = ConnectionManager()
activity_monitor = ActivityMonitor(connection_manager)


async def get_websocket_endpoint(
    websocket: WebSocket,
    tenant_id: str,
    current_user: ClerkTokenData = Depends(require_auth),
):
    """WebSocket endpoint for real-time monitoring"""
    try:
        await connection_manager.connect(
            websocket, tenant_id, str(current_user.user_id)
        )

        # Send initial connection success message
        await websocket.send_json(
            {
                "type": "connection_status",
                "status": "connected",
                "user_id": str(current_user.user_id),
                "tenant_id": tenant_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        )

        # Keep connection alive and handle incoming messages
        while True:
            try:
                data = await websocket.receive_text()
                # Handle any incoming messages if needed
                # For now, we're just monitoring outgoing activities
            except WebSocketDisconnect:
                connection_manager.disconnect(websocket)
                break
            except Exception as e:
                logger.error(f"WebSocket error: {str(e)}")
                break

    except Exception as e:
        logger.error(f"Error in WebSocket connection: {str(e)}")
        if websocket in connection_manager.active_connections.get(tenant_id, []):
            connection_manager.disconnect(websocket)


# Example async DB access in websocket monitoring


async def update_monitoring_async(*args, db=None):
    """
    Async function for updating monitoring data in the websocket monitoring system.
    This should be implemented to update or restore monitoring state as needed.
    Args:
        *args: Additional arguments for monitoring update.
        db: Optional database session or sessionmaker.
    Raises:
        NotImplementedError: This function is a placeholder and must be implemented.
    """
    raise NotImplementedError("update_monitoring_async must be implemented.")
