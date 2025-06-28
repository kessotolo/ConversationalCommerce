from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime


class TeamInviteBase(BaseModel):
    invitee_phone: Optional[str] = Field(
        None, min_length=8, max_length=20, description="Phone number of invitee")
    invitee_email: Optional[str] = Field(None, description="Email of invitee")
    role: Optional[str] = Field(None, description="Role for the invitee")


class TeamInviteCreate(TeamInviteBase):
    pass


class TeamInviteResponse(TeamInviteBase):
    id: UUID
    tenant_id: UUID
    status: str
    invited_by: Optional[UUID]
    created_at: datetime
    accepted_at: Optional[datetime]
    model_config = ConfigDict(from_attributes=True)
