from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.conversation_history import ChannelType


class OrderChannelMetaBase(BaseModel):
    channel: ChannelType
    message_id: Optional[str] = None
    chat_session_id: Optional[str] = None
    user_response_log: Optional[str] = None


class OrderChannelMetaCreate(OrderChannelMetaBase):
    order_id: UUID


class OrderChannelMetaResponse(OrderChannelMetaBase):
    id: UUID
    order_id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
