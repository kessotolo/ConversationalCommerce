from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any, Union
from pydantic import BaseModel, Field
from enum import Enum
import uuid
from datetime import datetime


class PackageDimensions(BaseModel):
    """Package dimensions for shipping calculation"""
    length: float = Field(..., description="Length in cm")
    width: float = Field(..., description="Width in cm")
    height: float = Field(..., description="Height in cm")
    weight: float = Field(..., description="Weight in kg")


class Address(BaseModel):
    """Standard address format for shipping providers"""
    street1: str
    street2: Optional[str] = None
    city: str
    state: str
    postal_code: str
    country: str
    phone: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    company: Optional[str] = None
    is_residential: bool = True


class ShippingRateRequest(BaseModel):
    """Common request format for shipping rate calculations"""
    origin: Address
    destination: Address
    packages: List[PackageDimensions]
    service_codes: Optional[List[str]] = None
    signature_required: bool = False
    insurance_amount: Optional[float] = None


class ShippingService(BaseModel):
    """Represents a shipping service offered by a carrier"""
    code: str
    name: str
    carrier: str
    transit_days: Optional[int] = None
    guaranteed_delivery: bool = False
    description: Optional[str] = None


class ShippingRate(BaseModel):
    """Standard shipping rate response format"""
    service: ShippingService
    base_rate: float
    taxes: Optional[float] = None
    fees: Optional[Dict[str, float]] = None
    insurance_rate: Optional[float] = None
    total_rate: float
    currency: str = "USD"
    estimated_delivery_date: Optional[datetime] = None
    transit_days: Optional[int] = None


class ShippingRateResponse(BaseModel):
    """Response containing available shipping rates"""
    rates: List[ShippingRate]
    carrier: str
    errors: Optional[List[str]] = None


class LabelFormat(str, Enum):
    """Supported label formats"""
    PDF = "pdf"
    PNG = "png"
    ZPL = "zpl"


class LabelRequest(BaseModel):
    """Common request format for shipping label creation"""
    rate_id: Optional[str] = None
    service_code: str
    carrier: str
    origin: Address
    destination: Address
    packages: List[PackageDimensions]
    reference: Optional[str] = None
    format: LabelFormat = LabelFormat.PDF
    label_size: str = "4x6"
    signature_required: bool = False
    insurance_amount: Optional[float] = None
    label_order_id: Optional[str] = None
    tenant_id: Optional[str] = None


class PackageLabel(BaseModel):
    """Information about a generated shipping label for a package"""
    tracking_number: str
    label_url: str
    carrier: str
    service_code: str
    label_format: LabelFormat
    shipment_id: str
    package_dimensions: PackageDimensions
    created_at: datetime


class LabelResponse(BaseModel):
    """Response containing generated shipping labels"""
    labels: List[PackageLabel]
    carrier: str
    total_cost: float
    currency: str = "USD"
    shipment_id: str
    estimated_delivery_date: Optional[datetime] = None
    errors: Optional[List[str]] = None


class TrackingStatus(str, Enum):
    """Standard tracking statuses across providers"""
    UNKNOWN = "unknown"
    CREATED = "created"
    PRE_TRANSIT = "pre_transit"
    TRANSIT = "in_transit"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    AVAILABLE_FOR_PICKUP = "available_for_pickup"
    RETURN_TO_SENDER = "return_to_sender"
    FAILURE = "delivery_failure"
    CANCELLED = "cancelled"
    EXCEPTION = "exception"


class TrackingEvent(BaseModel):
    """Standard tracking event format"""
    timestamp: datetime
    status: TrackingStatus
    location: Optional[str] = None
    description: Optional[str] = None
    raw_status: Optional[str] = None


class TrackingResponse(BaseModel):
    """Response containing tracking information"""
    tracking_number: str
    carrier: str
    status: TrackingStatus
    estimated_delivery_date: Optional[datetime] = None
    events: List[TrackingEvent]
    last_event: Optional[TrackingEvent] = None
    delivered_at: Optional[datetime] = None
    errors: Optional[List[str]] = None


class ValidationRequest(BaseModel):
    """Address validation request"""
    address: Address


class ValidationResponse(BaseModel):
    """Address validation response"""
    is_valid: bool
    normalized_address: Optional[Address] = None
    errors: Optional[List[str]] = None
    suggestions: Optional[List[Address]] = None


class ShippingProviderConfig(BaseModel):
    """Base configuration for shipping providers"""
    provider_name: str
    is_production: bool = False
    timeout_seconds: int = 30


class ShippingProviderInterface(ABC):
    """
    Abstract interface for all shipping providers to implement.
    Defines the contract that all shipping providers must fulfill.
    """
    
    @abstractmethod
    async def get_rates(self, request: ShippingRateRequest) -> ShippingRateResponse:
        """
        Get shipping rates for a given origin, destination and package details
        
        Args:
            request: The shipping rate request details
            
        Returns:
            ShippingRateResponse containing available shipping rates
        """
        pass
    
    @abstractmethod
    async def create_label(self, request: LabelRequest) -> LabelResponse:
        """
        Create a shipping label for a shipment
        
        Args:
            request: The label generation request details
            
        Returns:
            LabelResponse containing the generated label and tracking information
        """
        pass
    
    @abstractmethod
    async def track_shipment(self, tracking_number: str) -> TrackingResponse:
        """
        Track a shipment using its tracking number
        
        Args:
            tracking_number: The carrier-provided tracking number
            
        Returns:
            TrackingResponse containing shipment status and tracking events
        """
        pass
    
    @abstractmethod
    async def validate_address(self, request: ValidationRequest) -> ValidationResponse:
        """
        Validate a shipping address
        
        Args:
            request: The address validation request
            
        Returns:
            ValidationResponse with validation results and normalized address if valid
        """
        pass
    
    @abstractmethod
    def get_available_services(self) -> List[ShippingService]:
        """
        Get a list of available shipping services for this provider
        
        Returns:
            List of available shipping service options
        """
        pass
    

class BaseShippingProvider(ShippingProviderInterface):
    """
    Base implementation of the ShippingProviderInterface providing common functionality
    that can be inherited by concrete provider implementations.
    """
    
    def __init__(self, config: ShippingProviderConfig):
        self.config = config
        self.provider_name = config.provider_name
        self.is_production = config.is_production
        
    async def handle_api_error(self, error: Any) -> List[str]:
        """
        Convert provider-specific API errors to a standardized format
        
        Args:
            error: The error object from the provider's API
            
        Returns:
            List of error messages
        """
        # Default implementation just returns a generic error
        return [f"An error occurred with the shipping provider: {str(error)}"]
    
    def get_environment_prefix(self) -> str:
        """
        Get the environment prefix (e.g., for logging or metrics)
        
        Returns:
            String representing the current environment (production/sandbox)
        """
        return "prod" if self.is_production else "sandbox"
