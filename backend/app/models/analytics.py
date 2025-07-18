from datetime import datetime
from typing import Optional, List
import uuid
from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Boolean, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID

from app.db.base_class import Base
from app.models.tenant import Tenant
from app.models.user import User


class AnalyticsEvent(Base):
    """Base model for analytics events"""
    __tablename__ = "analytics_events"

    id = Column(UUID(as_uuid=True), primary_key=True,
                default=uuid.uuid4, index=True)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey(
        "tenants.id"), nullable=False)
    event_type = Column(String(50), index=True, nullable=False)
    event_category = Column(String(50), index=True, nullable=False)
    event_name = Column(String(100), index=True, nullable=False)
    event_value = Column(Float, nullable=True)
    event_data = Column(JSON, nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    session_id = Column(String(100), nullable=True, index=True)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)
    referrer = Column(String(255), nullable=True)
    page_url = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True),
                        server_default=func.now(), nullable=False)

    # Relationships
    tenant = relationship("Tenant", back_populates="analytics_events")
    user = relationship("User", back_populates="analytics_events")


class AnalyticsMetric(Base):
    """Model for pre-calculated analytics metrics"""
    __tablename__ = "analytics_metrics"

    id = Column(UUID(as_uuid=True), primary_key=True,
                default=uuid.uuid4, index=True)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey(
        "tenants.id"), nullable=False)
    metric_key = Column(String(100), index=True, nullable=False)
    metric_category = Column(String(50), index=True, nullable=False)
    metric_value = Column(Float, nullable=False)
    dimension = Column(String(50), index=True, nullable=True)
    dimension_value = Column(String(100), index=True, nullable=True)
    # daily, weekly, monthly, yearly
    time_period = Column(String(20), index=True, nullable=False)
    # ISO format date or period identifier
    time_value = Column(String(20), index=True, nullable=False)
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    # Indicates if metric is subject to change
    is_final = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True),
                        server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(
    ), onupdate=func.now(), nullable=False)

    # Relationships
    tenant = relationship("Tenant", back_populates="analytics_metrics")


class AnalyticsReport(Base):
    """Model for saved analytics reports"""
    __tablename__ = "analytics_reports"

    id = Column(UUID(as_uuid=True), primary_key=True,
                default=uuid.uuid4, index=True)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey(
        "tenants.id"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    report_type = Column(String(50), nullable=False)
    filters = Column(JSON, nullable=True)
    metrics = Column(JSON, nullable=False)
    dimensions = Column(JSON, nullable=True)
    # start_date, end_date, or preset like "last_30_days"
    date_range = Column(JSON, nullable=False)
    visualization_type = Column(String(50), nullable=False)
    visualization_config = Column(JSON, nullable=True)
    is_scheduled = Column(Boolean, default=False, nullable=False)
    # frequency, recipients, etc.
    schedule_config = Column(JSON, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey(
        "users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True),
                        server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(
    ), onupdate=func.now(), nullable=False)

    # Relationships
    tenant = relationship("Tenant", back_populates="analytics_reports")
    creator = relationship("User", foreign_keys=[created_by])


# Update relationships in User and Tenant models
User.analytics_events = relationship("AnalyticsEvent", back_populates="user")
Tenant.analytics_events = relationship(
    "AnalyticsEvent", back_populates="tenant")
Tenant.analytics_metrics = relationship(
    "AnalyticsMetric", back_populates="tenant")
Tenant.analytics_reports = relationship(
    "AnalyticsReport", back_populates="tenant")
