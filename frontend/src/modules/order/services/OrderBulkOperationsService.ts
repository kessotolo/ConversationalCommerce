import { ApiResponse } from '@/lib/api-types';
import type { Order, OrderStatus } from '../models/order';
import { orderBulkValidationService } from './OrderBulkValidationService';

/**
 * Service for handling bulk operations on orders
 * Following the same modular pattern as backend services
 */
export class OrderBulkOperationsService {
  private baseUrl: string;

  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * Delete multiple orders at once
   * @param orderIds - Array of order IDs to delete
   * @param tenantId - Current tenant ID
   * @returns ApiResponse with success status and error if applicable
   */
  async deleteOrders(
    orderIds: string[],
    tenantId: string
  ): Promise<ApiResponse<boolean>> {
    try {
      // Validate the request
      const validation = orderBulkValidationService.validateBulkDelete(orderIds);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            message: validation.errors.map(err => err.message).join(', '),
            code: 'VALIDATION_ERROR',
            details: { errors: validation.errors } as Record<string, unknown>,
          },
        };
      }

      const responses = await Promise.allSettled(
        orderIds.map(orderId =>
          fetch(`${this.baseUrl}/tenants/${tenantId}/orders/${orderId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
          })
        )
      );

      const failures = responses.filter(
        response => response.status === 'rejected' ||
          (response.status === 'fulfilled' && !response.value.ok)
      );

      if (failures.length) {
        return {
          success: false,
          error: {
            message: `Failed to delete ${failures.length} of ${orderIds.length} orders`,
            code: 'PARTIAL_FAILURE',
          },
        };
      }

      return {
        success: true,
        data: true,
      };
    } catch (err: unknown) {
      const error = err as Error;
      return {
        success: false,
        error: {
          message: error.message || 'An unexpected error occurred while deleting orders',
          code: 'UNKNOWN_ERROR',
        },
      };
    }
  }

  /**
   * Delete a single order
   * @param orderId - ID of the order to delete
   * @param tenantId - Current tenant ID
   * @returns ApiResponse with success status and error if applicable
   */
  async deleteOrder(
    orderId: string,
    tenantId: string
  ): Promise<ApiResponse<boolean>> {
    try {
      const response = await fetch(
        `${this.baseUrl}/tenants/${tenantId}/orders/${orderId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: {
            message: error.message || `Failed to delete order ${orderId}`,
            code: error.code || response.status.toString(),
          },
        };
      }

      return {
        success: true,
        data: true,
      };
    } catch (err: unknown) {
      const error = err as Error;
      return {
        success: false,
        error: {
          message: error.message || 'An unexpected error occurred while deleting the order',
          code: 'UNKNOWN_ERROR',
        },
      };
    }
  }

  /**
   * Update status for multiple orders at once
   * @param orderIds - Array of order IDs to update
   * @param status - New status to apply to all orders
   * @param tenantId - Current tenant ID
   * @returns ApiResponse with array of updated orders or error
   */
  async bulkUpdateStatus(
    orderIds: string[],
    status: OrderStatus,
    tenantId: string
  ): Promise<ApiResponse<Order[]>> {
    try {
      // Validate the request
      const validation = orderBulkValidationService.validateStatusUpdate(orderIds, status);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            message: validation.errors.map(err => err.message).join(', '),
            code: 'VALIDATION_ERROR',
            details: { errors: validation.errors } as Record<string, unknown>,
          },
        };
      }

      const response = await fetch(
        `${this.baseUrl}/tenants/${tenantId}/orders/bulk/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderIds,
            status,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: {
            message: error.message || 'Failed to update orders status',
            code: error.code || response.status.toString(),
          },
        };
      }

      const updatedOrders = await response.json();
      return {
        success: true,
        data: updatedOrders,
      };
    } catch (err: unknown) {
      const error = err as Error;
      return {
        success: false,
        error: {
          message: error.message || 'An unexpected error occurred while updating orders',
          code: 'UNKNOWN_ERROR',
        },
      };
    }
  }

  /**
   * Batch edit orders with specified field updates
   * @param orderIds - Array of order IDs to update
   * @param fieldsToUpdate - Object containing fields to update
   * @param tenantId - Current tenant ID
   * @returns ApiResponse with array of updated orders or error
   */
  async batchEditOrders(
    orderIds: string[],
    fieldsToUpdate: Partial<Pick<Order, 'notes' | 'metadata' | 'shipping'>>,
    tenantId: string
  ): Promise<ApiResponse<Order[]>> {
    try {
      // Validate the request
      const validation = orderBulkValidationService.validateBatchEdit(orderIds, fieldsToUpdate);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            message: validation.errors.map(err => err.message).join(', '),
            code: 'VALIDATION_ERROR',
            details: { errors: validation.errors } as Record<string, unknown>,
          },
        };
      }

      const response = await fetch(
        `${this.baseUrl}/tenants/${tenantId}/orders/bulk/edit`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderIds,
            updates: fieldsToUpdate,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: {
            message: error.message || 'Failed to batch edit orders',
            code: error.code || response.status.toString(),
          },
        };
      }

      const updatedOrders = await response.json();
      return {
        success: true,
        data: updatedOrders,
      };
    } catch (err: unknown) {
      const error = err as Error;
      return {
        success: false,
        error: {
          message: error.message || 'An unexpected error occurred during batch edit',
          code: 'UNKNOWN_ERROR',
        },
      };
    }
  }
}
