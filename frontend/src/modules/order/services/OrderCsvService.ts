import { csvService } from '@/modules/core/utils/csv-service';
import type { 
  Order, 
  OrderStatus, 
  PaymentStatus, 
  ShippingMethod 
} from '../models/order';

/**
 * Type defining a simplified order format for CSV export/import
 * Contains flattened order data suitable for tabular representation
 */
export interface OrderCsvFormat {
  order_number: string;
  created_at?: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  status: string;
  payment_status: string;
  total_amount: string;
  currency: string;
  shipping_method: string;
  shipping_address: string;
  tracking_number?: string;
  notes?: string;
  source?: string;
  item_count?: string;
  products?: string;
}

/**
 * Service for handling order CSV import/export operations
 */
export class OrderCsvService {
  // CSV column headers for orders
  private readonly csvHeaders = [
    'order_number',
    'created_at',
    'customer_name',
    'customer_email', 
    'customer_phone',
    'status',
    'payment_status',
    'total_amount',
    'currency',
    'shipping_method',
    'shipping_address',
    'tracking_number',
    'notes',
    'source',
    'item_count',
    'products'
  ];
  
  /**
   * Convert orders to CSV format for export
   * @param orders - Array of orders to export
   * @returns CSV string
   */
  public exportOrdersToCsv(orders: Order[]): string {
    const csvData = this.ordersToFlatFormat(orders);
    return csvService.objectsToCsv(csvData, this.csvHeaders);
  }
  
  /**
   * Download orders as CSV file
   * @param orders - Array of orders to export
   * @param filename - Filename for the downloaded CSV
   */
  public downloadOrdersCsv(orders: Order[], filename = 'orders.csv'): void {
    const csvString = this.exportOrdersToCsv(orders);
    csvService.downloadCsv(csvString, filename);
  }
  
  /**
   * Parse CSV string into order data for import
   * @param csvContent - CSV string containing order data
   * @returns Array of parsed order data in flat format
   */
  public importOrdersFromCsv(csvContent: string): OrderCsvFormat[] {
    return csvService.csvToObjects<OrderCsvFormat>(csvContent, this.csvHeaders);
  }
  
  /**
   * Validate imported order data from CSV
   * @param orderData - Array of order data from CSV import
   * @returns Object with valid orders and validation errors
   */
  public validateImportedOrders(orderData: OrderCsvFormat[]): {
    valid: OrderCsvFormat[];
    errors: Array<{ index: number; message: string }>;
  } {
    const valid: OrderCsvFormat[] = [];
    const errors: Array<{ index: number; message: string }> = [];
    
    orderData.forEach((order, index) => {
      const validationErrors = this.validateOrderData(order);
      
      if (validationErrors.length) {
        errors.push({
          index,
          message: `Row ${index + 1}: ${validationErrors.join(', ')}`,
        });
      } else {
        valid.push(order);
      }
    });
    
    return { valid, errors };
  }
  
  /**
   * Convert raw CSV import data to valid order data format
   * This method can be expanded to include conversion logic
   * @param importedData - Array of order data from CSV import
   * @returns Array of partially formed order objects for API submission
   */
  public convertImportedDataToApiFormat(
    importedData: OrderCsvFormat[]
  ): Partial<Order>[] {
    // This would contain logic for converting the flat CSV format to 
    // the structured Order format required by the API
    // Implementation depends on backend API expectations for bulk imports
    
    // Basic implementation - would need to be expanded based on API requirements
    return importedData.map(data => {
      const partialOrder: Partial<Order> = {
        order_number: data.order_number,
        status: data.status as OrderStatus,
        notes: data.notes,
        customer: {
          name: data.customer_name,
          email: data.customer_email,
          phone: data.customer_phone,
          is_guest: false, // Default value, might need adjustment based on API
        },
      };
      
      // Add other conversions as needed
      
      return partialOrder;
    });
  }
  
  /**
   * Convert orders to flat format suitable for CSV export
   * @param orders - Array of orders to convert
   * @returns Array of flattened order data
   */
  private ordersToFlatFormat(orders: Order[]): OrderCsvFormat[] {
    return orders.map(order => {
      // Format address for CSV
      const addressParts = [
        order.shipping.address.street,
        order.shipping.address.city,
        order.shipping.address.state,
        order.shipping.address.postal_code,
        order.shipping.address.country,
      ].filter(Boolean);
      
      // Format products for CSV (summary format)
      const products = order.items.map(
        item => `${item.product_name} (${item.quantity})`
      ).join('; ');
      
      // Create flattened order object
      return {
        order_number: order.order_number,
        created_at: order.created_at, // Assuming created_at is in the Order interface
        customer_name: order.customer.name,
        customer_email: order.customer.email,
        customer_phone: order.customer.phone,
        status: order.status,
        payment_status: order.payment.status,
        total_amount: order.total_amount.amount.toString(),
        currency: order.total_amount.currency,
        shipping_method: order.shipping.method,
        shipping_address: addressParts.join(', '),
        tracking_number: order.shipping.tracking_number,
        notes: order.notes,
        source: order.source,
        item_count: String(order.items.length),
        products: products,
      };
    });
  }
  
  /**
   * Validate a single order record from CSV
   * @param order - Order data to validate
   * @returns Array of validation error messages or empty if valid
   */
  private validateOrderData(order: OrderCsvFormat): string[] {
    const errors: string[] = [];
    
    // Required fields
    if (!order.order_number) {
      errors.push('Missing order number');
    }
    
    if (!order.customer_name) {
      errors.push('Missing customer name');
    }
    
    if (!order.customer_email) {
      errors.push('Missing customer email');
    } else if (!this.isValidEmail(order.customer_email)) {
      errors.push('Invalid email format');
    }
    
    if (!order.customer_phone) {
      errors.push('Missing customer phone');
    }
    
    // Validate status if present
    if (order.status && !this.isValidOrderStatus(order.status)) {
      errors.push(`Invalid order status: ${order.status}`);
    }
    
    // Validate payment status if present
    if (order.payment_status && !this.isValidPaymentStatus(order.payment_status)) {
      errors.push(`Invalid payment status: ${order.payment_status}`);
    }
    
    return errors;
  }
  
  /**
   * Validate email format
   * @param email - Email to validate
   * @returns Boolean indicating if email is valid
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  /**
   * Check if a status value is a valid OrderStatus
   * @param status - Status to validate
   * @returns Boolean indicating if status is valid
   */
  private isValidOrderStatus(status: string): boolean {
    const validStatuses = [
      'PENDING',
      'PAID',
      'PROCESSING',
      'SHIPPED',
      'DELIVERED',
      'CANCELLED',
      'REFUNDED',
      'FAILED',
    ];
    
    return validStatuses.includes(status);
  }
  
  /**
   * Check if a status value is a valid PaymentStatus
   * @param status - Status to validate
   * @returns Boolean indicating if status is valid
   */
  private isValidPaymentStatus(status: string): boolean {
    const validStatuses = [
      'PENDING',
      'COMPLETED',
      'FAILED',
      'REFUNDED',
      'PARTIALLY_REFUNDED',
    ];
    
    return validStatuses.includes(status);
  }
}

// Export a singleton instance for use throughout the app
export const orderCsvService = new OrderCsvService();
