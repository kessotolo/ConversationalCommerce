"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { usePathname, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/modules/core/hooks/useAuth';

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
  // Add logo and color theme for UI customization
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
}

export type TenantContextMode = 'admin' | 'storefront' | 'unknown';

interface TenantContextType {
  tenant: Tenant | null;
  isLoading: boolean;
  error: Error | null;
  mode: TenantContextMode;
  merchantId: string | null;
  refreshTenant: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  isLoading: true,
  error: null,
  mode: 'unknown',
  merchantId: null,
  refreshTenant: async () => { }, // Default no-op implementation
});

interface TenantProviderProps {
  children: React.ReactNode;
}

export const TenantProvider: React.FC<TenantProviderProps> = ({ children }) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [mode, setMode] = useState<TenantContextMode>('unknown');
  const [merchantId, setMerchantId] = useState<string | null>(null);

  const pathname = usePathname();
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const userId = user?.id;

  // Determine the current context mode and merchant ID
  useEffect(() => {
    // Check if we're in the admin context
    const isAdminPath = pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin');

    // Check if we're in a merchant-specific route (/store/[merchantId])
    const storeParam = params?.merchantId || searchParams?.get('merchant');

    // Get merchant ID from the header if available (set by middleware)
    const getMerchantIdFromHeader = async () => {
      try {
        // In a real app, you might use a cookie or a server component to access the header
        // For client components, we'll use a dedicated endpoint
        const res = await fetch('/api/context/merchant-id');
        if (res.ok) {
          const { merchantId } = await res.json();
          return merchantId || null;
        }
        return null;
      } catch (err) {
        console.error('Error getting merchant ID from header:', err);
        return null;
      }
    };

    const detectContext = async () => {
      // Try to get merchant ID from different sources in order of priority
      const headerMerchantId = await getMerchantIdFromHeader();
      const contextMerchantId = headerMerchantId || storeParam || null;

      setMerchantId(contextMerchantId);

      // Determine the mode based on the path and merchant ID
      if (isAdminPath) {
        setMode('admin');
      } else if (contextMerchantId) {
        setMode('storefront');
      } else {
        setMode('unknown');
      }
    };

    detectContext();
  }, [pathname, params, searchParams]);

  // Fetch tenant data based on the determined mode and merchant ID
  const fetchTenant = useCallback(async () => {
    if (!merchantId && !userId) {
      setTenant(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      let endpoint;

      // Different endpoints based on context
      if (mode === 'admin') {
        // For admin, fetch the tenant associated with the user, or the specified merchant
        endpoint = merchantId
          ? `/api/v1/admin/tenants/${merchantId}`
          : `/api/v1/users/has-tenant?user_id=${userId}`;
      } else if (mode === 'storefront') {
        // For storefront, always fetch by merchant ID
        endpoint = `/api/v1/storefront/tenants/by-subdomain/${merchantId}`;
      } else {
        // Unknown mode, try user's tenant as fallback
        endpoint = userId ? `/api/v1/users/has-tenant?user_id=${userId}` : null;
      }

      if (!endpoint) {
        setTenant(null);
        setIsLoading(false);
        return;
      }

      const res = await fetch(endpoint);
      if (!res.ok) {
        if (res.status === 404) {
          // Tenant not found is a valid state, not an error
          setTenant(null);
        } else {
          throw new Error(`Failed to fetch tenant: ${res.status}`);
        }
      } else {
        const tenantData = await res.json();
        setTenant(tenantData);
      }
    } catch (err) {
      console.error('Error fetching tenant:', err);
      setError(err instanceof Error ? err : new Error('Unknown error fetching tenant'));
      setTenant(null);
    } finally {
      setIsLoading(false);
    }
  }, [merchantId, userId, mode]);

  // Fetch tenant when dependencies change
  useEffect(() => {
    fetchTenant();
  }, [fetchTenant]);

  return (
    <TenantContext.Provider
      value={{
        tenant,
        isLoading,
        error,
        mode,
        merchantId,
        refreshTenant: fetchTenant
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => useContext(TenantContext);
