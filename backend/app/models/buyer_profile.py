import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    String,
    Text,
    JSON
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.db import Base


class BuyerProfile(Base):
    """
    Buyer profile information, including personal details and security settings
    """
    __tablename__ = "buyer_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), nullable=False, index=True)  # Multi-tenancy
    customer_id = Column(UUID(as_uuid=True), nullable=False, index=True)  # Link to customer
    
    # Basic information
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone_number = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    
    # Security settings
    password_hash = Column(String, nullable=True)
    two_factor_enabled = Column(Boolean, default=False)
    recovery_email = Column(String, nullable=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    last_login_ip = Column(String, nullable=True)
    
    # Preferences
    communication_preferences = Column(JSON, nullable=True)  # JSON field for flexible preferences
    display_preferences = Column(JSON, nullable=True)  # Theme, language, etc.
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship definition would go here if needed
    
    __table_args__ = (
        # Ensure each customer has only one profile per tenant
        {"extend_existing": True},
    )
