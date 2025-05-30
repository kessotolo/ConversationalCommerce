from sqlalchemy import Column, String, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db import Base
import uuid

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True)
    is_seller = Column(Boolean, default=False)
    
    # Relationships
    complaints = relationship("Complaint", back_populates="user")
    violations = relationship("Violation", back_populates="user")
