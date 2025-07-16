import uuid
import enum
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy import Enum as SQLAlchemyEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db import Base


class KYCDocumentStatusEnum(str, enum.Enum):
    uploaded = "uploaded"
    verified = "verified"
    rejected = "rejected"


class KYCDocument(Base):
    __tablename__ = "kyc_document"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kyc_info_id = Column(UUID(as_uuid=True), ForeignKey(
        "kyc_info.id"), nullable=False)
    file_url = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    status = Column(SQLAlchemyEnum(KYCDocumentStatusEnum),
                    default=KYCDocumentStatusEnum.uploaded, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    kyc_info = relationship("KYCInfo", back_populates="documents")
