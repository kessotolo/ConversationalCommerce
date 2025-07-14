from sqlalchemy import Column, String, JSON, ForeignKey, UniqueConstraint, Text, Boolean, DateTime, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
from typing import Dict, Any, Optional
import uuid

from app.app.db.base_class import Base
from app.app.models.tenant import Tenant
from sqlalchemy.dialects.postgresql import UUID


class SettingsDomain(Base):
    """
    Model for settings domains, which group related settings together.
    Examples: store, payment, shipping, notifications, integrations
    """
    __tablename__ = "settings_domains"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(64), nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(64), nullable=True)  # Icon identifier for the UI
    order = Column(Integer, nullable=False, default=0)  # Display order in UI
    tenant_id = Column(UUID(as_uuid=True), ForeignKey(
        "tenants.id", ondelete="CASCADE"), nullable=False)
    # Whether this is a system domain (not user-editable)
    is_system = Column(Boolean, default=False)

    # Relationships
    tenant = relationship("Tenant", back_populates="settings_domains")
    settings = relationship(
        "Setting", back_populates="domain", cascade="all, delete")

    # Constraints
    __table_args__ = (
        UniqueConstraint("name", "tenant_id",
                         name="uq_settings_domain_name_tenant"),
    )

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self) -> str:
        return f"<SettingsDomain {self.name} ({self.id})>"


class Setting(Base):
    """
    Model for individual settings with typed values stored as JSON.
    """
    __tablename__ = "settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    key = Column(String(128), nullable=False)
    value = Column(JSON, nullable=True)
    # string, number, boolean, object, array
    value_type = Column(String(32), nullable=False)
    schema = Column(JSON, nullable=True)  # JSON Schema for validation
    domain_id = Column(UUID(as_uuid=True), ForeignKey(
        "settings_domains.id", ondelete="CASCADE"), nullable=False)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey(
        "tenants.id", ondelete="CASCADE"), nullable=False)
    is_encrypted = Column(Boolean, default=False)
    # System settings cannot be modified through regular UI
    is_system = Column(Boolean, default=False)
    description = Column(Text, nullable=True)
    default_value = Column(JSON, nullable=True)
    is_required = Column(Boolean, default=False)
    # UI component to use for editing this setting
    ui_component = Column(String(64), nullable=True)
    ui_order = Column(Integer, default=0)  # Display order within domain
    # Additional validation rules
    validation_rules = Column(JSON, nullable=True)
    # User who last modified this setting
    last_modified_by = Column(String(36), nullable=True)
    last_modified_at = Column(DateTime, nullable=True, default=datetime.utcnow)

    # Relationships
    domain = relationship("SettingsDomain", back_populates="settings")
    tenant = relationship("Tenant", back_populates="settings")

    # Audit history relationship
    history = relationship(
        "SettingHistory", back_populates="setting", cascade="all, delete")

    # Constraints
    __table_args__ = (
        UniqueConstraint("key", "domain_id", "tenant_id",
                         name="uq_setting_key_domain_tenant"),
    )

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self) -> str:
        return f"<Setting {self.key} ({self.id})>"


class SettingHistory(Base):
    """
    Model for storing setting value change history for audit purposes.
    """
    __tablename__ = "settings_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    setting_id = Column(UUID(as_uuid=True), ForeignKey(
        "settings.id", ondelete="CASCADE"), nullable=False)
    previous_value = Column(JSON, nullable=True)
    new_value = Column(JSON, nullable=True)
    # User ID who made the change
    changed_by = Column(String(36), nullable=True)
    changed_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    setting = relationship("Setting", back_populates="history")

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self) -> str:
        return f"<SettingHistory for {self.setting_id} at {self.changed_at}>"


# Add relationships to Tenant model
Tenant.settings_domains = relationship(
    "SettingsDomain", back_populates="tenant", cascade="all, delete")
Tenant.settings = relationship(
    "Setting", back_populates="tenant", cascade="all, delete")
