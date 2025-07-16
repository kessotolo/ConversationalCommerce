/**
 * Tenant context hook for accessing tenant information from React context
 * Provides centralized tenant state management across the application
 */

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { Tenant, useTenant } from './useTenant';

interface TenantContextType {
    tenant: Tenant | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    updateTenant: (updates: Partial<Tenant>) => Promise<Tenant | null>;
    setTenant: (tenant: Tenant | null) => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

interface TenantProviderProps {
    children: ReactNode;
    tenantId?: string;
}

export function TenantProvider({ children, tenantId }: TenantProviderProps) {
    const tenantHook = useTenant(tenantId);
    const [tenant, setTenant] = useState<Tenant | null>(tenantHook.tenant);

    // Sync internal state with hook state
    useEffect(() => {
        setTenant(tenantHook.tenant);
    }, [tenantHook.tenant]);

    const contextValue: TenantContextType = {
        ...tenantHook,
        tenant,
        setTenant,
    };

    return React.createElement(
        TenantContext.Provider,
        { value: contextValue },
        children
    );
}

export function useTenantContext(): TenantContextType {
    const context = useContext(TenantContext);

    if (context === undefined) {
        throw new Error('useTenantContext must be used within a TenantProvider');
    }

    return context;
}

// Helper hook to get current tenant ID from context or URL
export function useTenantId(): string | null {
    const { tenant } = useTenantContext();

    if (tenant?.id) {
        return tenant.id;
    }

    // Fallback to subdomain extraction
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        const parts = hostname.split('.');
        const subdomain = parts[0];

        if (hostname !== 'localhost' && hostname !== '127.0.0.1' && subdomain && subdomain !== 'app' && subdomain !== 'admin') {
            return subdomain;
        }
    }

    return null;
}

// Helper hook to check if current user is tenant admin
export function useIsTenantAdmin(): boolean {
    const { tenant } = useTenantContext();
    // This would typically check user permissions from auth context
    // For now, return true if tenant exists (simplified)
    return Boolean(tenant);
}

// Helper hook to get tenant settings
export function useTenantSettings() {
    const { tenant, updateTenant } = useTenantContext();

    const updateSettings = async (newSettings: Partial<NonNullable<Tenant['settings']>>) => {
        if (!tenant) return null;

        const currentSettings = tenant.settings || {
            theme: 'light',
            currency: 'USD',
            timezone: 'UTC',
            language: 'en',
        };

        const updatedSettings = {
            ...currentSettings,
            ...newSettings,
        };

        return updateTenant({
            settings: updatedSettings,
        });
    };

    return {
        settings: tenant?.settings || {
            theme: 'light',
            currency: 'USD',
            timezone: 'UTC',
            language: 'en',
        },
        updateSettings,
    };
}