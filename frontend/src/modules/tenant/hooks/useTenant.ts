/**
 * Custom hook for tenant management and context
 * Provides tenant information, loading states, and error handling
 */

import { useState, useEffect } from 'react';
import { api } from '@/lib/axios';

export interface Tenant {
    id: string;
    name: string;
    subdomain: string;
    domain?: string;
    status: 'active' | 'inactive' | 'suspended';
    subscription_tier: 'free' | 'pro' | 'enterprise';
    business_name?: string;
    contact_email?: string;
    phone?: string;
    address?: {
        street: string;
        city: string;
        state: string;
        country: string;
        postal_code: string;
    };
    settings?: {
        theme: string;
        currency: string;
        timezone: string;
        language: string;
    };
    created_at: string;
    updated_at: string;
}

interface UseTenantReturn {
    tenant: Tenant | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    updateTenant: (updates: Partial<Tenant>) => Promise<Tenant | null>;
}

export function useTenant(tenantId?: string): UseTenantReturn {
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTenant = async (id?: string) => {
        try {
            setLoading(true);
            setError(null);

            let endpoint = '/api/v1/tenants/me';

            if (id) {
                endpoint = `/api/v1/tenants/${id}`;
            } else if (typeof window !== 'undefined') {
                // Try to get tenant from subdomain
                const hostname = window.location.hostname;
                const subdomain = hostname.split('.')[0];

                if (hostname !== 'localhost' && hostname !== '127.0.0.1' && subdomain !== 'app' && subdomain !== 'admin') {
                    endpoint = `/api/v1/tenants/subdomain/${subdomain}`;
                }
            }

            const response = await api.get<Tenant>(endpoint);
            setTenant(response.data);
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch tenant';
            setError(errorMessage);
            console.error('Error fetching tenant:', err);
        } finally {
            setLoading(false);
        }
    };

    const updateTenant = async (updates: Partial<Tenant>): Promise<Tenant | null> => {
        try {
            setError(null);

            const response = await api.patch<Tenant>('/api/v1/tenants/me', updates);
            const updatedTenant = response.data;

            setTenant(updatedTenant);
            return updatedTenant;
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || 'Failed to update tenant';
            setError(errorMessage);
            console.error('Error updating tenant:', err);
            return null;
        }
    };

    const refetch = async () => {
        await fetchTenant(tenantId);
    };

    useEffect(() => {
        fetchTenant(tenantId);
    }, [tenantId]);

    return {
        tenant,
        loading,
        error,
        refetch,
        updateTenant,
    };
}

// Helper hook for current tenant context
export function useCurrentTenant(): UseTenantReturn {
    return useTenant();
}

// Helper hook to check if user is tenant admin
export function useTenantAdmin(tenantId?: string): {
    isAdmin: boolean;
    loading: boolean;
    error: string | null;
} {
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const checkAdminStatus = async () => {
            try {
                setLoading(true);
                setError(null);

                const endpoint = tenantId
                    ? `/api/v1/tenants/${tenantId}/admin-status`
                    : '/api/v1/tenants/me/admin-status';

                const response = await api.get<{ is_admin: boolean }>(endpoint);
                setIsAdmin(response.data.is_admin);
            } catch (err: any) {
                const errorMessage = err.response?.data?.message || err.message || 'Failed to check admin status';
                setError(errorMessage);
                console.error('Error checking admin status:', err);
            } finally {
                setLoading(false);
            }
        };

        checkAdminStatus();
    }, [tenantId]);

    return { isAdmin, loading, error };
}