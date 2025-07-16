/**
 * Tenant Service
 * Connects to real backend API endpoints for tenant/subdomain management
 */

import { api } from '@/lib/axios';
import type { AxiosResponse } from 'axios';

export interface Tenant {
    id: string;
    name: string;
    subdomain: string;
    display_name?: string;
    is_active: boolean;
    store_url: string;
    admin_url: string;
    custom_domain?: string;
    status?: string;
    is_verified?: boolean;
    created_at?: string;
    admin_user_id?: string;
    admin_user_name?: string;
    admin_user_email?: string;
}

export interface TenantMetrics {
    total_users: number;
    total_orders: number;
    total_revenue: number;
    active_users: number;
    order_completion_rate: number;
    avg_order_value: number;
}

export interface TenantWithMetrics extends Tenant {
    metrics?: TenantMetrics;
}

export interface CreateTenantData {
    name: string;
    subdomain: string;
    display_name?: string;
    admin_email: string;
}

export interface UpdateTenantData {
    name?: string;
    display_name?: string;
    custom_domain?: string;
    is_active?: boolean;
}

class TenantService {
    /**
     * Get tenant information by subdomain
     */
    async getTenantBySubdomain(subdomain: string): Promise<Tenant> {
        try {
            const response: AxiosResponse<Tenant> = await api.get(`/api/v1/tenants/subdomain/${subdomain}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching tenant by subdomain:', error);
            throw new Error('Failed to fetch tenant information');
        }
    }

    /**
     * Check if subdomain is available
     */
    async checkSubdomainAvailability(subdomain: string): Promise<{ available: boolean; suggestions?: string[] }> {
        try {
            const response: AxiosResponse<{ available: boolean; suggestions?: string[] }> =
                await api.get(`/api/v1/tenants/check-subdomain?subdomain=${subdomain}`);
            return response.data;
        } catch (error) {
            console.error('Error checking subdomain availability:', error);
            throw new Error('Failed to check subdomain availability');
        }
    }

    /**
     * Get all tenants (admin view)
     */
    async getAllTenants(params?: {
        status?: string;
        search?: string;
        limit?: number;
        offset?: number;
    }): Promise<TenantWithMetrics[]> {
        try {
            const queryParams = new URLSearchParams();

            if (params?.status) queryParams.append('status', params.status);
            if (params?.search) queryParams.append('search', params.search);
            if (params?.limit) queryParams.append('limit', params.limit.toString());
            if (params?.offset) queryParams.append('offset', params.offset.toString());

            const response: AxiosResponse<TenantWithMetrics[]> =
                await api.get(`/api/v1/tenants?${queryParams.toString()}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching tenants:', error);
            throw new Error('Failed to fetch tenants');
        }
    }

    /**
     * Get tenant details by ID (admin view)
     */
    async getTenant(tenantId: string): Promise<TenantWithMetrics> {
        try {
            const response: AxiosResponse<TenantWithMetrics> = await api.get(`/api/v1/tenants/${tenantId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching tenant:', error);
            throw new Error('Failed to fetch tenant details');
        }
    }

    /**
     * Create a new tenant
     */
    async createTenant(tenantData: CreateTenantData): Promise<Tenant> {
        try {
            const response: AxiosResponse<Tenant> = await api.post('/api/v1/tenants', tenantData);
            return response.data;
        } catch (error) {
            console.error('Error creating tenant:', error);
            throw new Error('Failed to create tenant');
        }
    }

    /**
     * Update tenant information
     */
    async updateTenant(tenantId: string, updateData: UpdateTenantData): Promise<Tenant> {
        try {
            const response: AxiosResponse<Tenant> = await api.put(`/api/v1/tenants/${tenantId}`, updateData);
            return response.data;
        } catch (error) {
            console.error('Error updating tenant:', error);
            throw new Error('Failed to update tenant');
        }
    }

    /**
     * Delete a tenant (admin only)
     */
    async deleteTenant(tenantId: string): Promise<void> {
        try {
            await api.delete(`/api/v1/tenants/${tenantId}`);
        } catch (error) {
            console.error('Error deleting tenant:', error);
            throw new Error('Failed to delete tenant');
        }
    }

    /**
     * Activate/deactivate tenant
     */
    async setTenantStatus(tenantId: string, isActive: boolean): Promise<Tenant> {
        try {
            const response: AxiosResponse<Tenant> = await api.put(`/api/v1/tenants/${tenantId}`, {
                is_active: isActive
            });
            return response.data;
        } catch (error) {
            console.error('Error updating tenant status:', error);
            throw new Error('Failed to update tenant status');
        }
    }

    /**
     * Get current tenant from context (client-side)
     */
    getCurrentTenant(): Tenant | null {
        if (typeof window === 'undefined') return null;

        const hostname = window.location.hostname;
        const subdomain = hostname.split('.')[0];

        // Check if this is a merchant subdomain
        if (hostname !== 'localhost' && hostname !== '127.0.0.1' &&
            subdomain !== 'app' && subdomain !== 'admin') {
            // Return basic tenant info, should be enriched by API call
            return {
                id: subdomain || '',
                name: subdomain || '',
                subdomain: subdomain || '',
                is_active: true,
                store_url: hostname || '',
                admin_url: `admin.enwhe.io/store/${subdomain || ''}/`
            };
        }

        return null;
    }

    /**
     * Get tenant context from URL or headers
     */
    async resolveTenantFromContext(): Promise<Tenant | null> {
        const currentTenant = this.getCurrentTenant();

        if (currentTenant?.subdomain) {
            try {
                return await this.getTenantBySubdomain(currentTenant.subdomain);
            } catch (error) {
                console.warn('Could not resolve tenant from context:', error);
                return currentTenant; // Return basic info as fallback
            }
        }

        return null;
    }
}

// Export singleton instance
export const tenantService = new TenantService();
export default tenantService;