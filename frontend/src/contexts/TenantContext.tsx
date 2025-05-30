import React, { createContext, useContext, useEffect, useState } from 'react';

interface Tenant {
  id: string; // UUID format from backend
  name: string;
  subdomain: string;
  customDomain?: string;
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
        
        // Check for tenant information in cookies (set by middleware)
        const getCookie = (name: string): string | null => {
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) {
            return parts.pop()?.split(';').shift() || null;
          }
          return null;
        };
        
        const tenantIdentifier = getCookie('tenant_identifier') || 'default';
        const identifierType = getCookie('tenant_identifier_type') || 'subdomain';
        
        // Determine which API endpoint to use based on identifier type
        let apiUrl: string;
        
        if (identifierType === 'subdomain') {
          apiUrl = `/api/tenants/by-subdomain/${tenantIdentifier}`;
        } else {
          // Custom domain lookup
          apiUrl = `/api/tenants/by-domain/${encodeURIComponent(tenantIdentifier)}`;
        }
        
        // Fallback for development environment
        if (!tenantIdentifier || tenantIdentifier === 'null') {
          // Check URL query parameters for development mode
          const urlParams = new URLSearchParams(window.location.search);
          const subdomainParam = urlParams.get('subdomain');
          
          if (subdomainParam) {
            apiUrl = `/api/tenants/by-subdomain/${subdomainParam}`;
          } else {
            apiUrl = `/api/tenants/by-subdomain/default`;
          }
        }
        
        // Fetch tenant data from API
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to load tenant: ${response.statusText}`);
        }
        
        const tenantData = await response.json();
        setTenant(tenantData);
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
    <TenantContext.Provider value={{ tenant, isLoading, error }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => useContext(TenantContext);
