from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AIConfigBase(BaseModel):
    merchant_id: UUID
    style_tone: Optional[str] = Field(
        None, description="Preferred style/tone for bot replies"
    )
    auto_reply_enabled: bool = Field(False, description="Is auto-reply enabled?")
    active_hours: Optional[str] = Field(
        None, description="Active hours for bot (could be JSON)"
    )
    bot_name: Optional[str] = Field(None, description="Bot's display name")


class AIConfigCreate(AIConfigBase):
    pass


class AIConfigUpdate(BaseModel):
    style_tone: Optional[str] = None
    auto_reply_enabled: Optional[bool] = None
    active_hours: Optional[str] = None
    bot_name: Optional[str] = None


class AIConfigResponse(AIConfigBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
