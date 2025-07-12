from typing import Dict, List, Any, Optional
from fastapi import WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
import asyncio
import json
import logging
from datetime import datetime, timedelta

from backend.app.core.database import get_db
from backend.app.repositories.analytics_repository import AnalyticsRepository
from backend.app.schemas.analytics import AnalyticsQuery

logger = logging.getLogger(__name__)

class ConnectionManager:
    """Manages WebSocket connections for real-time analytics data"""

    def __init__(self):
        # Store active connections by tenant_id
        self.active_connections: Dict[int, List[WebSocket]] = {}
        # Store query parameters for each connection
        self.connection_queries: Dict[WebSocket, Dict[str, Any]] = {}
        # Flag to control background task
        self.is_running = False
        
    async def connect(self, websocket: WebSocket, tenant_id: int, query_params: Dict[str, Any]):
        """Connect a new WebSocket client"""
        await websocket.accept()
        
        if tenant_id not in self.active_connections:
            self.active_connections[tenant_id] = []
            
        self.active_connections[tenant_id].append(websocket)
        self.connection_queries[websocket] = query_params
        
        logger.info(f"New WebSocket connection for tenant {tenant_id}. " 
                   f"Total active connections: {len(self.connection_queries)}")
        
        # Start background task if not already running
        if not self.is_running:
            asyncio.create_task(self.background_send_updates())
            self.is_running = True
    
    async def disconnect(self, websocket: WebSocket, tenant_id: int):
        """Disconnect a WebSocket client"""
        if tenant_id in self.active_connections:
            if websocket in self.active_connections[tenant_id]:
                self.active_connections[tenant_id].remove(websocket)
                
                # Clean up empty tenant entries
                if not self.active_connections[tenant_id]:
                    del self.active_connections[tenant_id]
        
        if websocket in self.connection_queries:
            del self.connection_queries[websocket]
            
        logger.info(f"WebSocket disconnected for tenant {tenant_id}. "
                   f"Total active connections: {len(self.connection_queries)}")
        
        # Stop background task if no more connections
        if not self.connection_queries:
            self.is_running = False
    
    async def send_personal_message(self, message: Dict[str, Any], websocket: WebSocket):
        """Send a message to a specific client"""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Error sending personal message: {str(e)}")
    
    async def broadcast(self, message: Dict[str, Any], tenant_id: int):
        """Broadcast a message to all connected clients for a tenant"""
        if tenant_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[tenant_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error broadcasting message: {str(e)}")
                    disconnected.append(connection)
            
            # Clean up any disconnected clients
            for conn in disconnected:
                await self.disconnect(conn, tenant_id)
    
    async def background_send_updates(self):
        """Background task to periodically send updates to all connected clients"""
        logger.info("Starting background real-time analytics update task")
        db = next(get_db())
        
        try:
            while self.is_running:
                # Process each tenant's connections
                for tenant_id in list(self.active_connections.keys()):
                    tenant_connections = self.active_connections.get(tenant_id, [])
                    
                    # Skip if no active connections for this tenant
                    if not tenant_connections:
                        continue
                        
                    # Process each connection for this tenant
                    for websocket in list(tenant_connections):
                        # Skip if connection no longer exists in our tracking
                        if websocket not in self.connection_queries:
                            continue
                            
                        # Get query params for this connection
                        query_params = self.connection_queries[websocket]
                        
                        # Create analytics query
                        query = AnalyticsQuery(
                            metrics=query_params.get("metrics", []),
                            dimensions=query_params.get("dimensions", []),
                            filters=query_params.get("filters", {}),
                            date_range={
                                "start_date": datetime.now() - timedelta(hours=1),
                                "end_date": datetime.now()
                            },
                            sort_by=query_params.get("sort_by"),
                            sort_desc=query_params.get("sort_desc", False),
                            limit=query_params.get("limit", 100),
                            offset=query_params.get("offset", 0)
                        )
                        
                        try:
                            # Query real-time data
                            df = await AnalyticsRepository.aggregate_metrics(db, query, tenant_id)
                            
                            # Send update to this specific connection
                            await self.send_personal_message({
                                "type": "update",
                                "data": df.to_dict(orient="records"),
                                "count": len(df),
                                "columns": list(df.columns),
                                "timestamp": datetime.now().isoformat()
                            }, websocket)
                        except Exception as e:
                            logger.error(f"Error processing real-time update: {str(e)}")
                
                # Sleep for a short interval before next update cycle
                # 5 seconds is a reasonable interval for real-time updates
                await asyncio.sleep(5)
        finally:
            logger.info("Background real-time analytics update task stopped")

# Singleton instance
manager = ConnectionManager()

async def get_analytics_realtime_manager():
    """Dependency to get the connection manager"""
    return manager
