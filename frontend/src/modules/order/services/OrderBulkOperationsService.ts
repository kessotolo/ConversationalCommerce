import { ApiResponse } from '@/lib/api-types';
import { createApiClient } from '@/lib/api-client';
import { createApiError, createValidationError } from '@/lib/error-types';
import type { ValidationError } from '../services/OrderBulkValidationService';
import type { Order, OrderStatus } from '../models/order';
import { orderBulkValidationService } from './OrderBulkValidationService';

/**
 * Service for handling bulk operations on orders
 * Following the same modular pattern as backend services
 */
export class OrderBulkOperationsService {
  private apiClient = createApiClient();

  // Remove baseUrl as it's now handled by ApiClient
  constructor() {
    // No configuration needed as ApiClient handles base URLs
  }

  /**
   * Delete multiple orders at once
   * @param orderIds - Array of order IDs to delete
   * @param tenantId - Current tenant ID
   * @returns ApiResponse with success status and error if applicable
   */
  async bulkDeleteOrders(orderIds: string[], tenantId: string): Promise<ApiResponse<boolean>> {
    try {
      // Validate input through the validation service
      const validation = orderBulkValidationService.validateBulkDelete(orderIds);
      if (!validation.isValid) {
        return {
          success: false,
          error: createValidationError(
            validation.errors.map(err => err.message).join(', '),
            validation.errors
          ),
        };
      }
      
      // Track failed deletions
      const failures: string[] = [];
      const headers = { 'X-Tenant-ID': tenantId };
      
      // Process each order deletion using the ApiClient
      for (const orderId of orderIds) {
        try {
          const response = await this.apiClient.delete<unknown>(`/api/v1/orders/${orderId}`, headers);
          
          if (!response.success) {
            failures.push(orderId);
          }
        } catch (error: unknown) {
          failures.push(orderId);
        }
      }
      
      // If any deletions failed, return error response
      if (failures.length) {
        return {
          success: false,
          error: createApiError(
            `Failed to delete ${failures.length} of ${orderIds.length} orders`,
            'PARTIAL_FAILURE'
          ),
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
        error: createApiError(
          error.message || 'An unexpected error occurred while deleting orders',
          'UNKNOWN_ERROR'
        ),
      };
    }
  }

  /**
   * Delete a single order
   * @param orderId - ID of the order to delete
   * @param tenantId - Current tenant ID
   * @returns ApiResponse with success status
   */
  async deleteOrder(
    orderId: string,
    tenantId: string
  ): Promise<ApiResponse<boolean>> {
    try {
      const url = `/api/v1/orders/${orderId}`;
      const headers = { 'X-Tenant-ID': tenantId };
      
      const response = await this.apiClient.delete<unknown>(url, headers);
      
      if (!response.success) {
        return response as ApiResponse<boolean>; // Error response will be properly typed
      }

      return {
        success: true,
        data: true,
      };
    } catch (err: unknown) {
      const error = err as Error;
      return {
        success: false,
        error: createApiError(
          error.message || 'An unexpected error occurred while deleting the order',
          'UNKNOWN_ERROR'
        ),
      };
    }
  }

  /**
   * Update status for multiple orders at once
   * @param orderIds - Array of order IDs to update
   * @param status - New status to apply to all orders
   * @param tenantId - Current tenant ID
   * @returns ApiResponse with success status and error if applicable
   */
  async bulkUpdateStatus(
    orderIds: string[],
    status: OrderStatus,
    tenantId: string
  ): Promise<ApiResponse<boolean>> {
    try {
      // Validate the request
      const validation = orderBulkValidationService.validateStatusUpdate(
        orderIds,
        status
      );

      if (!validation.isValid) {
        return {
          success: false,
          error: createValidationError(
            validation.errors.map(err => err.message).join(', '),
            validation.errors
          ),
        };
      }

      // Track failed updates
      const failures: string[] = [];
      const headers = { 'X-Tenant-ID': tenantId };
      
      // Process each status update using the ApiClient
      for (const orderId of orderIds) {
        try {
          const response = await this.apiClient.put<unknown>(
            `/api/v1/orders/${orderId}/status`,
            { status },
            headers
          );
          
          if (!response.success) {
            failures.push(orderId);
          }
        } catch (error: unknown) {
          failures.push(orderId);
        }
      }

      if (failures.length) {
        return {
          success: false,
          error: createApiError(
            `Failed to update status for ${failures.length} of ${orderIds.length} orders`,
            'PARTIAL_FAILURE'
          ),
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
        error: createApiError(
          error.message || 'An unexpected error occurred',
          'UNKNOWN_ERROR'
        ),
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
          error: createValidationError(
            validation.errors.map(err => err.message).join(', '),
            validation.errors
          ),
        };
      }
      
      const url = `/api/v1/orders/bulk/edit`;
      const headers = { 'X-Tenant-ID': tenantId };
      const payload = {
        orderIds,
        updates: fieldsToUpdate,
      };
      
      return this.apiClient.patch<Order[]>(url, payload, headers);
    } catch (err: unknown) {
      const error = err as Error;
      return {
        success: false,
        error: createApiError(
          error.message || 'An unexpected error occurred during batch edit',
          'UNKNOWN_ERROR'
        ),
      };
    }
  }
}
