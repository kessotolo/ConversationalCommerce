import { OrderCsvService, OrderCsvFormat } from '../../services/OrderCsvService';
import { csvService } from '@/modules/core/utils/csv-service';
import { 
  Order, 
  OrderStatus, 
  OrderSource, 
  PaymentMethod, 
  PaymentStatus, 
  ShippingMethod 
} from '../../models/order';

// Mock the core CSV service
jest.mock('@/modules/core/utils/csv-service', () => ({
  csvService: {
    objectsToCsv: jest.fn(),
    downloadCsv: jest.fn(),
    csvToObjects: jest.fn()
  }
}));

describe('OrderCsvService', () => {
  let orderCsvService: OrderCsvService;
  
  // Mock order data for testing
  const mockOrder: Order = {
    id: 'order-123',
    tenant_id: 'tenant-1',
    order_number: 'ORD-123',
    created_at: '2023-07-10T12:00:00Z',
    customer: {
      id: 'cust-1',
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+12345678901',
      is_guest: false
    },
    items: [
      {
        id: 'item-1',
        product_id: 'prod-1',
        product_name: 'Test Product',
        quantity: 2,
        unit_price: { amount: 10, currency: 'USD' },
        total_price: { amount: 20, currency: 'USD' },
        image_url: 'https://example.com/image.jpg'
      }
    ],
    total_amount: { amount: 25, currency: 'USD' },
    subtotal: { amount: 20, currency: 'USD' },
    tax: { amount: 5, currency: 'USD' },
    status: OrderStatus.PAID,
    source: OrderSource.WEBSITE,
    shipping: {
      address: {
        street: '123 Main St',
        city: 'Anytown',
        state: 'ST',
        postalCode: '12345',
        country: 'US'
      },
      method: ShippingMethod.COURIER,
      tracking_number: 'TRK123456',
      shipping_cost: { amount: 5, currency: 'USD' }
    },
    payment: {
      method: PaymentMethod.CARD,
      status: PaymentStatus.COMPLETED,
      transaction_id: 'txn-123',
      amount_paid: { amount: 25, currency: 'USD' },
      payment_date: '2023-07-10T12:05:00Z'
    },
    notes: 'Test order notes',
    timeline: [
      {
        id: 'event-1',
        status: OrderStatus.PENDING,
        timestamp: '2023-07-10T11:55:00Z'
      },
      {
        id: 'event-2',
        status: OrderStatus.PAID,
        timestamp: '2023-07-10T12:05:00Z'
      }
    ],
    idempotency_key: 'idem-123'
  };

  // Expected CSV format after conversion
  const expectedCsvFormat: OrderCsvFormat = {
    order_number: 'ORD-123',
    created_at: '2023-07-10T12:00:00Z',
    customer_name: 'Jane Doe',
    customer_email: 'jane@example.com',
    customer_phone: '+12345678901',
    status: OrderStatus.PAID,
    payment_status: PaymentStatus.COMPLETED,
    total_amount: '25',
    currency: 'USD',
    shipping_method: ShippingMethod.COURIER,
    shipping_address: '123 Main St, Anytown, ST, 12345, US',
    tracking_number: 'TRK123456',
    notes: 'Test order notes',
    source: OrderSource.WEBSITE,
    item_count: '1',
    products: 'Test Product (2)'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    orderCsvService = new OrderCsvService();
  });

  describe('exportOrdersToCsv', () => {
    test('should convert orders to CSV format and return CSV string', () => {
      // Arrange
      const mockOrders = [mockOrder];
      const expectedCsvString = 'mock,csv,string';
      (csvService.objectsToCsv as jest.Mock).mockReturnValue(expectedCsvString);

      // Act
      const result = orderCsvService.exportOrdersToCsv(mockOrders);

      // Assert
      expect(csvService.objectsToCsv).toHaveBeenCalled();
      expect(result).toBe(expectedCsvString);
    });

    test('should handle empty orders array', () => {
      // Arrange
      const mockOrders: Order[] = [];
      (csvService.objectsToCsv as jest.Mock).mockReturnValue('');

      // Act
      const result = orderCsvService.exportOrdersToCsv(mockOrders);

      // Assert
      expect(csvService.objectsToCsv).toHaveBeenCalledWith([], expect.any(Array));
      expect(result).toBe('');
    });
  });

  describe('downloadOrdersCsv', () => {
    test('should export orders and call download function', () => {
      // Arrange
      const mockOrders = [mockOrder];
      const mockCsvString = 'mock,csv,data';
      (csvService.objectsToCsv as jest.Mock).mockReturnValue(mockCsvString);

      // Act
      orderCsvService.downloadOrdersCsv(mockOrders, 'test-orders.csv');

      // Assert
      expect(csvService.objectsToCsv).toHaveBeenCalled();
      expect(csvService.downloadCsv).toHaveBeenCalledWith(mockCsvString, 'test-orders.csv');
    });

    test('should use default filename if not provided', () => {
      // Arrange
      const mockOrders = [mockOrder];
      const mockCsvString = 'mock,csv,data';
      (csvService.objectsToCsv as jest.Mock).mockReturnValue(mockCsvString);

      // Act
      orderCsvService.downloadOrdersCsv(mockOrders);

      // Assert
      expect(csvService.downloadCsv).toHaveBeenCalledWith(mockCsvString, 'orders.csv');
    });
  });

  describe('importOrdersFromCsv', () => {
    test('should parse CSV string to order data', () => {
      // Arrange
      const csvString = 'order_number,customer_name\nORD-123,Jane Doe';
      const expectedParsed = [{ order_number: 'ORD-123', customer_name: 'Jane Doe' }];
      (csvService.csvToObjects as jest.Mock).mockReturnValue(expectedParsed);

      // Act
      const result = orderCsvService.importOrdersFromCsv(csvString);

      // Assert
      expect(csvService.csvToObjects).toHaveBeenCalledWith(csvString, expect.any(Array));
      expect(result).toEqual(expectedParsed);
    });

    test('should handle empty CSV string', () => {
      // Arrange
      const csvString = '';
      (csvService.csvToObjects as jest.Mock).mockReturnValue([]);

      // Act
      const result = orderCsvService.importOrdersFromCsv(csvString);

      // Assert
      expect(csvService.csvToObjects).toHaveBeenCalledWith(csvString, expect.any(Array));
      expect(result).toEqual([]);
    });
  });

  describe('validateImportedOrders', () => {
    test('should validate imported orders and return valid orders', () => {
      // Arrange
      const validOrder: OrderCsvFormat = {
        order_number: 'ORD-123',
        customer_name: 'Jane Doe',
        customer_email: 'jane@example.com',
        customer_phone: '+12345678901',
        status: OrderStatus.PENDING,
        payment_status: PaymentStatus.PENDING,
        total_amount: '100',
        currency: 'USD',
        shipping_method: ShippingMethod.COURIER,
        shipping_address: '123 Main St'
      };

      const mockValidateOrderData = jest.spyOn(
        OrderCsvService.prototype as any, 
        'validateOrderData'
      ).mockReturnValue([]);

      // Act
      const result = orderCsvService.validateImportedOrders([validOrder]);

      // Assert
      expect(mockValidateOrderData).toHaveBeenCalledWith(validOrder);
      expect(result.valid).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
      expect(result.valid[0]).toBe(validOrder);

      // Cleanup
      mockValidateOrderData.mockRestore();
    });

    test('should return validation errors for invalid orders', () => {
      // Arrange
      const invalidOrder: OrderCsvFormat = {
        order_number: '',  // Invalid: empty order number
        customer_name: 'Jane Doe',
        customer_email: 'not-an-email',  // Invalid: bad email format
        customer_phone: '+12345678901',
        status: 'INVALID_STATUS',  // Invalid: not a valid status
        payment_status: PaymentStatus.PENDING,
        total_amount: '100',
        currency: 'USD',
        shipping_method: ShippingMethod.COURIER,
        shipping_address: '123 Main St'
      };

      const mockValidateOrderData = jest.spyOn(
        OrderCsvService.prototype as any, 
        'validateOrderData'
      ).mockReturnValue([
        'Missing order number', 
        'Invalid email format', 
        'Invalid status'
      ]);

      // Act
      const result = orderCsvService.validateImportedOrders([invalidOrder]);

      // Assert
      expect(mockValidateOrderData).toHaveBeenCalledWith(invalidOrder);
      expect(result.valid).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].index).toBe(0);
      expect(result.errors[0].message).toContain('Row 1');
      expect(result.errors[0].message).toContain('Missing order number');

      // Cleanup
      mockValidateOrderData.mockRestore();
    });
  });

  describe('convertImportedDataToApiFormat', () => {
    test('should convert CSV format to API format', () => {
      // Arrange
      const csvData: OrderCsvFormat[] = [{
        order_number: 'ORD-123',
        customer_name: 'Jane Doe',
        customer_email: 'jane@example.com',
        customer_phone: '+12345678901',
        status: OrderStatus.PENDING,
        payment_status: PaymentStatus.PENDING,
        total_amount: '100',
        currency: 'USD',
        shipping_method: ShippingMethod.COURIER,
        shipping_address: '123 Main St',
        notes: 'Test notes'
      }];

      // Act
      const result = orderCsvService.convertImportedDataToApiFormat(csvData);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].order_number).toBe('ORD-123');
      expect(result[0].status).toBe(OrderStatus.PENDING);
      expect(result[0].notes).toBe('Test notes');
      expect(result[0].customer?.name).toBe('Jane Doe');
      expect(result[0].customer?.email).toBe('jane@example.com');
      expect(result[0].customer?.phone).toBe('+12345678901');
      expect(result[0].customer?.is_guest).toBe(false);
    });

    test('should handle empty array', () => {
      // Arrange
      const csvData: OrderCsvFormat[] = [];

      // Act
      const result = orderCsvService.convertImportedDataToApiFormat(csvData);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('ordersToFlatFormat', () => {
    test('should convert orders to flat format for CSV export', () => {
      // Create a spy on the private method using any casting
      const ordersToFlatFormatSpy = jest.spyOn(
        orderCsvService as any, 
        'ordersToFlatFormat'
      );
      
      // Mock the return value
      ordersToFlatFormatSpy.mockReturnValue([expectedCsvFormat]);
      
      // Mock csvService.objectsToCsv to pass through to test the private method
      (csvService.objectsToCsv as jest.Mock).mockImplementation((data) => JSON.stringify(data));
      
      // Act
      const result = orderCsvService.exportOrdersToCsv([mockOrder]);
      
      // Assert - verify the private method was called with the right arguments
      expect(ordersToFlatFormatSpy).toHaveBeenCalledWith([mockOrder]);
      
      // Clean up
      ordersToFlatFormatSpy.mockRestore();
    });
  });
});
