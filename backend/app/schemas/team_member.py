from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class TeamRoleEnum(str, Enum):
    owner = "owner"
    admin = "admin"
    manager = "manager"
    editor = "editor"
    viewer = "viewer"


class TeamInviteStatusEnum(str, Enum):
    pending = "pending"
    accepted = "accepted"
    declined = "declined"
    expired = "expired"
    revoked = "revoked"


class TeamMemberBase(BaseModel):
    """Base schema for team member data."""
    role: TeamRoleEnum
    email: EmailStr
    full_name: Optional[str] = None
    custom_permissions: Optional[Dict[str, Any]] = None


class TeamMemberCreate(TeamMemberBase):
    """Schema for creating a new team member."""
    user_id: UUID
    tenant_id: UUID
    created_by: UUID


class TeamMemberUpdate(BaseModel):
    """Schema for updating an existing team member."""
    role: Optional[TeamRoleEnum] = None
    custom_permissions: Optional[Dict[str, Any]] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None


class TeamMemberResponse(TeamMemberBase):
    """Schema for team member API responses."""
    id: UUID
    tenant_id: UUID
    user_id: UUID
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_login_at: Optional[datetime] = None
    created_by: UUID
    updated_by: Optional[UUID] = None

    class Config:
        from_attributes = True


class TeamInviteBase(BaseModel):
    """Base schema for team invites."""
    email: EmailStr
    role: TeamRoleEnum
    invite_message: Optional[str] = None


class TeamInviteCreate(TeamInviteBase):
    """Schema for creating a new team invite."""
    tenant_id: UUID
    created_by: UUID


class TeamInviteResponse(TeamInviteBase):
    """Schema for team invite API responses."""
    id: UUID
    tenant_id: UUID
    status: TeamInviteStatusEnum
    invite_code: str
    expires_at: datetime
    created_at: datetime
    updated_at: Optional[datetime] = None
    responded_at: Optional[datetime] = None
    created_by: UUID
    accepted_by: Optional[UUID] = None

    class Config:
        from_attributes = True


class TeamInviteAccept(BaseModel):
    """Schema for accepting a team invite."""
    invite_code: str
    user_id: UUID


class TeamInviteUpdate(BaseModel):
    """Schema for updating a team invite."""
    status: Optional[TeamInviteStatusEnum] = None
    invite_message: Optional[str] = None
