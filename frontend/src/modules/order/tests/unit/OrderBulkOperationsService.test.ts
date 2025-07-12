import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { OrderBulkOperationsService } from '../../services/OrderBulkOperationsService';
import { orderBulkValidationService } from '../../services/OrderBulkValidationService';
import { createApiClient } from '@/lib/api-client';
import { ApiResponse } from '@/lib/api-types';
import { Order, OrderStatus } from '../../models/order';

// Mock the api-client module
const mockDelete = jest.fn();
const mockPut = jest.fn();
const mockPatch = jest.fn();

jest.mock('@/lib/api-client', () => ({
  createApiClient: jest.fn(() => ({
    delete: mockDelete,
    put: mockPut,
    patch: mockPatch,
  })),
}));

// Mock the order bulk validation service
const mockValidateBulkDelete = jest.fn();
const mockValidateStatusUpdate = jest.fn();
const mockValidateBatchEdit = jest.fn();

jest.mock('../../services/OrderBulkValidationService', () => ({
  orderBulkValidationService: {
    validateBulkDelete: mockValidateBulkDelete,
    validateStatusUpdate: mockValidateStatusUpdate,
    validateBatchEdit: mockValidateBatchEdit,
  }
}));

describe('OrderBulkOperationsService', () => {
  let orderBulkOperationsService: OrderBulkOperationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    orderBulkOperationsService = new OrderBulkOperationsService();
  });

  describe('bulkDeleteOrders', () => {
    test('should validate input and call apiClient.delete for each order', async () => {
      // Arrange
      const orderIds = ['order1', 'order2', 'order3'];
      const tenantId = 'tenant123';
      
      // Setup validation to succeed
      mockValidateBulkDelete.mockReturnValue({
        isValid: true,
        errors: []
      });
      
      // Setup API client to succeed for all calls
      mockDelete.mockReturnValue(Promise.resolve({
        success: true,
        data: true
      }));

      // Act
      const result = await orderBulkOperationsService.bulkDeleteOrders(orderIds, tenantId);

      // Assert
      expect(orderBulkValidationService.validateBulkDelete).toHaveBeenCalledWith(orderIds);
      expect(mockDelete).toHaveBeenCalledTimes(3);
      expect(mockDelete).toHaveBeenNthCalledWith(
        1, 
        '/api/v1/orders/order1',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Tenant-ID': tenantId
          })
        })
      );
      
      expect(result).toEqual({
        success: true,
        data: true
      });
    });

    test('should return validation error when validation fails', async () => {
      // Arrange
      const orderIds = ['order1', 'invalid'];
      const tenantId = 'tenant123';
      
      // Setup validation to fail
      mockValidateBulkDelete.mockReturnValue({
        isValid: false,
        errors: [{ field: 'orderIds', message: 'Invalid order ID format' }]
      });

      // Act
      const result = await orderBulkOperationsService.bulkDeleteOrders(orderIds, tenantId);

      // Assert
      expect(result.success).toBeFalsy();
      expect(result.error?.message).toContain('Invalid order ID format');
      expect(mockDelete).not.toHaveBeenCalled();
    });

    test('should handle partial failures during deletion', async () => {
      // Arrange
      const orderIds = ['order1', 'order2', 'order3'];
      const tenantId = 'tenant123';
      
      // Setup validation to succeed
      mockValidateBulkDelete.mockReturnValue({
        isValid: true,
        errors: []
      });
      
      // Setup API client to fail for one call
      mockDelete
        .mockReturnValueOnce(Promise.resolve({ success: true, data: true }))
        .mockReturnValueOnce(Promise.resolve({ success: false, error: { message: 'Not found', code: '404' } }))
        .mockReturnValueOnce(Promise.resolve({ success: true, data: true }));

      // Act
      const result = await orderBulkOperationsService.bulkDeleteOrders(orderIds, tenantId);

      // Assert
      expect(mockDelete).toHaveBeenCalledTimes(3);
      expect(result.success).toBeFalsy();
      expect(result.error?.code).toBe('PARTIAL_FAILURE');
      expect(result.error?.message).toContain('Failed to delete 1 of 3');
    });
  });

  describe('deleteOrder', () => {
    test('should call apiClient.delete with correct parameters', async () => {
      // Arrange
      const orderId = 'order123';
      const tenantId = 'tenant123';
      
      // Setup API client to succeed
      mockDelete.mockReturnValue(Promise.resolve({
        success: true,
        data: true
      }));

      // Act
      const result = await orderBulkOperationsService.deleteOrder(orderId, tenantId);

      // Assert
      expect(mockDelete).toHaveBeenCalledWith(
        '/api/v1/orders/order123',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Tenant-ID': tenantId
          })
        })
      );
      
      expect(result).toEqual({
        success: true,
        data: true
      });
    });

    test('should propagate error responses from apiClient', async () => {
      // Arrange
      const orderId = 'nonexistent';
      const tenantId = 'tenant123';
      
      const errorResponse = {
        success: false,
        error: {
          message: 'Order not found',
          code: '404'
        }
      };
      
      // Setup API client to fail
      mockDelete.mockReturnValue(Promise.resolve(errorResponse));

      // Act
      const result = await orderBulkOperationsService.deleteOrder(orderId, tenantId);

      // Assert
      expect(result).toEqual(errorResponse);
    });
  });

  describe('bulkUpdateStatus', () => {
    test('should validate input and call apiClient.put for each order', async () => {
      // Arrange
      const orderIds = ['order1', 'order2'];
      const tenantId = 'tenant123';
      const newStatus = OrderStatus.PROCESSING;
      
      // Setup validation to succeed
      mockValidateStatusUpdate.mockReturnValue({
        isValid: true,
        errors: []
      });
      
      // Setup API client to succeed for all calls
      mockPut.mockReturnValue(Promise.resolve({
        success: true,
        data: true
      }));

      // Act
      const result = await orderBulkOperationsService.bulkUpdateStatus(orderIds, newStatus, tenantId);

      // Assert
      expect(orderBulkValidationService.validateStatusUpdate).toHaveBeenCalledWith(orderIds, newStatus);
      expect(mockPut).toHaveBeenCalledTimes(2);
      expect(mockPut).toHaveBeenNthCalledWith(
        1,
        '/api/v1/orders/order1/status',
        { status: newStatus },
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Tenant-ID': tenantId
          })
        })
      );
      
      expect(result).toEqual({
        success: true,
        data: true
      });
    });
  });

  describe('batchEditOrders', () => {
    test('should validate input and call apiClient.patch with correct payload', async () => {
      // Arrange
      const orderIds = ['order1', 'order2'];
      const tenantId = 'tenant123';
      const fieldsToUpdate = {
        notes: 'Updated notes',
        metadata: { priority: 'high' }
      };
      
      const mockResponse = {
        success: true,
        data: [
          { 
            id: 'order1', 
            tenant_id: 'tenant123',
            notes: 'Updated notes', 
            order_number: '001', 
            status: OrderStatus.PENDING, 
            customer: {
              name: 'Test Customer',
              email: 'test@example.com',
              phone: '+1234567890',
              is_guest: false
            }, 
            items: [], 
            total_amount: { currency: 'USD', amount: 150 },
            created_at: '2023-01-01T00:00:00Z', 
            updated_at: '2023-01-01T00:00:00Z' 
          },
          { 
            id: 'order2', 
            tenant_id: 'tenant123',
            notes: 'Updated notes', 
            order_number: '002', 
            status: OrderStatus.PENDING, 
            customer: {
              name: 'Test Customer',
              email: 'test@example.com',
              phone: '+1234567890',
              is_guest: false
            }, 
            items: [], 
            total_amount: { currency: 'USD', amount: 150 },
            created_at: '2023-01-01T00:00:00Z', 
            updated_at: '2023-01-01T00:00:00Z' 
          }
        ]
      };
      
      // Setup validation to succeed
      mockValidateBatchEdit.mockReturnValue({
        isValid: true,
        errors: []
      });
      
      // Setup API client to succeed
      mockPatch.mockReturnValue(Promise.resolve(mockResponse));

      // Act
      const result = await orderBulkOperationsService.batchEditOrders(
        orderIds, 
        fieldsToUpdate, 
        tenantId
      );

      // Assert
      expect(orderBulkValidationService.validateBatchEdit).toHaveBeenCalledWith(
        orderIds, 
        fieldsToUpdate
      );
      
      expect(mockPatch).toHaveBeenCalledWith(
        '/api/v1/orders/bulk/edit',
        {
          orderIds,
          updates: fieldsToUpdate
        },
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Tenant-ID': tenantId
          })
        })
      );
      
      expect(result).toEqual(mockResponse);
    });

    test('should return validation error when validation fails', async () => {
      // Arrange
      const orderIds = ['order1'];
      const tenantId = 'tenant123';
      const fieldsToUpdate = {
        notes: 'Updated notes',
        // Invalid field that would fail validation
        invalidField: 'should fail'
      } as any;
      
      // Setup validation to fail
      mockValidateBatchEdit.mockReturnValue({
        isValid: false,
        errors: [{ field: 'updates', message: 'Invalid field: invalidField' }]
      });

      // Act
      const result = await orderBulkOperationsService.batchEditOrders(
        orderIds,
        fieldsToUpdate,
        tenantId
      );

      // Assert
      expect(result.success).toBeFalsy();
      expect(result.error?.message).toContain('Invalid field: invalidField');
      expect(mockPatch).not.toHaveBeenCalled();
    });
  });
});
