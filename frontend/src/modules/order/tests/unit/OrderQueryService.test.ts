import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { OrderQueryService } from '../../services/OrderQueryService';
import { Order, OrderStatus } from '../../models/order';
import { ApiResponse } from '@/lib/api-types';

// Mock API client
const mockGet = jest.fn();
const mockPut = jest.fn();
const mockPost = jest.fn();
const mockDelete = jest.fn();
const mockPatch = jest.fn();

// Mock the api-client module
jest.mock('@/lib/api-client', () => ({
  createApiClient: jest.fn().mockReturnValue({
    get: mockGet,
    put: mockPut,
    post: mockPost,
    delete: mockDelete,
    patch: mockPatch
  })
}));

describe('OrderQueryService', () => {
  let orderQueryService: OrderQueryService;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create a new instance for each test
    orderQueryService = new OrderQueryService();
  });

  describe('queryOrders', () => {
    test('should properly format query parameters and call apiClient.get', async () => {
      // Arrange
      const mockOrdersData = {
        items: [
          { 
            id: 'order1',
            tenant_id: 'tenant123',
            status: OrderStatus.PENDING,
            order_number: '001',
            customer: {
              name: 'Test Customer',
              email: 'test@example.com',
              phone: '+1234567890',
              is_guest: false
            },
            items: [],
            total_amount: { currency: 'USD', amount: 100 },
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z'
          },
          {
            id: 'order2',
            tenant_id: 'tenant123',
            status: OrderStatus.DELIVERED,
            order_number: '002',
            customer: {
              name: 'Test Customer',
              email: 'test@example.com',
              phone: '+1234567890',
              is_guest: false
            },
            items: [],
            total_amount: { currency: 'USD', amount: 150 },
            created_at: '2023-01-02T00:00:00Z',
            updated_at: '2023-01-02T00:00:00Z'
          }
        ],
        total: 2
      };
      
      const successResponse = {
        success: true,
        data: mockOrdersData
      };
      
      mockGet.mockReturnValue(Promise.resolve(successResponse));

      const params = {
        tenantId: 'tenant123',
        status: OrderStatus.PENDING,
        limit: 10,
        offset: 0
      };

      // Act
      const result = await orderQueryService.queryOrders(params);

      // Assert
      expect(mockGet).toHaveBeenCalledWith(
        '/api/orders?tenant_id=tenant123&status=PENDING&limit=10&offset=0',
        expect.any(Object)
      );
      expect(result).toEqual(successResponse);
    });

    test('should support both search and searchTerm parameters', async () => {
      // Arrange
      const mockOrderData = {
        items: [{ 
          id: 'order1',
          tenant_id: 'tenant123', 
          status: OrderStatus.PENDING, 
          order_number: '001',
          customer: {
            name: 'Test Customer',
            email: 'test@example.com',
            phone: '+1234567890',
            is_guest: false
          },
          items: [], 
          total_amount: { currency: 'USD', amount: 100 }, 
          created_at: '2023-01-01T00:00:00Z', 
          updated_at: '2023-01-01T00:00:00Z' 
        }],
        total: 1
      };
      
      const successResponse = {
        success: true,
        data: mockOrderData
      };
      
      mockGet.mockReturnValue(Promise.resolve(successResponse));

      const params = {
        tenantId: 'tenant123',
        searchTerm: 'test search' // Using searchTerm instead of search
      };

      // Act
      const result = await orderQueryService.queryOrders(params);

      // Assert
      expect(mockGet).toHaveBeenCalledWith(
        '/api/orders?tenant_id=tenant123&search=test+search', // Should convert searchTerm to search parameter
        expect.any(Object)
      );
      expect(result).toEqual(successResponse);
    });
  });

  describe('getOrderById', () => {
    test('should call apiClient.get with correct parameters', async () => {
      // Arrange
      const mockOrder = { 
        id: 'order123',
        tenant_id: 'tenant123',
        status: OrderStatus.DELIVERED,
        order_number: '123',
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
      };
      
      const successResponse = {
        success: true,
        data: mockOrder
      };
      
      mockGet.mockReturnValue(Promise.resolve(successResponse));

      // Act
      const result = await orderQueryService.getOrderById('order123', 'tenant123');

      // Assert
      expect(mockGet).toHaveBeenCalledWith(
        '/api/orders/order123?tenant_id=tenant123',
        expect.any(Object)
      );
      expect(result).toEqual(successResponse);
    });

    test('should propagate error responses from apiClient', async () => {
      // Arrange
      const errorResponse = {
        success: false,
        error: {
          message: 'Order not found',
          code: 'NOT_FOUND'
        }
      };
      
      mockGet.mockReturnValue(Promise.resolve(errorResponse));

      // Act
      const result = await orderQueryService.getOrderById('nonexistent', 'tenant123');

      // Assert
      expect(mockGet).toHaveBeenCalledWith(
        '/api/orders/nonexistent?tenant_id=tenant123',
        expect.any(Object)
      );
      expect(result).toEqual(errorResponse);
    });
  });
});
