from typing import Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
import json

from app.core.security import get_tenant_id_from_headers, validate_jwt_ws
from app.services.analytics_realtime_service import get_analytics_realtime_manager

router = APIRouter()

@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    manager=Depends(get_analytics_realtime_manager)
):
    """WebSocket endpoint for real-time analytics updates"""
    # Validate connection and extract tenant ID
    try:
        # Get token from query parameters
        token = websocket.query_params.get("token")
        if not token:
            await websocket.close(code=1008, reason="Missing authentication token")
            return

        # Validate token and get tenant ID
        tenant_id = await validate_jwt_ws(token)
        if not tenant_id:
            await websocket.close(code=1008, reason="Invalid authentication token")
            return

        # Get query parameters for the subscription
        query_params_str = websocket.query_params.get("query", "{}")
        try:
            query_params = json.loads(query_params_str)
        except json.JSONDecodeError:
            await websocket.close(code=1003, reason="Invalid query parameters format")
            return

        # Validate required query parameters
        if "metrics" not in query_params or not isinstance(query_params["metrics"], list):
            await websocket.close(code=1003, reason="Missing or invalid 'metrics' parameter")
            return

        # Connect to WebSocket manager
        await manager.connect(websocket, tenant_id, query_params)

        try:
            # Keep the connection alive
            while True:
                # Wait for any messages (client can send config updates)
                data = await websocket.receive_text()
                try:
                    message = json.loads(data)
                    
                    # Handle message types
                    if message.get("type") == "update_query":
                        # Update query parameters
                        new_query = message.get("query", {})
                        if "metrics" in new_query and isinstance(new_query["metrics"], list):
                            manager.connection_queries[websocket] = new_query
                            await websocket.send_json({
                                "type": "config_updated",
                                "success": True
                            })
                        else:
                            await websocket.send_json({
                                "type": "error",
                                "message": "Invalid query parameters"
                            })
                    
                    elif message.get("type") == "ping":
                        # Simple ping to keep connection alive
                        await websocket.send_json({
                            "type": "pong",
                            "timestamp": message.get("timestamp")
                        })
                        
                except json.JSONDecodeError:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Invalid JSON format"
                    })
                    
        except WebSocketDisconnect:
            await manager.disconnect(websocket, tenant_id)
            
    except Exception as e:
        # Handle any other exceptions
        try:
            await websocket.close(code=1011, reason="Internal server error")
        except:
            pass
