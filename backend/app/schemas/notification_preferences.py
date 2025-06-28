import uuid
from typing import Optional, Dict
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime


class NotificationPreferencesBase(BaseModel):
    # e.g. {"email": true, "sms": false}
    preferences: Dict[str, bool] = Field(default_factory=dict)


class NotificationPreferencesUpdate(BaseModel):
    preferences: Optional[Dict[str, bool]] = None


class NotificationPreferencesResponse(NotificationPreferencesBase):
    id: uuid.UUID
    customer_id: uuid.UUID
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)
