/**
 * Admin API Service
 * Handles all API calls for the admin dashboard with proper authentication
 */

import { api } from './api';
import type { AxiosResponse } from 'axios';

export interface DashboardMetrics {
    tenant_metrics: {
        total_tenants: number;
        active_tenants: number;
        verified_tenants: number;
        new_tenants: number;
        growth_rate: number;
    };
    user_metrics: {
        total_users: number;
        active_users: number;
        new_users: number;
        active_in_period: number;
        retention_rate: number;
    };
    order_metrics: {
        total_orders: number;
        completed_orders: number;
        recent_orders: number;
        total_revenue: number;
        avg_order_value: number;
        completion_rate: number;
    };
    product_metrics: {
        total_products: number;
        active_products: number;
        new_products: number;
        total_inventory: number;
    };
    security_metrics: {
        successful_logins: number;
        failed_logins: number;
        security_violations: number;
        emergency_lockdowns: number;
        threat_level: string;
    };
    performance_metrics: {
        total_requests: number;
        avg_response_time: number;
        error_count: number;
        uptime_percentage: number;
    };
    last_updated: string;
}

export interface KPIs {
    total_tenants: number;
    active_tenants: number;
    total_users: number;
    active_users: number;
    total_orders: number;
    total_revenue: number;
    avg_daily_tenants: number;
    avg_daily_users: number;
    avg_daily_orders: number;
    avg_daily_revenue: number;
    system_health_score: number;
    security_score: number;
    errors_today: number;
    security_events_today: number;
    lockdowns_today: number;
}

export interface SystemHealth {
    overall_status: string;
    uptime_percentage: number;
    database_status: string;
    database_response_time: number;
    api_response_time: number;
    error_rate: number;
    memory_usage: number;
    cpu_usage: number;
    disk_usage: number;
    last_deployment: string;
    alerts_count: number;
    critical_alerts_count: number;
    services_status: Record<string, string>;
}

export interface Tenant {
    id: string;
    name: string;
    subdomain: string;
    custom_domain?: string;
    status: string;
    is_verified: boolean;
    admin_user_id: string;
    admin_user_name: string;
    admin_user_email: string;
    created_at: string;
    metrics?: {
        total_users: number;
        total_orders: number;
        total_revenue: number;
        active_users: number;
        order_completion_rate: number;
        avg_order_value: number;
    };
    health?: {
        status: string;
        uptime_percentage: number;
        last_activity: string;
        error_rate: number;
    };
}

export interface User {
    id: string;
    email: string;
    name: string;
    phone?: string;
    status: string;
    role: string;
    tenant_id: string;
    tenant_name: string;
    created_at: string;
    last_login?: string;
    metrics?: {
        total_orders: number;
        total_spent: number;
        avg_order_value: number;
        last_order_date?: string;
    };
}

export interface Order {
    id: string;
    order_number: string;
    customer_name: string;
    customer_email: string;
    tenant_id: string;
    tenant_name: string;
    status: string;
    total_amount: number;
    created_at: string;
    updated_at: string;
    items_count: number;
    payment_status: string;
}

class AdminApiService {
    /**
     * Get dashboard metrics
     */
    async getDashboardMetrics(): Promise<DashboardMetrics> {
        try {
            const response: AxiosResponse<DashboardMetrics> = await api.get('/api/admin/dashboard/metrics');
            return response.data;
        } catch (error) {
            console.error('Error fetching dashboard metrics:', error);
            throw new Error('Failed to fetch dashboard metrics');
        }
    }

    /**
     * Get dashboard KPIs
     */
    async getDashboardKPIs(): Promise<KPIs> {
        try {
            const response: AxiosResponse<KPIs> = await api.get('/api/admin/dashboard/kpis');
            return response.data;
        } catch (error) {
            console.error('Error fetching dashboard KPIs:', error);
            throw new Error('Failed to fetch dashboard KPIs');
        }
    }

    /**
     * Get system health status
     */
    async getSystemHealth(): Promise<SystemHealth> {
        try {
            const response: AxiosResponse<SystemHealth> = await api.get('/api/admin/dashboard/health');
            return response.data;
        } catch (error) {
            console.error('Error fetching system health:', error);
            throw new Error('Failed to fetch system health');
        }
    }

    /**
     * Get all tenants
     */
    async getTenants(params?: {
        status?: string;
        search?: string;
        limit?: number;
        offset?: number;
    }): Promise<Tenant[]> {
        try {
            const queryParams = new URLSearchParams();

            if (params?.status) queryParams.append('status', params.status);
            if (params?.search) queryParams.append('search', params.search);
            if (params?.limit) queryParams.append('limit', params.limit.toString());
            if (params?.offset) queryParams.append('offset', params.offset.toString());

            const response: AxiosResponse<Tenant[]> = await api.get(`/api/admin/tenants?${queryParams.toString()}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching tenants:', error);
            throw new Error('Failed to fetch tenants');
        }
    }

    /**
     * Get all users
     */
    async getUsers(params?: {
        status?: string;
        role?: string;
        search?: string;
        limit?: number;
        offset?: number;
    }): Promise<User[]> {
        try {
            const queryParams = new URLSearchParams();

            if (params?.status) queryParams.append('status', params.status);
            if (params?.role) queryParams.append('role', params.role);
            if (params?.search) queryParams.append('search', params.search);
            if (params?.limit) queryParams.append('limit', params.limit.toString());
            if (params?.offset) queryParams.append('offset', params.offset.toString());

            const response: AxiosResponse<User[]> = await api.get(`/api/admin/users?${queryParams.toString()}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching users:', error);
            throw new Error('Failed to fetch users');
        }
    }

    /**
     * Get all orders
     */
    async getOrders(params?: {
        status?: string;
        search?: string;
        tenant_id?: string;
        limit?: number;
        offset?: number;
    }): Promise<Order[]> {
        try {
            const queryParams = new URLSearchParams();

            if (params?.status) queryParams.append('status', params.status);
            if (params?.search) queryParams.append('search', params.search);
            if (params?.tenant_id) queryParams.append('tenant_id', params.tenant_id);
            if (params?.limit) queryParams.append('limit', params.limit.toString());
            if (params?.offset) queryParams.append('offset', params.offset.toString());

            const response: AxiosResponse<Order[]> = await api.get(`/api/admin/orders?${queryParams.toString()}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching orders:', error);
            throw new Error('Failed to fetch orders');
        }
    }

    /**
     * Update tenant status
     */
    async updateTenantStatus(tenantId: string, status: string): Promise<Tenant> {
        try {
            const response: AxiosResponse<Tenant> = await api.put(`/api/admin/tenants/${tenantId}`, { status });
            return response.data;
        } catch (error) {
            console.error('Error updating tenant status:', error);
            throw new Error('Failed to update tenant status');
        }
    }

    /**
     * Update user status
     */
    async updateUserStatus(userId: string, status: string): Promise<User> {
        try {
            const response: AxiosResponse<User> = await api.put(`/api/admin/users/${userId}`, { status });
            return response.data;
        } catch (error) {
            console.error('Error updating user status:', error);
            throw new Error('Failed to update user status');
        }
    }

    /**
     * Get analytics data
     */
    async getAnalytics(timeRange: string = '30d'): Promise<any> {
        try {
            const response: AxiosResponse<any> = await api.get(`/api/admin/analytics?range=${timeRange}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching analytics:', error);
            throw new Error('Failed to fetch analytics');
        }
    }
}

// Export singleton instance
export const adminApiService = new AdminApiService();
export default adminApiService;