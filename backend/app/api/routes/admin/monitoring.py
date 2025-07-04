"""
API routes for system monitoring and health dashboard.
"""
from typing import Dict, Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
import json
import asyncio
import logging
import time
from datetime import datetime, timedelta

from app.core.monitoring.metrics import (
    metrics_collector, get_system_info, get_metrics_snapshot
)
from app.services.admin.auth.dependencies import get_current_admin_user
from app.core.monitoring.rules_engine import rules_engine

router = APIRouter()
logger = logging.getLogger(__name__)

# WebSocket connections
active_connections: List[WebSocket] = []

# Metrics history for dashboard
metrics_history = {
    "cpu": [],
    "memory": [],
    "disk": [],
    "active_users": [],
    "requests_per_minute": [],
    "error_rate": [],
}

# Maximum history points to store
MAX_HISTORY_POINTS = 60  # 1 hour at 1 minute intervals


@router.get("/health")
async def get_system_health(
    current_user = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """
    Get overall system health status and metrics.
    """
    try:
        # Get system metrics snapshot
        metrics = get_metrics_snapshot()
        
        # Determine system health status based on thresholds
        cpu_status = "healthy" if metrics["system"]["cpu_usage"] < 80 else "warning"
        if metrics["system"]["cpu_usage"] > 90:
            cpu_status = "critical"
            
        memory_status = "healthy" if metrics["system"]["memory_usage_percent"] < 80 else "warning"
        if metrics["system"]["memory_usage_percent"] > 90:
            memory_status = "critical"
            
        disk_status = "healthy" if metrics["system"]["disk_usage_percent"] < 80 else "warning"
        if metrics["system"]["disk_usage_percent"] > 90:
            disk_status = "critical"
        
        # Overall status is the worst of all components
        status_priority = {"healthy": 0, "warning": 1, "critical": 2}
        statuses = [cpu_status, memory_status, disk_status]
        overall_status = max(statuses, key=lambda s: status_priority[s])
        
        return {
            "timestamp": datetime.now().isoformat(),
            "overall_status": overall_status,
            "components": {
                "cpu": {
                    "status": cpu_status,
                    "usage_percent": metrics["system"]["cpu_usage"]
                },
                "memory": {
                    "status": memory_status,
                    "usage_percent": metrics["system"]["memory_usage_percent"]
                },
                "disk": {
                    "status": disk_status,
                    "usage_percent": metrics["system"]["disk_usage_percent"]
                },
                "database": {
                    "status": "healthy",  # To be implemented with actual DB health check
                    "connections": 0  # Placeholder
                },
                "cache": {
                    "status": "healthy",  # To be implemented with actual cache health check
                    "hit_rate": 0  # Placeholder
                }
            }
        }
    except Exception as e:
        logger.error(f"Error getting system health: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting system health: {str(e)}")


@router.get("/metrics")
async def get_metrics(
    current_user = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """
    Get detailed system metrics for dashboard.
    """
    try:
        # Get system metrics and add to history
        snapshot = get_metrics_snapshot()
        
        # Update metrics history
        current_time = datetime.now().isoformat()
        
        if len(metrics_history["cpu"]) >= MAX_HISTORY_POINTS:
            # Remove oldest data point
            for key in metrics_history:
                if metrics_history[key]:
                    metrics_history[key].pop(0)
        
        # Add new data point
        metrics_history["cpu"].append({
            "timestamp": current_time,
            "value": snapshot["system"]["cpu_usage"]
        })
        metrics_history["memory"].append({
            "timestamp": current_time,
            "value": snapshot["system"]["memory_usage_percent"]
        })
        metrics_history["disk"].append({
            "timestamp": current_time,
            "value": snapshot["system"]["disk_usage_percent"]
        })
        metrics_history["active_users"].append({
            "timestamp": current_time,
            "value": snapshot["application"]["active_users_total"]
        })
        
        # Return current metrics and history
        return {
            "current": snapshot,
            "history": metrics_history
        }
    except Exception as e:
        logger.error(f"Error getting metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting metrics: {str(e)}")


@router.get("/system-info")
async def get_detailed_system_info(
    current_user = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """
    Get detailed system information.
    """
    try:
        return get_system_info()
    except Exception as e:
        logger.error(f"Error getting system info: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting system info: {str(e)}")


@router.get("/alerts")
async def get_alerts(
    current_user = Depends(get_current_admin_user),
    severity: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=1000),
    offset: int = Query(0, ge=0)
) -> Dict[str, Any]:
    """
    Get recent system alerts.
    """
    try:
        # This is a placeholder for actual alert retrieval logic
        # In a real implementation, this would query a database or alert service
        
        # Mock alerts for demonstration
        alerts = [
            {
                "id": "alert-001",
                "timestamp": (datetime.now() - timedelta(minutes=5)).isoformat(),
                "severity": "high",
                "title": "High CPU Usage",
                "description": "CPU usage exceeded 90% for more than 5 minutes",
                "status": "active"
            },
            {
                "id": "alert-002",
                "timestamp": (datetime.now() - timedelta(minutes=15)).isoformat(),
                "severity": "medium",
                "title": "Increased Error Rate",
                "description": "API error rate above 5% in the last 15 minutes",
                "status": "active"
            },
            {
                "id": "alert-003",
                "timestamp": (datetime.now() - timedelta(hours=2)).isoformat(),
                "severity": "low",
                "title": "Slow Database Queries",
                "description": "Database queries taking longer than expected",
                "status": "resolved"
            }
        ]
        
        # Filter by severity if specified
        if severity:
            alerts = [a for a in alerts if a["severity"] == severity]
            
        # Apply pagination
        paginated_alerts = alerts[offset:offset+limit]
        
        return {
            "total": len(alerts),
            "alerts": paginated_alerts
        }
    except Exception as e:
        logger.error(f"Error getting alerts: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting alerts: {str(e)}")


@router.get("/alert-rules")
async def get_alert_rules(
    current_user = Depends(get_current_admin_user),
    tenant_id: Optional[str] = Query(None)
) -> Dict[str, Any]:
    """
    Get configured alert rules.
    """
    try:
        # If tenant_id is provided, get rules for that tenant
        # Otherwise, get all rules (admin-only)
        if tenant_id:
            rules = rules_engine.get_rules(tenant_id)
        else:
            # Admin view - get all rules
            all_rules = []
            for tenant_rules in rules_engine.rules.values():
                all_rules.extend(tenant_rules)
            rules = all_rules
            
        # Convert Rule objects to dictionaries
        rule_dicts = [rule.dict() for rule in rules]
        
        return {
            "total": len(rule_dicts),
            "rules": rule_dicts
        }
    except Exception as e:
        logger.error(f"Error getting alert rules: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting alert rules: {str(e)}")


@router.websocket("/ws")
async def metrics_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for real-time metrics updates.
    """
    await websocket.accept()
    active_connections.append(websocket)
    
    try:
        while True:
            # Send metrics update every 5 seconds
            metrics = get_metrics_snapshot()
            await websocket.send_text(json.dumps({
                "type": "metrics_update",
                "data": metrics,
                "timestamp": datetime.now().isoformat()
            }))
            await asyncio.sleep(5)
    except WebSocketDisconnect:
        active_connections.remove(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        if websocket in active_connections:
            active_connections.remove(websocket)


async def broadcast_alert(alert: Dict[str, Any]):
    """
    Broadcast an alert to all connected WebSocket clients.
    """
    if not active_connections:
        return
        
    message = json.dumps({
        "type": "alert",
        "data": alert,
        "timestamp": datetime.now().isoformat()
    })
    
    for connection in active_connections:
        try:
            await connection.send_text(message)
        except Exception as e:
            logger.error(f"Error broadcasting alert: {e}")
            # Remove failed connection
            if connection in active_connections:
                active_connections.remove(connection)
