import React, { createContext, useContext, useEffect, useState } from 'react';

export interface Tenant {
  id: string; // UUID format from backend
  name: string;
  subdomain: string;
  customDomain?: string;
  phone_number: string;
  whatsapp_number?: string;
  email?: string;
  kyc_status?: 'pending' | 'verified' | 'rejected';
  country_code?: string;
}

interface TenantContextType {
  tenant: Tenant | null;
  isLoading: boolean;
  error: Error | null;
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  isLoading: true,
  error: null,
});

interface TenantProviderProps {
  children: React.ReactNode;
}

export const TenantProvider: React.FC<TenantProviderProps> = ({ children }) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchTenant = async () => {
      try {
        setIsLoading(true);

        // For development, create a mock tenant
        // In production, this would fetch from the API
        const mockTenant: Tenant = {
          id: 'mock-tenant-id',
          name: 'Demo Store',
          subdomain: 'demo',
          phone_number: '+1234567890',
          whatsapp_number: '+1234567890',
          email: 'demo@example.com',
          kyc_status: 'verified',
          country_code: 'US'
        };

        setTenant(mockTenant);
      } catch (err) {
        console.error('Error fetching tenant:', err);
        setError(err instanceof Error ? err : new Error('Unknown error fetching tenant'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchTenant();
  }, []);

  return (
    <TenantContext.Provider value={{ tenant, isLoading, error }}>{children}</TenantContext.Provider>
  );
};

export const useTenant = () => useContext(TenantContext);
