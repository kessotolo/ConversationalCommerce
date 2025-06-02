from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Any, Dict
from uuid import UUID
from datetime import datetime
import enum


class ConversationEventType(str, enum.Enum):
    message_sent = "message_sent"
    message_read = "message_read"
    product_clicked = "product_clicked"
    order_placed = "order_placed"
    # Add more event types as needed


class ConversationEventBase(BaseModel):
    conversation_id: Optional[UUID] = Field(
        None, description="Conversation ID (optional, for non-message events)")
    user_id: Optional[UUID] = Field(
        None, description="User ID (optional, for system events)")
    event_type: ConversationEventType = Field(
        ..., description="Type of event (message_sent, product_clicked, etc.)")
    payload: Optional[Dict[str, Any]] = Field(
        None, description="Arbitrary event data for extensibility")
    tenant_id: UUID = Field(..., description="Tenant ID for multi-tenancy")
    metadata: Optional[Dict[str, Any]] = Field(
        None, description="Optional extra context (device info, etc.)")


class ConversationEventCreate(ConversationEventBase):
    pass


class ConversationEventResponse(ConversationEventBase):
    id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
