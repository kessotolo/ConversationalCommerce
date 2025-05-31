'use client';

/**
 * Service Provider Component
 * 
 * This component provides access to all services via React Context.
 * It initializes the services when the application starts and makes
 * them available to all components in the component tree.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializeServices, ServiceTypes, useServices } from '../services/service-initializer';
import { IServiceRegistry } from '../services/service-registry';

// Create context for service registry
const ServiceRegistryContext = createContext<IServiceRegistry | null>(null);

/**
 * Service provider props
 */
interface ServiceProviderProps {
  children: React.ReactNode;
}

/**
 * Service Provider Component
 * Initializes services and provides them to child components
 */
export const ServiceProvider: React.FC<ServiceProviderProps> = ({ children }) => {
  const [registry, setRegistry] = useState<IServiceRegistry | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize services on component mount
  useEffect(() => {
    if (!isInitialized) {
      const serviceRegistry = initializeServices();
      setRegistry(serviceRegistry);
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // Don't render children until services are initialized
  if (!isInitialized || !registry) {
    return <div>Initializing services...</div>;
  }

  return (
    <ServiceRegistryContext.Provider value={registry}>
      {children}
    </ServiceRegistryContext.Provider>
  );
};

/**
 * Hook for accessing the service registry
 */
export function useServiceRegistry(): IServiceRegistry {
  const registry = useContext(ServiceRegistryContext);
  
  if (!registry) {
    throw new Error('useServiceRegistry must be used within a ServiceProvider');
  }
  
  return registry;
}

/**
 * Hook for accessing a specific service
 * @param serviceType The service type to retrieve
 */
export function useService<T>(serviceType: string): T {
  const registry = useServiceRegistry();
  return registry.get<T>(serviceType);
}

/**
 * Hook for accessing tenant service
 */
export function useTenantService() {
  return useService(ServiceTypes.TENANT_SERVICE);
}

/**
 * Hook for accessing conversation service
 */
export function useConversationService() {
  return useService(ServiceTypes.CONVERSATION_SERVICE);
}

/**
 * Hook for accessing product service
 */
export function useProductService() {
  return useService(ServiceTypes.PRODUCT_SERVICE);
}

/**
 * Hook for accessing order service
 */
export function useOrderService() {
  return useService(ServiceTypes.ORDER_SERVICE);
}

// Re-export services hook for convenience
export { useServices };
