/**
 * Orders Service
 * Connects to real backend API endpoints for order management
 */

import { api } from '@/lib/axios';
import type { AxiosResponse } from 'axios';

export interface Order {
    id: string;
    order_number: string;
    customer_name: string;
    customer_email: string;
    tenant_id: string;
    tenant_name?: string;
    status: string;
    total_amount: number;
    created_at: string;
    updated_at: string;
    items_count: number;
    payment_status: string;
    items?: OrderItem[];
    shipping_address?: string;
    notes?: string;
}

export interface OrderItem {
    id: string;
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    name: string;
    created_at: string;
    updated_at: string;
}

export interface OrderStats {
    total_orders: number;
    total_revenue: number;
    average_order_value: number;
    recent_orders: number;
    orders_by_status: Record<string, number>;
    orders_by_source: Record<string, number>;
    period_days: number;
}

export interface CreateOrderData {
    product_id: string;
    buyer_name: string;
    buyer_phone: string;
    buyer_email?: string;
    buyer_address: string;
    quantity: number;
    total_amount: number;
    notes?: string;
    order_source: string;
}

export interface UpdateOrderData {
    status?: string;
    payment_status?: string;
    notes?: string;
    shipping_address?: string;
}

class OrdersService {
    /**
     * Get all orders for the current merchant
     */
    async getOrders(params?: {
        status?: string;
        order_source?: string;
        search?: string;
        limit?: number;
        offset?: number;
    }): Promise<Order[]> {
        try {
            const queryParams = new URLSearchParams();

            if (params?.status) queryParams.append('status', params.status);
            if (params?.order_source) queryParams.append('order_source', params.order_source);
            if (params?.search) queryParams.append('search', params.search);
            if (params?.limit) queryParams.append('limit', params.limit.toString());
            if (params?.offset) queryParams.append('offset', params.offset.toString());

            const response: AxiosResponse<Order[]> = await api.get(`/api/v1/admin/orders?${queryParams.toString()}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching orders:', error);
            throw new Error('Failed to fetch orders');
        }
    }

    /**
     * Get order statistics
     */
    async getOrderStats(periodDays: number = 30): Promise<OrderStats> {
        try {
            const response: AxiosResponse<OrderStats> = await api.get(`/api/v1/admin/orders/stats?period_days=${periodDays}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching order stats:', error);
            throw new Error('Failed to fetch order statistics');
        }
    }

    /**
     * Get a specific order by ID
     */
    async getOrder(orderId: string): Promise<Order> {
        try {
            const response: AxiosResponse<Order> = await api.get(`/api/v1/admin/orders/${orderId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching order:', error);
            throw new Error('Failed to fetch order details');
        }
    }

    /**
     * Create a new order
     */
    async createOrder(orderData: CreateOrderData): Promise<Order> {
        try {
            const response: AxiosResponse<Order> = await api.post('/api/v1/admin/orders', orderData);
            return response.data;
        } catch (error) {
            console.error('Error creating order:', error);
            throw new Error('Failed to create order');
        }
    }

    /**
     * Update an existing order
     */
    async updateOrder(orderId: string, updateData: UpdateOrderData): Promise<Order> {
        try {
            const response: AxiosResponse<Order> = await api.put(`/api/v1/admin/orders/${orderId}`, updateData);
            return response.data;
        } catch (error) {
            console.error('Error updating order:', error);
            throw new Error('Failed to update order');
        }
    }

    /**
     * Delete an order
     */
    async deleteOrder(orderId: string): Promise<void> {
        try {
            await api.delete(`/api/v1/admin/orders/${orderId}`);
        } catch (error) {
            console.error('Error deleting order:', error);
            throw new Error('Failed to delete order');
        }
    }

    /**
     * Update order status
     */
    async updateOrderStatus(orderId: string, status: string): Promise<Order> {
        try {
            const response: AxiosResponse<Order> = await api.put(`/api/v1/admin/orders/${orderId}`, { status });
            return response.data;
        } catch (error) {
            console.error('Error updating order status:', error);
            throw new Error('Failed to update order status');
        }
    }
}

// Export singleton instance
export const ordersService = new OrdersService();
export default ordersService;