from sqlalchemy import Column, String, Boolean
from app.db import Base
import uuid

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True)
    is_seller = Column(Boolean, default=False)
