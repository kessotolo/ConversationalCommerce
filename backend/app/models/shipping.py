import uuid
from datetime import datetime
from typing import Dict, Any, Optional

from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, DateTime, Float
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.db.base_class import Base


class SellerShippingProvider(Base):
    """
    Model for seller-defined shipping providers.
    Enables sellers with minimal technical skills to onboard local delivery services.
    """
    __tablename__ = "seller_shipping_providers"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    
    # Basic provider information
    name = Column(String, nullable=False)
    provider_type = Column(String, nullable=False)  # "bike", "pickup", "local", "personal"
    description = Column(String, nullable=True)
    
    # Pricing structure - stored in smallest currency unit (e.g., cents)
    base_fee = Column(Integer, nullable=False)  # Base cost 
    per_km_fee = Column(Integer, nullable=False, default=0)  # Additional per-km cost
    min_distance = Column(Float, nullable=False, default=0)  # Minimum delivery distance in km
    max_distance = Column(Float, nullable=False, default=10)  # Maximum delivery distance in km
    
    # Coverage area - can be a circle, polygon or other geo shape
    coverage_area = Column(JSONB, nullable=True)  # Geo boundaries as GeoJSON
    
    # Contact information
    contact_name = Column(String, nullable=False)
    contact_phone = Column(String, nullable=False)
    contact_whatsapp = Column(String, nullable=True)  # Optional WhatsApp number
    
    # Delivery options
    estimated_delivery_time = Column(String, nullable=True)  # e.g., "30-45 minutes"
    delivery_days = Column(JSONB, nullable=True)  # e.g., {"mon": true, "tue": true, ...}
    delivery_hours = Column(JSONB, nullable=True)  # e.g., {"start": "08:00", "end": "18:00"}
    
    # Status
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)  # Is this the default provider for the tenant?
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Onboarding status
    onboarding_status = Column(String, default="pending")  # pending, active, suspended
    onboarding_completed = Column(Boolean, default=False)
    
    def dict(self) -> Dict[str, Any]:
        """Convert model to dictionary"""
        return {
            "id": str(self.id),
            "tenant_id": str(self.tenant_id),
            "name": self.name,
            "provider_type": self.provider_type,
            "description": self.description,
            "base_fee": self.base_fee,
            "per_km_fee": self.per_km_fee,
            "min_distance": self.min_distance,
            "max_distance": self.max_distance,
            "coverage_area": self.coverage_area,
            "contact_name": self.contact_name,
            "contact_phone": self.contact_phone,
            "contact_whatsapp": self.contact_whatsapp,
            "estimated_delivery_time": self.estimated_delivery_time,
            "delivery_days": self.delivery_days,
            "delivery_hours": self.delivery_hours,
            "is_active": self.is_active,
            "is_default": self.is_default,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "onboarding_status": self.onboarding_status,
            "onboarding_completed": self.onboarding_completed,
        }


class ShippingCourier(Base):
    """
    Model for individual delivery personnel associated with a SellerShippingProvider.
    Enables non-technical couriers to receive orders via WhatsApp/SMS.
    """
    __tablename__ = "shipping_couriers"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider_id = Column(UUID(as_uuid=True), ForeignKey("seller_shipping_providers.id"), nullable=False)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    
    # Courier information
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    whatsapp = Column(String, nullable=True)
    
    # Optional metadata
    vehicle_type = Column(String, nullable=True)  # e.g., "bike", "motorcycle", "car", "foot"
    vehicle_description = Column(String, nullable=True)
    profile_photo_url = Column(String, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    available = Column(Boolean, default=True)
    
    # Onboarding status
    onboarding_completed = Column(Boolean, default=False)
    onboarding_date = Column(DateTime, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def dict(self) -> Dict[str, Any]:
        """Convert model to dictionary"""
        return {
            "id": str(self.id),
            "provider_id": str(self.provider_id),
            "tenant_id": str(self.tenant_id),
            "name": self.name,
            "phone": self.phone,
            "whatsapp": self.whatsapp,
            "vehicle_type": self.vehicle_type,
            "vehicle_description": self.vehicle_description,
            "profile_photo_url": self.profile_photo_url,
            "is_active": self.is_active,
            "available": self.available,
            "onboarding_completed": self.onboarding_completed,
            "onboarding_date": self.onboarding_date.isoformat() if self.onboarding_date else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
