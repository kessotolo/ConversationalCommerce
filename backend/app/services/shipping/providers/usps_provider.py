import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import aiohttp
import logging
from urllib.parse import quote

from .base_provider import (
    BaseShippingProvider,
    ShippingProviderConfig,
    ShippingRateRequest,
    ShippingRateResponse,
    LabelRequest,
    LabelResponse,
    TrackingResponse,
    ValidationRequest,
    ValidationResponse,
    ShippingService,
    ShippingRate,
    PackageLabel,
    TrackingStatus,
    TrackingEvent,
    LabelFormat
)


class USPSConfig(ShippingProviderConfig):
    """USPS API configuration"""
    username: str
    password: Optional[str] = None
    api_key: str


class USPSProvider(BaseShippingProvider):
    """
    Implementation of ShippingProviderInterface for USPS
    """
    
    # USPS service code mapping to service name
    SERVICE_CODES = {
        "PRIORITY": "Priority Mail",
        "PRIORITY_EXPRESS": "Priority Mail Express",
        "FIRST_CLASS": "First-Class Mail",
        "MEDIA": "Media Mail",
        "PARCEL_SELECT": "Parcel Select",
        "LIBRARY": "Library Mail",
    }
    
    # USPS tracking status mapping to our standardized statuses
    TRACKING_STATUS_MAP = {
        "ACCEPTANCE": TrackingStatus.CREATED,
        "PICKED_UP": TrackingStatus.PRE_TRANSIT,
        "PROCESSED": TrackingStatus.TRANSIT,
        "DISPATCHED": TrackingStatus.TRANSIT,
        "IN_TRANSIT": TrackingStatus.TRANSIT,
        "OUT_FOR_DELIVERY": TrackingStatus.OUT_FOR_DELIVERY,
        "DELIVERED": TrackingStatus.DELIVERED,
        "RETURN_TO_SENDER": TrackingStatus.RETURN_TO_SENDER,
        "DELAYED": TrackingStatus.EXCEPTION,
        "ATTEMPTED_DELIVERY": TrackingStatus.FAILURE,
        "AVAILABLE_FOR_PICKUP": TrackingStatus.AVAILABLE_FOR_PICKUP,
    }
    
    def __init__(self, config: USPSConfig):
        super().__init__(config)
        self.config = config
        self.username = config.username
        self.api_key = config.api_key
        self.password = config.password
        
        # Set API endpoints based on environment
        if self.is_production:
            self.api_base_url = "https://secure.shippingapis.com/ShippingAPI.dll"
        else:
            self.api_base_url = "https://stg-secure.shippingapis.com/ShippingAPI.dll"
            
        self.logger = logging.getLogger(__name__)
    
    async def get_rates(self, request: ShippingRateRequest) -> ShippingRateResponse:
        """
        Get shipping rates from USPS
        
        Args:
            request: The shipping rate request
            
        Returns:
            ShippingRateResponse with available rates
        """
        try:
            # Build the XML request for USPS Rate API
            xml_request = self._build_rate_request_xml(request)
            
            # Make the API call
            api_url = f"{self.api_base_url}?API=RateV4&XML={quote(xml_request)}"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(api_url, timeout=self.config.timeout_seconds) as response:
                    if response.status != 200:
                        return ShippingRateResponse(
                            rates=[],
                            carrier="USPS",
                            errors=[f"USPS API error: HTTP {response.status}"]
                        )
                    
                    response_text = await response.text()
                    
            # Parse the XML response
            rates, errors = self._parse_rate_response_xml(response_text, request)
            
            return ShippingRateResponse(
                rates=rates,
                carrier="USPS",
                errors=errors
            )
        except Exception as e:
            self.logger.error(f"Error getting USPS rates: {str(e)}")
            return ShippingRateResponse(
                rates=[],
                carrier="USPS",
                errors=[f"Failed to get rates: {str(e)}"]
            )
    
    async def create_label(self, request: LabelRequest) -> LabelResponse:
        """
        Create a shipping label with USPS
        
        Args:
            request: The label request
            
        Returns:
            LabelResponse with label and tracking information
        """
        try:
            # Build the XML request for USPS Shipping Label API
            xml_request = self._build_label_request_xml(request)
            
            # Make the API call
            api_url = f"{self.api_base_url}?API=eVS&XML={quote(xml_request)}"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(api_url, timeout=self.config.timeout_seconds) as response:
                    if response.status != 200:
                        return LabelResponse(
                            labels=[],
                            carrier="USPS",
                            total_cost=0.0,
                            shipment_id="",
                            errors=[f"USPS API error: HTTP {response.status}"]
                        )
                    
                    response_text = await response.text()
                    
            # Parse the XML response
            labels, shipment_id, total_cost, errors = self._parse_label_response_xml(response_text, request)
            
            if not labels:
                return LabelResponse(
                    labels=[],
                    carrier="USPS",
                    total_cost=0.0,
                    shipment_id=shipment_id or "",
                    errors=errors or ["Failed to generate labels"]
                )
            
            return LabelResponse(
                labels=labels,
                carrier="USPS",
                total_cost=total_cost,
                currency="USD",
                shipment_id=shipment_id,
                estimated_delivery_date=datetime.now() + timedelta(days=3),  # Estimate
                errors=errors
            )
        except Exception as e:
            self.logger.error(f"Error creating USPS label: {str(e)}")
            return LabelResponse(
                labels=[],
                carrier="USPS",
                total_cost=0.0,
                shipment_id="",
                errors=[f"Failed to create label: {str(e)}"]
            )
    
    async def track_shipment(self, tracking_number: str) -> TrackingResponse:
        """
        Track a USPS shipment
        
        Args:
            tracking_number: The USPS tracking number
            
        Returns:
            TrackingResponse with tracking information
        """
        try:
            # Build the XML request for USPS Tracking API
            xml_request = f"""
            <TrackFieldRequest USERID="{self.username}">
                <TrackID ID="{tracking_number}"></TrackID>
            </TrackFieldRequest>
            """
            
            # Make the API call
            api_url = f"{self.api_base_url}?API=TrackV2&XML={quote(xml_request)}"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(api_url, timeout=self.config.timeout_seconds) as response:
                    if response.status != 200:
                        return TrackingResponse(
                            tracking_number=tracking_number,
                            carrier="USPS",
                            status=TrackingStatus.UNKNOWN,
                            events=[],
                            errors=[f"USPS API error: HTTP {response.status}"]
                        )
                    
                    response_text = await response.text()
                    
            # Parse the XML response
            status, events, delivered_at, estimated_delivery, errors = self._parse_tracking_response_xml(response_text)
            
            # Get the last event
            last_event = events[0] if events else None
            
            return TrackingResponse(
                tracking_number=tracking_number,
                carrier="USPS",
                status=status,
                events=events,
                last_event=last_event,
                delivered_at=delivered_at,
                estimated_delivery_date=estimated_delivery,
                errors=errors
            )
        except Exception as e:
            self.logger.error(f"Error tracking USPS shipment: {str(e)}")
            return TrackingResponse(
                tracking_number=tracking_number,
                carrier="USPS",
                status=TrackingStatus.UNKNOWN,
                events=[],
                errors=[f"Failed to track shipment: {str(e)}"]
            )
    
    async def validate_address(self, request: ValidationRequest) -> ValidationResponse:
        """
        Validate an address with USPS
        
        Args:
            request: The address validation request
            
        Returns:
            ValidationResponse with validation results
        """
        try:
            # Build the XML request for USPS Address Validation API
            address = request.address
            xml_request = f"""
            <AddressValidateRequest USERID="{self.username}">
                <Address ID="0">
                    <Address1>{address.street2 or ''}</Address1>
                    <Address2>{address.street1}</Address2>
                    <City>{address.city}</City>
                    <State>{address.state}</State>
                    <Zip5>{address.postal_code[:5]}</Zip5>
                    <Zip4>{address.postal_code[6:] if len(address.postal_code) > 5 else ''}</Zip4>
                </Address>
            </AddressValidateRequest>
            """
            
            # Make the API call
            api_url = f"{self.api_base_url}?API=Verify&XML={quote(xml_request)}"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(api_url, timeout=self.config.timeout_seconds) as response:
                    if response.status != 200:
                        return ValidationResponse(
                            is_valid=False,
                            errors=[f"USPS API error: HTTP {response.status}"]
                        )
                    
                    response_text = await response.text()
                    
            # Parse the XML response
            is_valid, normalized_address, errors = self._parse_address_validation_response(response_text, request.address)
            
            return ValidationResponse(
                is_valid=is_valid,
                normalized_address=normalized_address,
                errors=errors
            )
        except Exception as e:
            self.logger.error(f"Error validating address with USPS: {str(e)}")
            return ValidationResponse(
                is_valid=False,
                errors=[f"Failed to validate address: {str(e)}"]
            )
    
    def get_available_services(self) -> List[ShippingService]:
        """
        Get available USPS shipping services
        
        Returns:
            List of available shipping services
        """
        services = []
        
        for code, name in self.SERVICE_CODES.items():
            transit_days = None
            guaranteed = False
            
            if "EXPRESS" in code:
                transit_days = 1
                guaranteed = True
            elif "PRIORITY" in code:
                transit_days = 3
                guaranteed = False
            elif "FIRST" in code:
                transit_days = 5
                guaranteed = False
            
            service = ShippingService(
                code=code,
                name=name,
                carrier="USPS",
                transit_days=transit_days,
                guaranteed_delivery=guaranteed
            )
            
            services.append(service)
        
        return services
    
    # Private helper methods for XML handling
    
    def _build_rate_request_xml(self, request: ShippingRateRequest) -> str:
        """Build XML for rate requests"""
        # Implementation details would go here
        # This is a simplified version
        return f"""
        <RateV4Request USERID="{self.username}">
            <Revision>2</Revision>
            <Package ID="1">
                <Service>ALL</Service>
                <ZipOrigination>{request.origin.postal_code[:5]}</ZipOrigination>
                <ZipDestination>{request.destination.postal_code[:5]}</ZipDestination>
                <Pounds>{int(request.packages[0].weight)}</Pounds>
                <Ounces>{(request.packages[0].weight % 1) * 16}</Ounces>
                <Container></Container>
                <Size>REGULAR</Size>
                <Width>{request.packages[0].width}</Width>
                <Length>{request.packages[0].length}</Length>
                <Height>{request.packages[0].height}</Height>
                <Machinable>true</Machinable>
            </Package>
        </RateV4Request>
        """
    
    def _parse_rate_response_xml(self, xml_string: str, request: ShippingRateRequest) -> tuple:
        """Parse XML response for rates"""
        # Implementation details would go here
        # This is a simplified version
        try:
            root = ET.fromstring(xml_string)
            rates = []
            errors = []
            
            # Check for errors
            error_elements = root.findall('.//Error')
            if error_elements:
                for error in error_elements:
                    description = error.find('Description')
                    if description is not None and description.text:
                        errors.append(description.text)
                return [], errors
            
            # Parse rates
            for postage in root.findall('.//Postage'):
                service_code = None
                service_name = None
                mail_service = postage.find('MailService')
                if mail_service is not None and mail_service.text:
                    service_name = mail_service.text
                    # Map service name to code
                    for code, name in self.SERVICE_CODES.items():
                        if name in service_name:
                            service_code = code
                            break
                
                if not service_code:
                    continue
                    
                rate_element = postage.find('Rate')
                if rate_element is not None and rate_element.text:
                    try:
                        rate_value = float(rate_element.text)
                        
                        # Create a service object
                        service = ShippingService(
                            code=service_code,
                            name=service_name,
                            carrier="USPS",
                            transit_days=3 if "Priority" in service_name else 5
                        )
                        
                        # Create a rate object
                        shipping_rate = ShippingRate(
                            service=service,
                            base_rate=rate_value,
                            total_rate=rate_value,
                            currency="USD"
                        )
                        
                        rates.append(shipping_rate)
                    except ValueError:
                        continue
            
            return rates, errors
            
        except Exception as e:
            return [], [f"Error parsing rate response: {str(e)}"]
    
    def _build_label_request_xml(self, request: LabelRequest) -> str:
        """Build XML for label requests"""
        # Implementation details would go here
        return "<LabelRequest>...</LabelRequest>"  # Simplified
    
    def _parse_label_response_xml(self, xml_string: str, request: LabelRequest) -> tuple:
        """Parse XML response for labels"""
        # Implementation details would go here
        # This is a simplified placeholder
        
        # In a real implementation, we would parse the XML and extract:
        # - tracking numbers
        # - label URLs
        # - costs
        # - shipment IDs
        
        # Returning mock data for now
        package_label = PackageLabel(
            tracking_number="9400123456789012345678",
            label_url="https://example.com/labels/usps_label.pdf",
            carrier="USPS",
            service_code=request.service_code,
            label_format=request.format,
            shipment_id="USPS123456789",
            package_dimensions=request.packages[0],
            created_at=datetime.now()
        )
        
        return [package_label], "USPS123456789", 10.99, None
    
    def _parse_tracking_response_xml(self, xml_string: str) -> tuple:
        """Parse XML response for tracking"""
        # Implementation details would go here
        # This is a simplified placeholder
        
        # In a real implementation, we would parse the XML and extract:
        # - tracking status
        # - tracking events
        # - delivery dates
        
        status = TrackingStatus.TRANSIT
        events = [
            TrackingEvent(
                timestamp=datetime.now() - timedelta(days=1),
                status=TrackingStatus.TRANSIT,
                location="Los Angeles, CA",
                description="Package in transit"
            )
        ]
        delivered_at = None
        estimated_delivery = datetime.now() + timedelta(days=2)
        errors = None
        
        return status, events, delivered_at, estimated_delivery, errors
    
    def _parse_address_validation_response(self, xml_string: str, original_address) -> tuple:
        """Parse XML response for address validation"""
        # Implementation details would go here
        # This is a simplified placeholder
        
        # In a real implementation, we would parse the XML and determine:
        # - if the address is valid
        # - the normalized address if valid
        # - any errors or suggestions
        
        is_valid = True
        normalized_address = original_address
        errors = None
        
        return is_valid, normalized_address, errors
