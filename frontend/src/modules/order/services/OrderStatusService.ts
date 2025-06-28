import type { Order } from '../models/order';
import { OrderStatus } from '../models/order';
// Define ApiResponse type locally if not available in project
export interface ApiResponseError {
  message: string;
  code: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiResponseError;
}

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
  private baseUrl: string;

  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * Update the status of an order
   */
  async updateOrderStatus(
    orderId: string,
    tenantId: string,
    statusUpdate: OrderStatusUpdate
  ): Promise<ApiResponse<Order>> {
    try {
      const response = await fetch(
        `${this.baseUrl}/tenants/${tenantId}/orders/${orderId}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(statusUpdate),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: {
            message: error.message || 'Failed to update order status',
            code: error.code || response.status.toString(),
          },
        };
      }

      const updatedOrder = await response.json();
      return {
        success: true,
        data: updatedOrder,
      };
    } catch (err: unknown) {
      const error = err as Error;
      return {
        success: false,
        error: {
          message: error.message || 'An unexpected error occurred while updating order status',
          code: 'UNKNOWN_ERROR',
        },
      };
    }
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
