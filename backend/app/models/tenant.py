from sqlalchemy import Column, String, Integer, BigInteger
from sqlalchemy.dialects.postgresql import UUID
from app.db.base_class import Base
import uuid


class Tenant(Base):
    __tablename__ = "tenants"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, nullable=False)

    # Rate limiting quotas
    requests_per_minute = Column(Integer, default=60, nullable=False)
    requests_per_hour = Column(Integer, default=1000, nullable=False)
    requests_per_day = Column(Integer, default=10000, nullable=False)

    # Resource quotas
    max_storage_mb = Column(Integer, default=1024,
                            nullable=False)  # 1GB default
    max_products = Column(Integer, default=1000, nullable=False)
    max_users = Column(Integer, default=100, nullable=False)

    # Usage tracking
    current_storage_mb = Column(Integer, default=0, nullable=False)
    current_products = Column(Integer, default=0, nullable=False)
    current_users = Column(Integer, default=0, nullable=False)

    # API usage tracking
    api_calls_today = Column(BigInteger, default=0, nullable=False)
    api_calls_hour = Column(BigInteger, default=0, nullable=False)
    api_calls_minute = Column(BigInteger, default=0, nullable=False)
    # ISO format timestamp of last reset
    last_api_reset = Column(String, nullable=True)
