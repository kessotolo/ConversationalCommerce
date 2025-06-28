import { Order, OrderStatus } from '../models/order';
import { ApiResponse } from '@/lib/api-types';

interface OrderQueryParams {
  tenantId: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
}

export interface OrderQueryResult {
  items: Order[];
  total: number;
}

/**
 * Service for querying and fetching orders
 */
export class OrderQueryService {
  private baseUrl: string;

  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * Fetch orders with optional filters
   */
  async getOrders(params: OrderQueryParams): Promise<ApiResponse<OrderQueryResult>> {
    try {
      const queryParams = new URLSearchParams();
      if (params.status && params.status !== 'all') queryParams.append('status', params.status);
      if (params.search) queryParams.append('search', params.search);
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.offset) queryParams.append('offset', params.offset.toString());
      if (params.startDate) queryParams.append('start_date', params.startDate);
      if (params.endDate) queryParams.append('end_date', params.endDate);

      const response = await fetch(
        `${this.baseUrl}/tenants/${params.tenantId}/orders?${queryParams.toString()}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: {
            message: error.message || 'Failed to fetch orders',
            code: error.code || response.status.toString(),
          },
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (err: unknown) {
      const error = err as Error;
      return {
        success: false,
        error: {
          message: error.message || 'An unexpected error occurred while fetching orders',
          code: 'UNKNOWN_ERROR',
        },
      };
    }
  }

  /**
   * Get a single order by ID
   */
  async getOrderById(orderId: string, tenantId: string): Promise<ApiResponse<Order>> {
    try {
      const response = await fetch(`${this.baseUrl}/tenants/${tenantId}/orders/${orderId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: {
            message: error.message || 'Order not found',
            code: error.code || response.status.toString(),
          },
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (err: unknown) {
      const error = err as Error;
      return {
        success: false,
        error: {
          message: error.message || 'An unexpected error occurred while fetching the order',
          code: 'UNKNOWN_ERROR',
        },
      };
    }
  }
}
