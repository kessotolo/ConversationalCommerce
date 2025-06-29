import type { Order, OrderStatus, PaymentStatus, ShippingMethod } from '../models/order';
import type { OrderCsvFormat } from './OrderCsvService';

/**
 * Type for validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Type for field-specific validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  index?: number; // For array items
}

/**
 * Service for validating order data in bulk operations
 * Enforces business rules and data integrity
 */
export class OrderBulkValidationService {
  /**
   * Validate fields for batch edit operation
   * @param orderIds - Array of order IDs to update
   * @param fieldsToUpdate - Object containing fields to update
   * @returns ValidationResult with validation status and errors
   */
  validateBatchEdit(
    orderIds: string[],
    fieldsToUpdate: Partial<Order>
  ): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate order IDs
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      errors.push({
        field: 'orderIds',
        message: 'No orders selected for batch edit',
      });
    } else if (orderIds.some(id => !id || typeof id !== 'string')) {
      errors.push({
        field: 'orderIds',
        message: 'Invalid order ID format',
      });
    }

    // Validate fields to update
    if (!fieldsToUpdate || Object.keys(fieldsToUpdate).length === 0) {
      errors.push({
        field: 'fieldsToUpdate',
        message: 'No fields provided to update',
      });
    } else {
      // Validate specific fields if present
      if (fieldsToUpdate.status && !this.isValidOrderStatus(fieldsToUpdate.status)) {
        errors.push({
          field: 'status',
          message: `Invalid order status: ${fieldsToUpdate.status}`,
        });
      }

      if (fieldsToUpdate.shipping) {
        if (fieldsToUpdate.shipping.method && 
            !this.isValidShippingMethod(fieldsToUpdate.shipping.method)) {
          errors.push({
            field: 'shipping.method',
            message: `Invalid shipping method: ${fieldsToUpdate.shipping.method}`,
          });
        }

        if (fieldsToUpdate.shipping.tracking_number && 
            fieldsToUpdate.shipping.tracking_number.length > 100) {
          errors.push({
            field: 'shipping.tracking_number',
            message: 'Tracking number exceeds maximum length',
          });
        }
      }

      if (fieldsToUpdate.payment && 
          fieldsToUpdate.payment.status && 
          !this.isValidPaymentStatus(fieldsToUpdate.payment.status)) {
        errors.push({
          field: 'payment.status',
          message: `Invalid payment status: ${fieldsToUpdate.payment.status}`,
        });
      }

      if (fieldsToUpdate.notes && fieldsToUpdate.notes.length > 5000) {
        errors.push({
          field: 'notes',
          message: 'Order notes exceed maximum length (5000 characters)',
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate bulk status update operation
   * @param orderIds - Array of order IDs to update
   * @param status - New status to apply
   * @returns ValidationResult with validation status and errors
   */
  validateStatusUpdate(orderIds: string[], status: string): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate order IDs
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      errors.push({
        field: 'orderIds',
        message: 'No orders selected for status update',
      });
    }

    // Validate status
    if (!status) {
      errors.push({
        field: 'status',
        message: 'Status is required',
      });
    } else if (!this.isValidOrderStatus(status)) {
      errors.push({
        field: 'status',
        message: `Invalid order status: ${status}`,
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate bulk delete operation
   * @param orderIds - Array of order IDs to delete
   * @returns ValidationResult with validation status and errors
   */
  validateBulkDelete(orderIds: string[]): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate order IDs
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      errors.push({
        field: 'orderIds',
        message: 'No orders selected for deletion',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate imported CSV order data
   * @param orderData - Array of order data from CSV
   * @returns ValidationResult with validation status and detailed errors
   */
  validateImportedOrders(orderData: OrderCsvFormat[]): ValidationResult {
    const errors: ValidationError[] = [];

    if (!orderData || !Array.isArray(orderData)) {
      errors.push({
        field: 'csvData',
        message: 'Invalid CSV data format',
      });
      return {
        isValid: false,
        errors,
      };
    }

    if (orderData.length === 0) {
      errors.push({
        field: 'csvData',
        message: 'CSV contains no records',
      });
      return {
        isValid: false,
        errors,
      };
    }

    // Validate each order in the CSV
    orderData.forEach((order, index) => {
      // Required fields validation
      if (!order.order_number) {
        errors.push({
          field: 'order_number',
          message: 'Missing order number',
          index,
        });
      }

      if (!order.customer_name) {
        errors.push({
          field: 'customer_name',
          message: 'Missing customer name',
          index,
        });
      }

      if (!order.customer_email) {
        errors.push({
          field: 'customer_email',
          message: 'Missing customer email',
          index,
        });
      } else if (!this.isValidEmail(order.customer_email)) {
        errors.push({
          field: 'customer_email',
          message: 'Invalid email format',
          index,
        });
      }

      if (!order.customer_phone) {
        errors.push({
          field: 'customer_phone',
          message: 'Missing customer phone',
          index,
        });
      }

      // Validate status if present
      if (order.status && !this.isValidOrderStatus(order.status)) {
        errors.push({
          field: 'status',
          message: `Invalid order status: ${order.status}`,
          index,
        });
      }

      // Validate payment status if present
      if (order.payment_status && !this.isValidPaymentStatus(order.payment_status)) {
        errors.push({
          field: 'payment_status',
          message: `Invalid payment status: ${order.payment_status}`,
          index,
        });
      }

      // Validate shipping method if present
      if (order.shipping_method && !this.isValidShippingMethod(order.shipping_method)) {
        errors.push({
          field: 'shipping_method',
          message: `Invalid shipping method: ${order.shipping_method}`,
          index,
        });
      }

      // Validate currency if present
      if (order.currency && !this.isValidCurrencyCode(order.currency)) {
        errors.push({
          field: 'currency',
          message: `Invalid currency code: ${order.currency}`,
          index,
        });
      }

      // Validate total amount if present
      if (order.total_amount && !this.isValidDecimal(order.total_amount)) {
        errors.push({
          field: 'total_amount',
          message: 'Total amount must be a valid decimal number',
          index,
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if a status value is a valid OrderStatus
   * @param status - Status to validate
   * @returns Boolean indicating if status is valid
   */
  private isValidOrderStatus(status: string): boolean {
    const validStatuses = Object.values(OrderStatus);
    return validStatuses.includes(status as OrderStatus);
  }

  /**
   * Check if a status value is a valid PaymentStatus
   * @param status - Status to validate
   * @returns Boolean indicating if status is valid
   */
  private isValidPaymentStatus(status: string): boolean {
    const validStatuses = Object.values(PaymentStatus);
    return validStatuses.includes(status as PaymentStatus);
  }

  /**
   * Check if a method value is a valid ShippingMethod
   * @param method - Method to validate
   * @returns Boolean indicating if method is valid
   */
  private isValidShippingMethod(method: string): boolean {
    const validMethods = Object.values(ShippingMethod);
    return validMethods.includes(method as ShippingMethod);
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
   * Validate currency code format (3 uppercase letters)
   * @param code - Currency code to validate
   * @returns Boolean indicating if currency code is valid
   */
  private isValidCurrencyCode(code: string): boolean {
    const currencyCodeRegex = /^[A-Z]{3}$/;
    return currencyCodeRegex.test(code);
  }

  /**
   * Validate decimal number format
   * @param value - Value to validate
   * @returns Boolean indicating if value is a valid decimal
   */
  private isValidDecimal(value: string): boolean {
    const decimalRegex = /^-?\d+(\.\d+)?$/;
    return decimalRegex.test(value);
  }
}

// Export a singleton instance for use throughout the app
export const orderBulkValidationService = new OrderBulkValidationService();
