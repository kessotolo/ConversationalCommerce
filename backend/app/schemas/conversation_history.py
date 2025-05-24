from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


class ConversationHistoryBase(BaseModel):
    order_id: Optional[str] = Field(None, description="Order ID (optional)")
    message: str = Field(..., description="Message content")
    sender_type: str = Field(...,
                             description="Sender type: merchant, customer, bot")
    channel: str = Field(...,
                         description="Channel: whatsapp, instagram, storefront")
    timestamp: Optional[datetime] = Field(
        None, description="Timestamp of the message")


class ConversationHistoryCreate(ConversationHistoryBase):
    pass


class ConversationHistoryResponse(ConversationHistoryBase):
    id: UUID
    timestamp: datetime

    class Config:
        from_attributes = True
