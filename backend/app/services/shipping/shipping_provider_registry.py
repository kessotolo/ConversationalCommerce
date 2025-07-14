from typing import Dict, List, Optional, Type, Any
import logging
from fastapi import HTTPException

from app.services.shipping.providers.base_provider import (
    ShippingProviderInterface,
    ShippingProviderConfig
)
from app.services.shipping.providers.usps_provider import USPSProvider, USPSConfig


class ShippingProviderRegistry:
    """
    Registry service for shipping providers.
    Provides a centralized way to register, access, and manage shipping providers.
    """
    
    def __init__(self):
        self._providers: Dict[str, Type[ShippingProviderInterface]] = {}
        self._provider_configs: Dict[str, Type[ShippingProviderConfig]] = {}
        self._instances: Dict[str, ShippingProviderInterface] = {}
        self.logger = logging.getLogger(__name__)
        
        # Register built-in providers
        self.register_provider("usps", USPSProvider, USPSConfig)
        
    def register_provider(
        self, 
        provider_id: str, 
        provider_class: Type[ShippingProviderInterface],
        config_class: Type[ShippingProviderConfig]
    ) -> None:
        """
        Register a new shipping provider
        
        Args:
            provider_id: Unique identifier for the provider
            provider_class: The provider implementation class
            config_class: The provider configuration class
        """
        self._providers[provider_id] = provider_class
        self._provider_configs[provider_id] = config_class
        self.logger.info(f"Registered shipping provider: {provider_id}")
        
    def unregister_provider(self, provider_id: str) -> None:
        """
        Unregister a shipping provider
        
        Args:
            provider_id: Unique identifier for the provider
        """
        if provider_id in self._providers:
            del self._providers[provider_id]
            del self._provider_configs[provider_id]
            if provider_id in self._instances:
                del self._instances[provider_id]
            self.logger.info(f"Unregistered shipping provider: {provider_id}")
        
    def get_provider(self, provider_id: str, config: Optional[Dict[str, Any]] = None) -> ShippingProviderInterface:
        """
        Get a shipping provider instance
        
        Args:
            provider_id: Unique identifier for the provider
            config: Optional configuration for the provider instance
            
        Returns:
            Initialized shipping provider instance
            
        Raises:
            HTTPException: If provider is not found
        """
        if provider_id not in self._providers:
            raise HTTPException(
                status_code=404, 
                detail=f"Shipping provider '{provider_id}' not found"
            )
            
        # If we have a cached instance and no new config, return the cached instance
        if provider_id in self._instances and config is None:
            return self._instances[provider_id]
            
        # Create and configure a new instance
        provider_class = self._providers[provider_id]
        config_class = self._provider_configs[provider_id]
        
        if config is None:
            config = {}
            
        # Ensure provider_name is set in the config
        if "provider_name" not in config:
            config["provider_name"] = provider_id
            
        # Create configuration instance
        provider_config = config_class(**config)
        
        # Create provider instance
        provider_instance = provider_class(provider_config)
        
        # Cache the instance
        self._instances[provider_id] = provider_instance
        
        return provider_instance
        
    def list_available_providers(self) -> List[str]:
        """
        List all registered shipping providers
        
        Returns:
            List of provider IDs
        """
        return list(self._providers.keys())
        
    def get_config_schema(self, provider_id: str) -> Dict[str, Any]:
        """
        Get the configuration schema for a shipping provider
        
        Args:
            provider_id: Unique identifier for the provider
            
        Returns:
            Configuration schema
            
        Raises:
            HTTPException: If provider is not found
        """
        if provider_id not in self._provider_configs:
            raise HTTPException(
                status_code=404, 
                detail=f"Shipping provider '{provider_id}' not found"
            )
            
        config_class = self._provider_configs[provider_id]
        return config_class.schema()


# Global singleton instance of the provider registry
shipping_provider_registry = ShippingProviderRegistry()
