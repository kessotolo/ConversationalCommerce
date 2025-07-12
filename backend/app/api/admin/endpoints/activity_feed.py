"""
Activity Feed API endpoints for the unified super admin dashboard.
Real-time activity feed with WebSocket support, notifications, and event streaming.
"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Set
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, func, desc, and_

from backend.app.core.security.dependencies import get_current_super_admin
from backend.app.models.admin.admin_user import AdminUser
from backend.app.db.async_session import get_async_db
from backend.app.schemas.admin.dashboard import (
    ActivityFeedItem,
    RecentActivity
)

router = APIRouter(prefix="/activity", tags=["activity-feed"])

# WebSocket connection manager


class ActivityFeedManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        # user_id -> set of event_types
        self.user_subscriptions: Dict[str, Set[str]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        self.user_subscriptions[user_id] = set()

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
        if user_id in self.user_subscriptions:
            del self.user_subscriptions[user_id]

    async def send_personal_message(self, message: str, user_id: str):
        if user_id in self.active_connections:
            websocket = self.active_connections[user_id]
            try:
                await websocket.send_text(message)
            except:
                # Connection closed, remove it
                self.disconnect(user_id)

    async def broadcast_activity(self, activity: ActivityFeedItem):
        if not self.active_connections:
            return

        message = json.dumps({
            "type": "activity",
            "data": {
                "id": activity.id,
                "event_type": activity.event_type,
                "title": activity.title,
                "description": activity.description,
                "timestamp": activity.timestamp.isoformat(),
                "severity": activity.severity,
                "actor_id": activity.actor_id,
                "target_id": activity.target_id,
                "target_type": activity.target_type,
                "metadata": activity.metadata
            }
        })

        # Send to all connected users
        disconnected_users = []
        for user_id, websocket in self.active_connections.items():
            try:
                await websocket.send_text(message)
            except:
                disconnected_users.append(user_id)

        # Clean up disconnected users
        for user_id in disconnected_users:
            self.disconnect(user_id)

    async def send_notification(self, notification: Dict[str, Any], user_id: Optional[str] = None):
        message = json.dumps({
            "type": "notification",
            "data": notification
        })

        if user_id:
            # Send to specific user
            await self.send_personal_message(message, user_id)
        else:
            # Broadcast to all users
            disconnected_users = []
            for uid, websocket in self.active_connections.items():
                try:
                    await websocket.send_text(message)
                except:
                    disconnected_users.append(uid)

            # Clean up disconnected users
            for uid in disconnected_users:
                self.disconnect(uid)


# Global manager instance
activity_manager = ActivityFeedManager()

# WebSocket endpoint


@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    """
    WebSocket endpoint for real-time activity feed.
    """
    await activity_manager.connect(websocket, user_id)

    try:
        while True:
            # Receive messages from client (for subscriptions, etc.)
            data = await websocket.receive_text()
            message = json.loads(data)

            if message["type"] == "subscribe":
                # Subscribe to specific event types
                event_types = message.get("event_types", [])
                activity_manager.user_subscriptions[user_id].update(
                    event_types)

                # Send confirmation
                await websocket.send_text(json.dumps({
                    "type": "subscription_confirmed",
                    "data": {"event_types": list(activity_manager.user_subscriptions[user_id])}
                }))

            elif message["type"] == "unsubscribe":
                # Unsubscribe from specific event types
                event_types = message.get("event_types", [])
                activity_manager.user_subscriptions[user_id].difference_update(
                    event_types)

                # Send confirmation
                await websocket.send_text(json.dumps({
                    "type": "unsubscription_confirmed",
                    "data": {"event_types": list(activity_manager.user_subscriptions[user_id])}
                }))

            elif message["type"] == "ping":
                # Health check
                await websocket.send_text(json.dumps({
                    "type": "pong",
                    "data": {"timestamp": datetime.utcnow().isoformat()}
                }))

    except WebSocketDisconnect:
        activity_manager.disconnect(user_id)
    except Exception as e:
        print(f"WebSocket error for user {user_id}: {e}")
        activity_manager.disconnect(user_id)

# Activity Feed REST Endpoints


@router.get("/feed", response_model=List[ActivityFeedItem])
async def get_activity_feed(
    current_admin: AdminUser = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_async_db),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    event_types: Optional[List[str]] = Query(
        None, description="Filter by event types"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    start_date: Optional[datetime] = Query(
        None, description="Start date filter"),
    end_date: Optional[datetime] = Query(None, description="End date filter"),
    actor_id: Optional[str] = Query(None, description="Filter by actor ID"),
    target_type: Optional[str] = Query(
        None, description="Filter by target type")
):
    """
    Get activity feed with filtering and pagination.
    """
    # Build query conditions
    conditions = []
    params = {"limit": limit, "offset": offset}

    if event_types:
        conditions.append("event_type = ANY(:event_types)")
        params["event_types"] = event_types

    if actor_id:
        conditions.append("actor_id = :actor_id")
        params["actor_id"] = actor_id

    if target_type:
        conditions.append("target_type = :target_type")
        params["target_type"] = target_type

    if start_date:
        conditions.append("created_at >= :start_date")
        params["start_date"] = start_date

    if end_date:
        conditions.append("created_at <= :end_date")
        params["end_date"] = end_date

    where_clause = " AND ".join(conditions) if conditions else "1=1"

    query = text(f"""
        SELECT
            id,
            event_type,
            actor_id,
            target_id,
            target_type,
            details,
            created_at,
            ip_address
        FROM audit_logs
        WHERE {where_clause}
        ORDER BY created_at DESC
        LIMIT :limit OFFSET :offset
    """)

    result = await db.execute(query, params)

    activities = []
    for row in result:
        activity = ActivityFeedItem(
            id=str(row.id),
            event_type=row.event_type,
            actor_id=str(row.actor_id) if row.actor_id else None,
            target_id=str(row.target_id) if row.target_id else None,
            target_type=row.target_type,
            title=_generate_activity_title(row.event_type, row.details),
            description=_generate_activity_description(
                row.event_type, row.details),
            timestamp=row.created_at,
            ip_address=row.ip_address,
            severity=_determine_severity(row.event_type),
            metadata=row.details or {}
        )

        # Apply severity filter
        if severity and activity.severity != severity:
            continue

        activities.append(activity)

    return activities


@router.get("/recent", response_model=RecentActivity)
async def get_recent_activity(
    current_admin: AdminUser = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_async_db),
    hours: int = Query(default=24, ge=1, le=168,
                       description="Hours to look back")
):
    """
    Get recent activity summary.
    """
    start_time = datetime.utcnow() - timedelta(hours=hours)

    # Get activity counts by severity
    summary_query = text("""
        SELECT
            event_type,
            COUNT(*) as count,
            MAX(created_at) as latest_event
        FROM audit_logs
        WHERE created_at >= :start_time
        GROUP BY event_type
        ORDER BY count DESC
    """)

    result = await db.execute(summary_query, {"start_time": start_time})

    total_events = 0
    critical_events = 0
    warning_events = 0
    info_events = 0

    for row in result:
        total_events += row.count
        severity = _determine_severity(row.event_type)

        if severity == "critical":
            critical_events += row.count
        elif severity == "warning":
            warning_events += row.count
        else:
            info_events += row.count

    # Get recent activities
    recent_activities = await get_activity_feed(
        current_admin=current_admin,
        db=db,
        limit=10,
        offset=0,
        start_date=start_time
    )

    return RecentActivity(
        total_events=total_events,
        critical_events=critical_events,
        warning_events=warning_events,
        info_events=info_events,
        activities=recent_activities
    )


@router.get("/stats")
async def get_activity_stats(
    current_admin: AdminUser = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_async_db),
    days: int = Query(default=7, ge=1, le=90, description="Days to analyze")
):
    """
    Get activity statistics and trends.
    """
    start_date = datetime.utcnow() - timedelta(days=days)

    # Get daily activity counts
    daily_stats_query = text("""
        SELECT
            DATE(created_at) as date,
            event_type,
            COUNT(*) as count
        FROM audit_logs
        WHERE created_at >= :start_date
        GROUP BY DATE(created_at), event_type
        ORDER BY date DESC, count DESC
    """)

    result = await db.execute(daily_stats_query, {"start_date": start_date})

    daily_stats = {}
    event_type_totals = {}

    for row in result:
        date_str = row.date.isoformat()
        if date_str not in daily_stats:
            daily_stats[date_str] = {}

        daily_stats[date_str][row.event_type] = row.count
        event_type_totals[row.event_type] = event_type_totals.get(
            row.event_type, 0) + row.count

    # Get top actors
    top_actors_query = text("""
        SELECT
            actor_id,
            COUNT(*) as activity_count
        FROM audit_logs
        WHERE created_at >= :start_date AND actor_id IS NOT NULL
        GROUP BY actor_id
        ORDER BY activity_count DESC
        LIMIT 10
    """)

    actors_result = await db.execute(top_actors_query, {"start_date": start_date})
    top_actors = [{"actor_id": row.actor_id, "count": row.activity_count}
                  for row in actors_result]

    # Get hourly distribution
    hourly_stats_query = text("""
        SELECT
            EXTRACT(HOUR FROM created_at) as hour,
            COUNT(*) as count
        FROM audit_logs
        WHERE created_at >= :start_date
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY hour
    """)

    hourly_result = await db.execute(hourly_stats_query, {"start_date": start_date})
    hourly_distribution = {int(row.hour): row.count for row in hourly_result}

    return {
        "daily_stats": daily_stats,
        "event_type_totals": event_type_totals,
        "top_actors": top_actors,
        "hourly_distribution": hourly_distribution,
        "analysis_period": {
            "start_date": start_date.isoformat(),
            "end_date": datetime.utcnow().isoformat(),
            "days": days
        }
    }


@router.post("/notifications/broadcast")
async def broadcast_notification(
    notification: Dict[str, Any],
    current_admin: AdminUser = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Broadcast a notification to all connected users.
    """
    # Add sender information
    notification["sender"] = {
        "id": current_admin.id,
        "email": current_admin.email,
        "timestamp": datetime.utcnow().isoformat()
    }

    # Broadcast to all connected users
    await activity_manager.send_notification(notification)

    # Log the broadcast
    await _log_activity(
        db=db,
        event_type="notification_broadcast",
        actor_id=current_admin.id,
        details={
            "notification_type": notification.get("type"),
            "message": notification.get("message"),
            "recipients": "all"
        }
    )

    return {"status": "broadcast_sent", "recipients": len(activity_manager.active_connections)}


@router.post("/notifications/send")
async def send_notification(
    notification: Dict[str, Any],
    user_id: str = Query(..., description="Target user ID"),
    current_admin: AdminUser = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Send a notification to a specific user.
    """
    # Add sender information
    notification["sender"] = {
        "id": current_admin.id,
        "email": current_admin.email,
        "timestamp": datetime.utcnow().isoformat()
    }

    # Send to specific user
    await activity_manager.send_notification(notification, user_id)

    # Log the notification
    await _log_activity(
        db=db,
        event_type="notification_sent",
        actor_id=current_admin.id,
        target_id=user_id,
        details={
            "notification_type": notification.get("type"),
            "message": notification.get("message"),
            "recipient": user_id
        }
    )

    return {"status": "notification_sent", "recipient": user_id}


@router.get("/connections")
async def get_active_connections(
    current_admin: AdminUser = Depends(get_current_super_admin)
):
    """
    Get information about active WebSocket connections.
    """
    connections = []
    for user_id, websocket in activity_manager.active_connections.items():
        subscriptions = list(
            activity_manager.user_subscriptions.get(user_id, set()))
        connections.append({
            "user_id": user_id,
            "connected_at": datetime.utcnow().isoformat(),  # In production, track this
            "subscriptions": subscriptions,
            "connection_state": "active"
        })

    return {
        "total_connections": len(activity_manager.active_connections),
        "connections": connections
    }

# Helper Functions


def _generate_activity_title(event_type: str, details: Dict[str, Any]) -> str:
    """Generate human-readable title for activity feed item."""
    title_map = {
        "authentication": "User Authentication",
        "tenant_created": "New Tenant Created",
        "user_created": "New User Registered",
        "order_created": "New Order Placed",
        "product_created": "New Product Added",
        "security_violation": "Security Violation Detected",
        "emergency_lockdown": "Emergency Lockdown Activated",
        "system_error": "System Error Occurred",
        "admin_action": "Admin Action Performed",
        "role_assigned": "Role Assigned to User",
        "role_revoked": "Role Revoked from User",
        "permission_granted": "Permission Granted",
        "permission_denied": "Permission Denied",
        "data_export": "Data Export Requested",
        "bulk_action": "Bulk Action Performed",
        "api_key_created": "API Key Created",
        "api_key_revoked": "API Key Revoked",
        "webhook_configured": "Webhook Configured",
        "integration_enabled": "Integration Enabled",
        "maintenance_mode": "Maintenance Mode",
        "backup_created": "Backup Created",
        "configuration_changed": "Configuration Changed"
    }
    return title_map.get(event_type, event_type.replace("_", " ").title())


def _generate_activity_description(event_type: str, details: Dict[str, Any]) -> str:
    """Generate detailed description for activity feed item."""
    if not details:
        return ""

    if event_type == "authentication":
        success = details.get("success", False)
        return f"Login {'successful' if success else 'failed'} from {details.get('ip_address', 'unknown IP')}"
    elif event_type == "tenant_created":
        return f"Tenant '{details.get('name', 'Unknown')}' created with domain '{details.get('domain', 'unknown')}'"
    elif event_type == "order_created":
        return f"Order #{details.get('order_id', 'unknown')} placed for ${details.get('total_amount', '0')}"
    elif event_type == "security_violation":
        return f"Security violation: {details.get('violation_type', 'unknown')} from {details.get('ip_address', 'unknown IP')}"
    elif event_type == "role_assigned":
        return f"Role '{details.get('role_name', 'unknown')}' assigned to user in {details.get('scope', 'unknown')} scope"
    elif event_type == "emergency_lockdown":
        return f"Emergency lockdown activated: {details.get('reason', 'Security incident')}"
    elif event_type == "data_export":
        return f"Data export requested for {details.get('data_type', 'unknown')} by {details.get('requester', 'unknown')}"
    elif event_type == "bulk_action":
        return f"Bulk action '{details.get('action', 'unknown')}' performed on {details.get('count', 0)} items"
    elif event_type == "configuration_changed":
        return f"Configuration '{details.get('setting', 'unknown')}' changed from '{details.get('old_value', 'unknown')}' to '{details.get('new_value', 'unknown')}'"

    return str(details)


def _determine_severity(event_type: str) -> str:
    """Determine severity level for activity feed item."""
    critical_events = [
        "emergency_lockdown", "security_violation", "system_error",
        "data_breach", "unauthorized_access", "service_outage",
        "critical_error", "fraud_detected"
    ]

    warning_events = [
        "authentication_failed", "rate_limit_exceeded", "permission_denied",
        "configuration_changed", "bulk_action", "api_key_revoked",
        "unusual_activity", "performance_degradation"
    ]

    if event_type in critical_events:
        return "critical"
    elif event_type in warning_events:
        return "warning"
    else:
        return "info"


async def _log_activity(
    db: AsyncSession,
    event_type: str,
    actor_id: Optional[str] = None,
    target_id: Optional[str] = None,
    target_type: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None
):
    """Log an activity to the audit log."""
    # In production, create AuditLog entry and commit to database
    # For now, this is a placeholder
    pass

# Background task to simulate real-time activity


async def simulate_activity():
    """Simulate real-time activity for demonstration."""
    import random

    while True:
        await asyncio.sleep(random.randint(5, 30))  # Random interval

        # Create a sample activity
        event_types = [
            "user_login", "order_created", "product_updated",
            "security_scan", "backup_completed", "api_call"
        ]

        activity = ActivityFeedItem(
            id=f"sim_{int(datetime.utcnow().timestamp())}",
            event_type=random.choice(event_types),
            actor_id=f"user_{random.randint(1, 10)}",
            target_id=f"target_{random.randint(1, 100)}",
            target_type="system",
            title=f"Simulated {random.choice(event_types).replace('_', ' ').title()}",
            description=f"This is a simulated activity for demonstration purposes",
            timestamp=datetime.utcnow(),
            ip_address=f"192.168.1.{random.randint(1, 255)}",
            severity=random.choice(["info", "warning", "critical"]),
            metadata={"simulated": True}
        )

        # Broadcast to all connected users
        await activity_manager.broadcast_activity(activity)

# Start background task (in production, this would be handled by Celery or similar)
# asyncio.create_task(simulate_activity())
