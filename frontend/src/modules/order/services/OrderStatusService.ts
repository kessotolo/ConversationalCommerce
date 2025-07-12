import type { Order } from '../models/order';
import { OrderStatus } from '../models/order';
import { ApiResponse } from '@/lib/api-types';
import { createApiClient } from '@/lib/api-client';

interface OrderStatusUpdate {
  status: OrderStatus;
  trackingNumber?: string;
  shippingCarrier?: string;
  notes?: string;
}

/**
 * Service for handling order status transitions and updates
 */
export class OrderStatusService {
  private apiClient = createApiClient();

  /**
   * Update the status of an order
   * @param orderId - ID of the order to update
   * @param status - New status for the order
   * @param tenantId - ID of the tenant (merchant)
   * @returns Promise with status update result
   */
  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    tenantId: string
  ): Promise<ApiResponse<Order>> {
    const url = `/api/v1/orders/${orderId}/status`;
    const headers = {
      'X-Tenant-ID': tenantId
    };

    return this.apiClient.put<Order>(url, { status }, headers);
  }

  /**
   * Check if a status transition is valid according to business rules
   */
  isValidTransition(currentStatus: OrderStatus, newStatus: OrderStatus): boolean {
    // Define valid transitions based on business rules
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PAID]: [OrderStatus.PROCESSING, OrderStatus.REFUNDED, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [OrderStatus.REFUNDED],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.REFUNDED]: [],
      [OrderStatus.FAILED]: [],
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  /**
   * Get available next statuses for the current order status
   */
  getAvailableNextStatuses(currentStatus: OrderStatus): OrderStatus[] {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PAID]: [OrderStatus.PROCESSING, OrderStatus.REFUNDED, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [OrderStatus.REFUNDED],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.REFUNDED]: [],
      [OrderStatus.FAILED]: [],
    };

    return validTransitions[currentStatus] || [];
  }

  /**
   * Return human-readable display text for order status
   */
  getStatusDisplay(status: OrderStatus): string {
    const displayMap: Record<OrderStatus, string> = {
      [OrderStatus.PENDING]: 'Pending',
      [OrderStatus.PAID]: 'Paid',
      [OrderStatus.PROCESSING]: 'Processing',
      [OrderStatus.SHIPPED]: 'Shipped',
      [OrderStatus.DELIVERED]: 'Delivered',
      [OrderStatus.CANCELLED]: 'Cancelled',
      [OrderStatus.REFUNDED]: 'Refunded',
      [OrderStatus.FAILED]: 'Failed',
    };

    return displayMap[status] || status;
  }

  /**
   * Get styling for status badges
   */
  getStatusStyles(status: OrderStatus): { variant: string; className: string } {
    const styles: Record<OrderStatus, { variant: string; className: string }> = {
      [OrderStatus.PENDING]: { variant: 'outline', className: 'border-yellow-500 text-yellow-700' },
      [OrderStatus.PAID]: { variant: 'outline', className: 'border-green-500 text-green-700' },
      [OrderStatus.PROCESSING]: { variant: 'outline', className: 'border-blue-500 text-blue-700' },
      [OrderStatus.SHIPPED]: { variant: 'outline', className: 'border-purple-500 text-purple-700' },
      [OrderStatus.DELIVERED]: { variant: 'outline', className: 'border-green-500 text-green-700' },
      [OrderStatus.CANCELLED]: { variant: 'outline', className: 'border-red-500 text-red-700' },
      [OrderStatus.REFUNDED]: { variant: 'outline', className: 'border-orange-500 text-orange-700' },
      [OrderStatus.FAILED]: { variant: 'outline', className: 'border-red-500 text-red-700' },
    };

    return styles[status] || { variant: 'outline', className: 'border-gray-500 text-gray-700' };
  }
}
