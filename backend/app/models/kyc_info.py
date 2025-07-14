import uuid
import enum
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy import Enum as SQLAlchemyEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.app.db import Base


class KYCStatusEnum(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class KYCInfo(Base):
    __tablename__ = "kyc_info"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey(
        "tenants.id"), nullable=False)
    business_name = Column(String, nullable=False)
    id_number = Column(String, nullable=False)
    id_type = Column(String, nullable=False)
    status = Column(SQLAlchemyEnum(KYCStatusEnum, create_type=False),
                    default=KYCStatusEnum.pending, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    documents = relationship(
        "KYCDocument", back_populates="kyc_info", cascade="all, delete-orphan")
