import { Order, OrderStatus } from '../models/order';
import { ApiResponse } from '@/lib/api-types';
import { createApiClient } from '@/lib/api-client';

interface OrderQueryParams {
  tenantId: string;
  status?: string;
  search?: string;
  searchTerm?: string; // Added for compatibility with both naming conventions
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
}

export interface OrderQueryResponse {
  items: Order[];
  total: number;
  limit?: number;
  offset?: number;
}

/**
 * Service for querying and fetching orders
 */
export class OrderQueryService {
  private apiClient = createApiClient();
  
  /**
   * Query orders with filters and pagination
   * @param params Query parameters for filtering and pagination
   * @returns Promise with paginated order results
   */
  async queryOrders(params: OrderQueryParams): Promise<ApiResponse<OrderQueryResponse>> {
    // Convert parameters to query string
    const queryParams = new URLSearchParams();
    
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());
    if (params.status) queryParams.append('status', params.status);
    if (params.startDate) queryParams.append('start_date', params.startDate);
    if (params.endDate) queryParams.append('end_date', params.endDate);
    if (params.searchTerm) queryParams.append('search', params.searchTerm);
if (params.search) queryParams.append('search', params.search); // Support both naming conventions
    
    const url = `/api/v1/orders?${queryParams.toString()}`;
    const headers = {
      'X-Tenant-ID': params.tenantId,
    };
    
    return this.apiClient.get<OrderQueryResponse>(url, headers);
  }

  /**
   * Get a single order by ID
   * @param orderId The unique identifier of the order
   * @param tenantId The tenant (merchant) identifier
   * @returns Promise with order data
   */
  async getOrderById(orderId: string, tenantId: string): Promise<ApiResponse<Order>> {
    const url = `/api/v1/orders/${orderId}`;
    const headers = {
      'X-Tenant-ID': tenantId,
    };
    
    return this.apiClient.get<Order>(url, headers);
  }
}
