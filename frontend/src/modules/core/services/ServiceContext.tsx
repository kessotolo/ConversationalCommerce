'use client';

import { createContext, useEffect, useState } from 'react';

import type { ServiceRegistry } from './ServiceRegistry';
import type { ReactNode } from 'react';

/**
 * React context for accessing services
 * Ensures proper 'use client' directive for Next.js App Router
 */
export const ServiceContext = createContext<ServiceRegistry | null>(null);

interface ServiceProviderProps {
  children: ReactNode;
  serviceRegistry: ServiceRegistry;
}

/**
 * Provider component for making services available to React components
 */
export function ServiceProvider({ children, serviceRegistry }: ServiceProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    setIsInitialized(true);

    // Cleanup when component unmounts
    return () => {
      serviceRegistry.cleanupAll();
    };
  }, [serviceRegistry]);

  if (!isInitialized) {
    // Simple loading state until services are initialized
    return <div className="service-loading">Initializing services...</div>;
  }

  return <ServiceContext.Provider value={serviceRegistry}>{children}</ServiceContext.Provider>;
}
