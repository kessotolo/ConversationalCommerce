import uuid

from sqlalchemy import Boolean, Column, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.app.db import Base


class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True)
    is_seller = Column(Boolean, default=False)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey(
        "tenants.id"), nullable=True)

    # Relationships
    complaints = relationship("Complaint", back_populates="user")
    violations = relationship("Violation", back_populates="user")
    totp_secret = relationship(
        "TOTPSecret", back_populates="user", uselist=False)
    theme_versions_created = relationship(
        "ThemeVersion", back_populates="creator")
