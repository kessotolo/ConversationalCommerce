import uuid
import enum
from sqlalchemy import Column, String, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from backend.app.db import Base


class TeamInviteStatusEnum(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    expired = "expired"
    revoked = "revoked"


class TeamInvite(Base):
    __tablename__ = "team_invite"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey(
        "tenants.id"), nullable=False)
    invitee_phone = Column(String, nullable=True)
    invitee_email = Column(String, nullable=True)
    role = Column(String, nullable=True)
    status = Column(Enum(TeamInviteStatusEnum, create_type=False),
                    default=TeamInviteStatusEnum.pending, nullable=False)
    invited_by = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    accepted_at = Column(DateTime(timezone=True), nullable=True)
