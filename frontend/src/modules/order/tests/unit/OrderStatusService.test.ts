import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { OrderStatusService } from '../../services/OrderStatusService';
import { OrderStatus, OrderSource, PaymentMethod, PaymentStatus, ShippingMethod } from '../../models/order';
import { ApiResponse } from '@/lib/api-types';
import type { Order } from '../../models/order';

// Create mock functions for the ApiClient methods
const mockGet = jest.fn();
const mockPut = jest.fn();
const mockPost = jest.fn();
const mockDelete = jest.fn();
const mockPatch = jest.fn();

// Create a mock ApiClient object
const mockApiClient = {
  get: mockGet,
  put: mockPut,
  post: mockPost,
  delete: mockDelete,
  patch: mockPatch
};

// Mock the api-client module
jest.mock('@/lib/api-client', () => ({
  createApiClient: jest.fn().mockReturnValue(mockApiClient)
}));

describe('OrderStatusService', () => {
  let orderStatusService: OrderStatusService;

  beforeEach(() => {
    jest.clearAllMocks();
    orderStatusService = new OrderStatusService();
  });

  describe('updateOrderStatus', () => {
    test('should call apiClient.put with correct parameters', async () => {
      // Arrange
      const mockOrderData: Order = {
        id: 'order123',
        order_number: 'ORD-123',
        status: OrderStatus.DELIVERED,
        tenant_id: 'tenant123',
        customer: {
          name: 'Test Customer',
          email: 'test@example.com',
          phone: '+1234567890',
          is_guest: false
        },
        items: [],
        total_amount: { currency: 'USD', amount: 100 },
        subtotal: { currency: 'USD', amount: 90 },
        tax: { currency: 'USD', amount: 10 },
        source: OrderSource.WEBSITE,
        shipping: {
          address: {
            street: '123 Main St',
            city: 'Test City',
            state: 'TS',
            postalCode: '12345',
            country: 'Test Country'
          },
          method: ShippingMethod.COURIER,
          shipping_cost: { currency: 'USD', amount: 10 }
        },
        payment: {
          method: PaymentMethod.CARD,
          status: PaymentStatus.COMPLETED,
          amount_paid: { currency: 'USD', amount: 100 }
        },
        timeline: [],
        idempotency_key: 'key123',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z'
      };
      
      const successResponse = {
        success: true,
        data: mockOrderData
      };
      
      // Using type assertion to explicitly type the mock return value
      mockPut.mockReturnValue(Promise.resolve(successResponse));
      
      const orderId = 'order123';
      const tenantId = 'tenant123';
      const newStatus = OrderStatus.DELIVERED;

      // Act
      const response = await orderStatusService.updateOrderStatus(orderId, newStatus, tenantId);

      // Assert
      expect(response).toEqual(successResponse);
      expect(mockPut).toHaveBeenCalledWith(
        `/api/v1/orders/${orderId}/status`,
        { status: newStatus },
        { params: { tenant_id: tenantId } }
      );
    });

    test('should handle error responses', async () => {
      // Arrange
      const errorResponse = {
        success: false,
        error: {
          message: 'Invalid status transition',
          code: 'INVALID_STATUS_TRANSITION'
        }
      };
      
      mockPut.mockReturnValue(Promise.resolve(errorResponse));
      
      const orderId = 'order123';
      const tenantId = 'tenant123';
      const newStatus = OrderStatus.CANCELLED;

      // Act
      const result = await orderStatusService.updateOrderStatus(orderId, newStatus, tenantId);

      // Assert
      expect(result.success).toBeFalsy();
      expect(result.error?.code).toBe('INVALID_STATUS_TRANSITION');
    });
  });
  
  describe('isValidTransition', () => {
    test('should return true for valid status transitions', () => {
      // Test some valid transitions
      expect(orderStatusService.isValidTransition(OrderStatus.PENDING, OrderStatus.PAID)).toBeTruthy();
      expect(orderStatusService.isValidTransition(OrderStatus.PAID, OrderStatus.PROCESSING)).toBeTruthy();
      expect(orderStatusService.isValidTransition(OrderStatus.PROCESSING, OrderStatus.SHIPPED)).toBeTruthy();
    });
    
    test('should return false for invalid status transitions', () => {
      // Test some invalid transitions
      expect(orderStatusService.isValidTransition(OrderStatus.PENDING, OrderStatus.SHIPPED)).toBeFalsy();
      expect(orderStatusService.isValidTransition(OrderStatus.DELIVERED, OrderStatus.PROCESSING)).toBeFalsy();
      expect(orderStatusService.isValidTransition(OrderStatus.CANCELLED, OrderStatus.PAID)).toBeFalsy();
    });
  });
  
  describe('getAvailableNextStatuses', () => {
    test('should return correct next statuses for each status', () => {
      // Check PENDING available next statuses
      const pendingNext = orderStatusService.getAvailableNextStatuses(OrderStatus.PENDING);
      expect(pendingNext).toContain(OrderStatus.PAID);
      expect(pendingNext).toContain(OrderStatus.PROCESSING);
      expect(pendingNext).toContain(OrderStatus.CANCELLED);
      expect(pendingNext).not.toContain(OrderStatus.SHIPPED);
      
      // Check DELIVERED available next statuses
      const deliveredNext = orderStatusService.getAvailableNextStatuses(OrderStatus.DELIVERED);
      expect(deliveredNext).toContain(OrderStatus.REFUNDED);
      expect(deliveredNext).not.toContain(OrderStatus.SHIPPED);
      expect(deliveredNext).not.toContain(OrderStatus.PROCESSING);
      
      // Check CANCELLED has no next statuses
      const cancelledNext = orderStatusService.getAvailableNextStatuses(OrderStatus.CANCELLED);
      expect(cancelledNext).toEqual([]);
    });
  });
  
  describe('getStatusDisplay', () => {
    test('should return human-readable status text', () => {
      expect(orderStatusService.getStatusDisplay(OrderStatus.PENDING)).toBe('Pending');
      expect(orderStatusService.getStatusDisplay(OrderStatus.PROCESSING)).toBe('Processing');
      expect(orderStatusService.getStatusDisplay(OrderStatus.DELIVERED)).toBe('Delivered');
      expect(orderStatusService.getStatusDisplay(OrderStatus.CANCELLED)).toBe('Cancelled');
    });
  });
  
  describe('getStatusStyles', () => {
    test('should return appropriate styling for each status', () => {
      // Check PENDING styles
      const pendingStyles = orderStatusService.getStatusStyles(OrderStatus.PENDING);
      expect(pendingStyles.variant).toBe('outline');
      expect(pendingStyles.className).toContain('yellow');
      
      // Check DELIVERED styles
      const deliveredStyles = orderStatusService.getStatusStyles(OrderStatus.DELIVERED);
      expect(deliveredStyles.variant).toBe('outline');
      expect(deliveredStyles.className).toContain('green');
      
      // Check CANCELLED styles
      const cancelledStyles = orderStatusService.getStatusStyles(OrderStatus.CANCELLED);
      expect(cancelledStyles.variant).toBe('outline');
      expect(cancelledStyles.className).toContain('red');
    });
  });
});
