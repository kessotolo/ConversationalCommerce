"""
ConversationEvent Pattern
------------------------
This file defines the ConversationEventType enum and ConversationEventBase schema, which are used for analytics and monitoring.

- When adding a new event type, update both this enum and the frontend ConversationEventType (see frontend/src/modules/conversation/models/event.ts).
- All analytics and monitoring should use this pattern for extensibility and consistency.
- See AI_AGENT_CONFIG.md for more details.
"""

import enum
from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ConversationEventType(str, enum.Enum):
    message_sent = "message_sent"
    message_read = "message_read"
    product_clicked = "product_clicked"
    order_placed = "order_placed"
    # Add more event types as needed


class ConversationEventBase(BaseModel):
    conversation_id: Optional[UUID] = Field(
        None, description="Conversation ID (optional, for non-message events)"
    )
    user_id: Optional[UUID] = Field(
        None, description="User ID (optional, for system events)"
    )
    event_type: ConversationEventType = Field(
        ..., description="Type of event (message_sent, product_clicked, etc.)"
    )
    payload: Optional[Dict[str, Any]] = Field(
        None, description="Arbitrary event data for extensibility"
    )
    tenant_id: UUID = Field(..., description="Tenant ID for multi-tenancy")
    event_metadata: Optional[Dict[str, Any]] = Field(
        None, description="Optional extra context (device info, etc.)"
    )


class ConversationEventCreate(ConversationEventBase):
    pass


class ConversationEventUpdate(BaseModel):
    conversation_id: Optional[UUID] = None
    user_id: Optional[UUID] = None
    event_type: Optional[ConversationEventType] = None
    payload: Optional[Dict[str, Any]] = None
    event_metadata: Optional[Dict[str, Any]] = None


class ConversationEventResponse(ConversationEventBase):
    id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
