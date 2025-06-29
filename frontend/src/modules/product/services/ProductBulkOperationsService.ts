import { ApiResponse } from '@/lib/api-types';
import type { Product, ProductStatus } from '../models/product';

/**
 * Service for handling bulk operations on products
 * Following the same modular pattern as other services
 */
export class ProductBulkOperationsService {
  private baseUrl: string;

  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * Delete multiple products at once
   * @param productIds - Array of product IDs to delete
   * @param tenantId - Current tenant ID
   * @returns ApiResponse with success status and error if applicable
   */
  async deleteProducts(
    productIds: string[],
    tenantId: string
  ): Promise<ApiResponse<boolean>> {
    try {
      if (!productIds.length) {
        return {
          success: false,
          error: {
            message: 'No products provided for deletion',
            code: 'INVALID_REQUEST',
          },
        };
      }

      const responses = await Promise.allSettled(
        productIds.map(productId =>
          fetch(`${this.baseUrl}/tenants/${tenantId}/products/${productId}`, {
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
            message: `Failed to delete ${failures.length} of ${productIds.length} products`,
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
          message: error.message || 'An unexpected error occurred while deleting products',
          code: 'UNKNOWN_ERROR',
        },
      };
    }
  }

  /**
   * Delete a single product
   * @param productId - ID of the product to delete
   * @param tenantId - Current tenant ID
   * @returns ApiResponse with success status and error if applicable
   */
  async deleteProduct(
    productId: string,
    tenantId: string
  ): Promise<ApiResponse<boolean>> {
    try {
      const response = await fetch(
        `${this.baseUrl}/tenants/${tenantId}/products/${productId}`,
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
            message: error.message || `Failed to delete product ${productId}`,
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
          message: error.message || 'An unexpected error occurred while deleting the product',
          code: 'UNKNOWN_ERROR',
        },
      };
    }
  }

  /**
   * Update status for multiple products at once
   * @param productIds - Array of product IDs to update
   * @param status - New status to apply to all products
   * @param tenantId - Current tenant ID
   * @returns ApiResponse with array of updated products or error
   */
  async bulkUpdateStatus(
    productIds: string[],
    status: ProductStatus,
    tenantId: string
  ): Promise<ApiResponse<Product[]>> {
    try {
      if (!productIds.length) {
        return {
          success: false,
          error: {
            message: 'No products provided for status update',
            code: 'INVALID_REQUEST',
          },
        };
      }

      const response = await fetch(
        `${this.baseUrl}/tenants/${tenantId}/products/bulk/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productIds,
            status,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: {
            message: error.message || 'Failed to update products status',
            code: error.code || response.status.toString(),
          },
        };
      }

      const updatedProducts = await response.json();
      return {
        success: true,
        data: updatedProducts,
      };
    } catch (err: unknown) {
      const error = err as Error;
      return {
        success: false,
        error: {
          message: error.message || 'An unexpected error occurred while updating products',
          code: 'UNKNOWN_ERROR',
        },
      };
    }
  }

  /**
   * Batch edit products with specified field updates
   * @param productIds - Array of product IDs to update
   * @param fieldsToUpdate - Object containing fields to update
   * @param tenantId - Current tenant ID
   * @returns ApiResponse with array of updated products or error
   */
  async batchEditProducts(
    productIds: string[],
    fieldsToUpdate: Partial<Pick<Product, 'price' | 'sale_price' | 'inventory_quantity' | 'status' | 'categories' | 'tags' | 'metadata'>>,
    tenantId: string
  ): Promise<ApiResponse<Product[]>> {
    try {
      if (!productIds.length) {
        return {
          success: false,
          error: {
            message: 'No products provided for batch edit',
            code: 'INVALID_REQUEST',
          },
        };
      }

      if (Object.keys(fieldsToUpdate).length === 0) {
        return {
          success: false,
          error: {
            message: 'No fields provided to update',
            code: 'INVALID_REQUEST',
          },
        };
      }

      const response = await fetch(
        `${this.baseUrl}/tenants/${tenantId}/products/bulk/edit`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productIds,
            updates: fieldsToUpdate,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: {
            message: error.message || 'Failed to batch edit products',
            code: error.code || response.status.toString(),
          },
        };
      }

      const updatedProducts = await response.json();
      return {
        success: true,
        data: updatedProducts,
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
  
  /**
   * Update inventory for multiple products at once
   * @param productUpdates - Array of objects with product ID and new inventory quantity
   * @param tenantId - Current tenant ID
   * @returns ApiResponse with array of updated products or error
   */
  async bulkUpdateInventory(
    productUpdates: Array<{ productId: string; quantity: number }>,
    tenantId: string
  ): Promise<ApiResponse<Product[]>> {
    try {
      if (!productUpdates.length) {
        return {
          success: false,
          error: {
            message: 'No products provided for inventory update',
            code: 'INVALID_REQUEST',
          },
        };
      }

      const response = await fetch(
        `${this.baseUrl}/tenants/${tenantId}/products/bulk/inventory`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            updates: productUpdates,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: {
            message: error.message || 'Failed to update products inventory',
            code: error.code || response.status.toString(),
          },
        };
      }

      const updatedProducts = await response.json();
      return {
        success: true,
        data: updatedProducts,
      };
    } catch (err: unknown) {
      const error = err as Error;
      return {
        success: false,
        error: {
          message: error.message || 'An unexpected error occurred while updating product inventory',
          code: 'UNKNOWN_ERROR',
        },
      };
    }
  }
}

// Export a singleton instance for use throughout the app
export const productBulkOperationsService = new ProductBulkOperationsService();
