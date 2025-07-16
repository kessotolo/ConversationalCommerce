/**
 * Dashboard Service
 * Connects to real backend API endpoints for dashboard data
 */

import { api } from '@/lib/axios';
import type { AxiosResponse } from 'axios';

export interface DashboardStats {
    totalOrders: number;
    revenue: number;
    totalProducts: number;
    totalCustomers: number;
    revenueGrowth?: number;
    ordersGrowth?: number;
    customersGrowth?: number;
}

export interface DashboardActivity {
    id: string;
    type: string;
    title: string;
    description: string;
    timestamp: string;
    severity: 'info' | 'warning' | 'error' | 'success';
    metadata?: Record<string, any>;
}

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

class DashboardService {
    /**
     * Get dashboard statistics for merchant
     */
    async getDashboardStats(merchantId: string): Promise<DashboardStats> {
        try {
            const response: AxiosResponse<any> = await api.get(`/api/v1/admin/dashboard/stats?merchant_id=${merchantId}`);

            // Transform backend response to match frontend interface
            return {
                totalOrders: response.data.total_orders || 0,
                revenue: response.data.total_revenue || 0,
                totalProducts: response.data.total_products || 0,
                totalCustomers: response.data.total_customers || 0,
                revenueGrowth: response.data.revenue_growth,
                ordersGrowth: response.data.orders_growth,
                customersGrowth: response.data.customers_growth,
            };
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            throw new Error('Failed to fetch dashboard statistics');
        }
    }

    /**
     * Get comprehensive dashboard metrics (for admin dashboard)
     */
    async getDashboardMetrics(): Promise<DashboardMetrics> {
        try {
            const response: AxiosResponse<DashboardMetrics> = await api.get('/api/v1/admin/dashboard/metrics');
            return response.data;
        } catch (error) {
            console.error('Error fetching dashboard metrics:', error);
            throw new Error('Failed to fetch dashboard metrics');
        }
    }

    /**
     * Get recent dashboard activity
     */
    async getRecentActivity(limit: number = 10): Promise<DashboardActivity[]> {
        try {
            const response: AxiosResponse<{ activities: DashboardActivity[] }> = await api.get(`/api/v1/admin/dashboard/recent-activity?limit=${limit}`);
            return response.data.activities || [];
        } catch (error) {
            console.error('Error fetching recent activity:', error);
            throw new Error('Failed to fetch recent activity');
        }
    }

    /**
     * Get system health status
     */
    async getSystemHealth(): Promise<any> {
        try {
            const response: AxiosResponse<any> = await api.get('/api/v1/admin/monitoring/health');
            return response.data;
        } catch (error) {
            console.error('Error fetching system health:', error);
            throw new Error('Failed to fetch system health');
        }
    }
}

// Export singleton instance
export const dashboardService = new DashboardService();
export default dashboardService;