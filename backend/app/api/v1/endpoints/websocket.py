from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Path
from app.app.core.security.clerk_multi_org import MultiOrgClerkTokenData as ClerkTokenData
from app.app.core.websocket.monitoring import get_websocket_endpoint
from app.app.api import deps

router = APIRouter()


@router.websocket("/ws/monitoring/{tenant_id}")
async def monitoring_websocket(
    websocket: WebSocket,
    tenant_id: str = Path(..., description="The tenant ID for monitoring"),
    current_user: ClerkTokenData = Depends(deps.get_current_user),
):
    """
    WebSocket endpoint for real-time activity monitoring.

    This endpoint establishes a WebSocket connection for monitoring activities
    within a specific tenant. The connection is authenticated and tenant-isolated.

    Messages received will be in the following format:
    {
        "type": "activity",
        "data": {
            "user_id": "uuid",
            "tenant_id": "uuid",
            "action": "string",
            "resource_type": "string",
            "resource_id": "string",
            "details": {},
            "timestamp": "iso8601"
        }
    }
    """
    await get_websocket_endpoint(websocket, tenant_id, current_user)
