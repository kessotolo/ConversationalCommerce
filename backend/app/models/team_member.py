import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from backend.app.db import Base


class TeamRole(str, enum.Enum):
    """Enum for team member roles."""
    owner = "owner"
    admin = "admin"
    manager = "manager"
    editor = "editor"
    viewer = "viewer"


class TeamInviteStatus(str, enum.Enum):
    """Enum for team invitation statuses."""
    pending = "pending"
    accepted = "accepted"
    declined = "declined"
    expired = "expired"
    revoked = "revoked"


class TeamMember(Base):
    """Model for team members."""
    __tablename__ = "team_members"
    __table_args__ = (
        # Ensure each user is only added once per tenant
        UniqueConstraint("tenant_id", "user_id", name="uq_team_member_tenant_user"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Role and permissions
    role = Column(Enum(TeamRole, create_type=False), nullable=False)
    custom_permissions = Column(JSONB)  # Optional custom permissions beyond role
    
    # Member information
    email = Column(String, nullable=False)
    full_name = Column(String)
    
    # Settings
    is_active = Column(Boolean, default=True)
    
    # Audit
    created_by = Column(UUID(as_uuid=True), nullable=False)  # User who added this member
    updated_by = Column(UUID(as_uuid=True))  # User who last updated this member
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login_at = Column(DateTime(timezone=True))


class TeamInvite(Base):
    """Model for team invitations."""
    __tablename__ = "team_invites"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Invite details
    email = Column(String, nullable=False, index=True)
    role = Column(Enum(TeamRole, create_type=False), nullable=False)
    invite_message = Column(Text)
    invite_code = Column(String, unique=True, nullable=False)
    
    # Status
    status = Column(
        Enum(TeamInviteStatus, create_type=False),
        default=TeamInviteStatus.pending,
        nullable=False
    )
    
    # Timestamps
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    responded_at = Column(DateTime(timezone=True))
    
    # Audit
    created_by = Column(UUID(as_uuid=True), nullable=False)  # User who sent the invite
    accepted_by = Column(UUID(as_uuid=True))  # User who accepted the invite (if accepted)
