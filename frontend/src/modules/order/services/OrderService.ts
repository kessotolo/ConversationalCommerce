/// <reference lib="dom" />
import { ApiResponse, PaginatedResponse } from '@/lib/api-types';
import type { Result } from '@/modules/core/models/base/result';

import type { Order, OrderStatus } from '@/modules/order/models/order';
import type { OrderPaymentDetails, OrderShippingDetails, OrderTimelineEvent } from '@/modules/order/models/orderTypes';
import type { CreateOrderRequest } from '@/modules/order/validation/orderSchema';
import { OrderBulkOperationsService } from './OrderBulkOperationsService';
import { OrderQueryService } from './OrderQueryService';
import { OrderStatusService } from './OrderStatusService';

export interface PaginatedOrdersResult {
  items: Order[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Service interface for order management
 * Following the modular monolith pattern established in the codebase
 */
export interface OrderService {
  /**
   * Create a new order with idempotency key for safe retries
   */
  createOrder(request: CreateOrderRequest): Promise<Result<Order, Error>>;

  /**
   * Get an order by its ID with tenant isolation
   */
  getOrderById(orderId: string, tenantId: string): Promise<Result<Order, Error>>;

  /**
   * Get orders by customer phone number (critical for WhatsApp orders)
   */
  getOrdersByPhone(phoneNumber: string, tenantId: string): Promise<Result<Order[], Error>>;

  /**
   * Get orders by customer ID (for web orders)
   */
  getOrdersByCustomerId(customerId: string, tenantId: string): Promise<Result<Order[], Error>>;

  /**
   * Update an order's status
   */
  updateOrderStatus(
    orderId: string,
    status: string,
    tenantId: string,
    notes?: string,
  ): Promise<Result<Order, Error>>;

  /**
   * Cancel an order
   */
  cancelOrder(orderId: string, tenantId: string, reason?: string): Promise<Result<Order, Error>>;

  /**
   * Add payment details to an order
   */
  addPayment(
    orderId: string,
    tenantId: string,
    paymentDetails: OrderPaymentDetails,
  ): Promise<Result<Order, Error>>;

  /**
   * Add shipping details to an order
   */
  updateShipping(
    orderId: string,
    tenantId: string,
    shippingDetails: OrderShippingDetails,
  ): Promise<Result<Order, Error>>;

  /**
   * Get order timeline history
   */
  getOrderTimeline(orderId: string, tenantId: string): Promise<Result<OrderTimelineEvent[], Error>>;

  /**
   * Get all orders for the current tenant (with optional filters)
   */
  getOrders(params: {
    tenantId: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<Result<PaginatedOrdersResult, Error>>;
}

/**
 * HTTP implementation of the OrderService interface
 * Follows the orchestrator pattern by delegating to specialized services
 * This implementation aligns with backend modular monolith principles
 */
export class HttpOrderService implements OrderService {
  private apiUrl: string;
  private queryService: OrderQueryService;
  private statusService: OrderStatusService;
  private bulkOperationsService: OrderBulkOperationsService;

  constructor(apiUrl = '/api/v1') {
    this.apiUrl = apiUrl;
    this.queryService = new OrderQueryService(apiUrl);
    this.statusService = new OrderStatusService(apiUrl);
    this.bulkOperationsService = new OrderBulkOperationsService(apiUrl);
  }

  /**
   * Create a new order with offline resilience
   * Uses localStorage to queue failed requests for retry
   */
  async createOrder(request: CreateOrderRequest): Promise<Result<Order, Error>> {
    try {
      // Generate idempotency key if not provided
      if (!request.idempotency_key) {
        request.idempotency_key = crypto.randomUUID();
      }

      // Network request with retry support
      const response = await this.makeNetworkRequest(
        `${this.apiUrl}/orders`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        },
        true, // Enable retry for important requests
      );

      if (!response.ok) {
        const errorData = await response.json();
        if (typeof console !== 'undefined')
          throw new Error(errorData.message ?? 'Failed to create order');
      }

      const data = await response.json();
      return {
        success: true,
        data: data.order,
      };
    } catch (error) {
      console.error('Error creating order:', error);
      return {
        success: false,
        error: error as Error,
      };
    }
  }

  async getOrderById(orderId: string, tenantId: string): Promise<Result<Order, Error>> {
    try {
      const response = await fetch(`${this.apiUrl}/orders/${orderId}`, {
        headers: {
          'X-Tenant-ID': tenantId,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (typeof console !== 'undefined')
          throw new Error(errorData.message ?? 'Failed to get order');
      }

      const data = await response.json();
      return {
        success: true,
        data: data.order,
      };
    } catch (error) {
      console.error('Error getting order:', error);
      return {
        success: false,
        error: error as Error,
      };
    }
  }

  async getOrdersByPhone(phoneNumber: string, tenantId: string): Promise<Result<Order[], Error>> {
    try {
      const response = await fetch(
        `${this.apiUrl}/orders?phone=${encodeURIComponent(phoneNumber)}`,
        {
          headers: {
            'X-Tenant-ID': tenantId,
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        if (typeof console !== 'undefined')
          throw new Error(errorData.message ?? 'Failed to get orders by phone');
      }

      const data = await response.json();
      return {
        success: true,
        data: data.orders,
      };
    } catch (error) {
      console.error('Error getting orders by phone:', error);
      return {
        success: false,
        error: error as Error,
      };
    }
  }

  async getOrdersByCustomerId(
    customerId: string,
    tenantId: string,
  ): Promise<Result<Order[], Error>> {
    try {
      const response = await fetch(
        `${this.apiUrl}/orders?customer_id=${encodeURIComponent(customerId)}`,
        {
          headers: {
            'X-Tenant-ID': tenantId,
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        if (typeof console !== 'undefined')
          throw new Error(errorData.message ?? 'Failed to get orders by customer');
      }

      const data = await response.json();
      return {
        success: true,
        data: data.orders,
      };
    } catch (error) {
      console.error('Error getting orders by customer:', error);
      return {
        success: false,
        error: error as Error,
      };
    }
  }

  async updateOrderStatus(
    orderId: string,
    status: string,
    tenantId: string,
    notes?: string,
  ): Promise<Result<Order, Error>> {
    try {
      const response = await this.makeNetworkRequest(
        `${this.apiUrl}/orders/${orderId}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-ID': tenantId,
          },
          body: JSON.stringify({ status, notes }),
        },
        true, // Enable retry
      );

      if (!response.ok) {
        const errorData = await response.json();
        if (typeof console !== 'undefined')
          throw new Error(errorData.message ?? 'Failed to update order status');
      }

      const data = await response.json();
      return {
        success: true,
        data: data.order,
      };
    } catch (error) {
      console.error('Error updating order status:', error);
      return {
        success: false,
        error: error as Error,
      };
    }
  }

  async cancelOrder(
    orderId: string,
    tenantId: string,
    reason?: string,
  ): Promise<Result<Order, Error>> {
    try {
      const response = await this.makeNetworkRequest(
        `${this.apiUrl}/orders/${orderId}/cancel`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-ID': tenantId,
          },
          body: JSON.stringify({ reason }),
        },
        true,
      );

      if (!response.ok) {
        const errorData = await response.json();
        if (typeof console !== 'undefined')
          throw new Error(errorData.message ?? 'Failed to cancel order');
      }

      const data = await response.json();
      return {
        success: true,
        data: data.order,
      };
    } catch (error) {
      console.error('Error cancelling order:', error);
      return {
        success: false,
        error: error as Error,
      };
    }
  }

  async addPayment(
    orderId: string,
    tenantId: string,
    paymentDetails: OrderPaymentDetails,
  ): Promise<Result<Order, Error>> {
    try {
      const response = await this.makeNetworkRequest(
        `${this.apiUrl}/orders/${orderId}/payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-ID': tenantId,
          },
          body: JSON.stringify(paymentDetails),
        },
        true,
      );

      if (!response.ok) {
        const errorData = await response.json();
        if (typeof console !== 'undefined')
          throw new Error(errorData.message ?? 'Failed to add payment details');
      }

      const data = await response.json();
      return {
        success: true,
        data: data.order,
      };
    } catch (error) {
      console.error('Error adding payment details:', error);
      return {
        success: false,
        error: error as Error,
      };
    }
  }

  async updateShipping(
    orderId: string,
    tenantId: string,
    shippingDetails: OrderShippingDetails,
  ): Promise<Result<Order, Error>> {
    try {
      const response = await this.makeNetworkRequest(
        `${this.apiUrl}/orders/${orderId}/shipping`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-ID': tenantId,
          },
          body: JSON.stringify(shippingDetails),
        },
        true,
      );

      if (!response.ok) {
        const errorData = await response.json();
        if (typeof console !== 'undefined')
          throw new Error(errorData.message ?? 'Failed to update shipping details');
      }

      const data = await response.json();
      return {
        success: true,
        data: data.order,
      };
    } catch (error) {
      console.error('Error updating shipping details:', error);
      return {
        success: false,
        error: error as Error,
      };
    }
  }

  async getOrderTimeline(orderId: string, tenantId: string): Promise<Result<OrderTimelineEvent[], Error>> {
    try {
      const response = await fetch(`${this.apiUrl}/orders/${orderId}/timeline`, {
        headers: {
          'X-Tenant-ID': tenantId,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (typeof console !== 'undefined')
          throw new Error(errorData.message ?? 'Failed to get order timeline');
      }

      const data = await response.json();
      return {
        success: true,
        data: data.timeline,
      };
    } catch (error) {
      console.error('Error getting order timeline:', error);
      return {
        success: false,
        error: error as Error,
      };
    }
  }

  async getOrders({
    tenantId,
    status,
    search,
    limit = 50,
    offset = 0,
  }: {
    tenantId: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<Result<PaginatedOrdersResult, Error>> {
    try {
      const params = new URLSearchParams();
      if (status && status !== 'all') params.append('status', status);
      if (search) params.append('search', search);
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());
      const response = await fetch(`${this.apiUrl}/orders?${params.toString()}`, {
        headers: {
          'X-Tenant-ID': tenantId,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message ?? 'Failed to fetch orders');
      }
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  async deleteOrders(orderIds: string[], tenantId: string): Promise<Result<boolean, Error>> {
    try {
      const response = await this.bulkOperationsService.deleteOrders(orderIds, tenantId);
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete orders');
      }

      return {
        success: true,
        data: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
      };
    }
  }

  async deleteOrder(orderId: string, tenantId: string): Promise<Result<boolean, Error>> {
    try {
      const response = await this.bulkOperationsService.deleteOrder(orderId, tenantId);
      
      if (!response.success) {
        throw new Error(response.error?.message || `Failed to delete order ${orderId}`);
      }

      return {
        success: true,
        data: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
      };
    }
  }

  /**
   * Network request helper with offline resilience
   * Stores failed requests in localStorage for retry when connection is restored
   */
  private async makeNetworkRequest(
    url: string,
    options: globalThis.RequestInit,
    enableRetry = false,
  ): Promise<Response> {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      // If retry is enabled and it's a network error, queue for retry
      if (enableRetry && !window.navigator.onLine) {
        this.queueFailedRequest(url, options);
      }
      throw error;
    }
  }

  /**
   * Queue a failed request for retry when connection is restored
   * Critical for African markets with limited connectivity
   */
  private queueFailedRequest(url: string, options: globalThis.RequestInit): void {
    if (typeof window === 'undefined') return;

    try {
      // Get existing queue
      const queueString =
        typeof localStorage !== 'undefined'
          ? (localStorage.getItem('order_request_queue') ?? '[]')
          : '[]';
      const queue = JSON.parse(queueString);

      // Add this request to the queue
      queue.push({
        url,
        options: {
          ...options,
          body: options.body ? options.body.toString() : undefined,
        },
        timestamp: new Date().toISOString(),
      });

      // Save updated queue
      localStorage.setItem('order_request_queue', JSON.stringify(queue));

      // Add event listener for online events if not already added
      if (!window.__orderServiceOnlineListener) {
        window.__orderServiceOnlineListener = true;
        window.addEventListener('online', this.processQueuedRequests.bind(this));
      }
    } catch (error) {
      console.error('Error queueing failed request:', error);
    }
  }

  /**
   * Process queued requests when connection is restored
   */
  private async processQueuedRequests(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      // Get existing queue
      const queueString =
        typeof localStorage !== 'undefined'
          ? (localStorage.getItem('order_request_queue') ?? '[]')
          : '[]';
      const queue = JSON.parse(queueString);

      if (queue.length === 0) return;

      // Process each queued request
      const newQueue = [];
      for (const item of queue) {
        try {
          // Attempt to make the request
          await fetch(item.url, {
            ...item.options,
            body: item.options.body,
          });
        } catch (_error) {
          // If still failing, keep in queue for next retry
          newQueue.push(item);
        }
      }

      // Save updated queue
      localStorage.setItem('order_request_queue', JSON.stringify(newQueue));
    } catch (error) {
      console.error('Error processing queued requests:', error);
    }
  }
}

// Add global type for online listener
declare global {
  interface Window {
    __orderServiceOnlineListener?: boolean;
  }
}
