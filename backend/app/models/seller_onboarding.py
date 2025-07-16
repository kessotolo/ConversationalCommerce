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
    JSON,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db import Base


class SellerVerificationStatus(str, enum.Enum):
    """Enum for seller verification status."""
    pending = "pending"
    in_review = "in_review"
    approved = "approved"
    rejected = "rejected"
    additional_info_needed = "additional_info_needed"


class SellerVerificationType(str, enum.Enum):
    """Enum for verification types."""
    identity = "identity"
    business = "business"
    banking = "banking"
    tax = "tax"
    address = "address"


class SellerVerification(Base):
    """Model for seller verification records."""
    __tablename__ = "seller_verifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    seller_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    tenant_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Verification details
    verification_type = Column(Enum(SellerVerificationType), nullable=False)
    status = Column(
        Enum(SellerVerificationStatus),
        default=SellerVerificationStatus.pending,
        nullable=False
    )
    
    # Document references and metadata
    document_ids = Column(JSONB)  # Array of document IDs
    verification_data = Column(JSONB)  # Structured verification data
    notes = Column(Text)
    
    # Admin processing
    reviewed_by = Column(UUID(as_uuid=True))
    rejection_reason = Column(Text)
    additional_info_requested = Column(Text)
    
    # Timestamps
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    reviewed_at = Column(DateTime(timezone=True))


class SellerOnboardingStatus(Base):
    """Model for tracking overall seller onboarding status."""
    __tablename__ = "seller_onboarding_statuses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    seller_id = Column(UUID(as_uuid=True), nullable=False, unique=True, index=True)
    tenant_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    # Overall status
    is_approved = Column(Boolean, default=False)
    is_identity_verified = Column(Boolean, default=False)
    is_business_verified = Column(Boolean, default=False)
    is_banking_verified = Column(Boolean, default=False)
    is_tax_verified = Column(Boolean, default=False)
    is_address_verified = Column(Boolean, default=False)
    
    # Steps completion
    completed_steps = Column(JSON)  # Array of completed steps
    current_step = Column(String)
    
    # Timestamps
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True))
    
    # Relationships
    verifications = relationship(
        "SellerVerification",
        primaryjoin="and_(SellerOnboardingStatus.seller_id==SellerVerification.seller_id, "
                   "SellerOnboardingStatus.tenant_id==SellerVerification.tenant_id)",
        backref="onboarding_status",
        viewonly=True
    )
