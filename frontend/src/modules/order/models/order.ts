/**
 * Order domain models and interfaces
 * Core order management types for the application
 */

import type { Address } from '@/modules/core/models/base/address';
import type { TenantScoped, UUID } from '@/modules/core/models/base';
import type { Money } from '@/modules/core/models/base/money';

/**
 * Order status enum representing the order lifecycle
 */
export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  FAILED = 'FAILED',
}

/**
 * Order source enum representing different channels
 */
export enum OrderSource {
  WEBSITE = 'WEBSITE',
  MOBILE_APP = 'MOBILE_APP',
  WHATSAPP = 'WHATSAPP',
  INSTAGRAM = 'INSTAGRAM',
  FACEBOOK = 'FACEBOOK',
  PHONE = 'PHONE',
  IN_PERSON = 'IN_PERSON'
}

/**
 * Payment method enum for different payment options
 */
export enum PaymentMethod {
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  CARD = 'CARD',
  PAYPAL = 'PAYPAL',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CASH_ON_DELIVERY = 'CASH_ON_DELIVERY',
  MOBILE_MONEY = 'MOBILE_MONEY'
}

/**
 * Payment status enum for tracking payment state
 */
export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PAID = 'PAID',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED'
}

/**
 * Shipping method enum for different shipping options
 */
export enum ShippingMethod {
  STANDARD = 'STANDARD',
  EXPRESS = 'EXPRESS',
  OVERNIGHT = 'OVERNIGHT',
  PICKUP = 'PICKUP',
  RIDER = 'RIDER',
  COURIER = 'COURIER'
}

/**
 * Order item representing a product in an order
 */
export interface OrderItem {
  id: string;
  product_id: string;
  variant_id?: string;
  name: string;
  description?: string;
  quantity: number;
  unit_price: Money;
  total_price: Money;
  image_url?: string;
  sku?: string;
  weight?: number;
  weight_unit?: string;
  // Additional properties for return functionality
  product_name?: string;
  product_image?: string;
  variant_name?: string;
  returned_quantity?: number;
  created_at: string;
  updated_at: string;
}

/**
 * Shipping plugin meta information
 */
export interface ShippingPluginMeta {
  provider: string; // e.g. 'Sendy', 'DHL', 'CustomPluginName'
  pluginData?: Record<string, unknown>;
}

/**
 * Shipping details for an order
 */
export interface ShippingDetails {
  address: Address;
  method: ShippingMethod | string;
  pluginMeta?: ShippingPluginMeta;
  tracking_number?: string;
  estimated_delivery?: string;
  shipping_cost: Money;
  notes?: string;
}

/**
 * Payment details for an order
 */
export interface PaymentDetails {
  method: PaymentMethod;
  status: PaymentStatus;
  transaction_id?: string;
  provider?: string;
  amount_paid: Money;
  payment_date?: string;
  receipt_url?: string;
  last_four?: string; // For card payments
  phone_number?: string; // For mobile money
}

/**
 * Customer information for an order
 */
export interface CustomerInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
  is_guest: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Order timeline entry for tracking order history
 */
export interface OrderTimeline {
  id: string;
  order_id: string;
  status: OrderStatus;
  timestamp: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

/**
 * Complete Order domain model with all details
 * Implements TenantScoped for multi-tenant isolation
 */
export interface Order extends TenantScoped {
  id: UUID;
  tenant_id: UUID;         // Merchant ID for tenant isolation
  order_number: string;
  customer: CustomerInfo;
  items: OrderItem[];
  total_amount: Money;
  subtotal: Money;
  tax: Money;
  status: OrderStatus;
  source: OrderSource;
  shipping: ShippingDetails;
  payment: PaymentDetails;
  notes?: string;
  metadata?: Record<string, unknown>;
  timeline: OrderTimeline[];
  idempotency_key: string;
  created_at: string;
  updated_at?: string; // Used to prevent duplicate orders
}

/**
 * Domain methods for the Order model
 */
export const OrderDomainMethods = {
  /**
   * Check if an order can be cancelled
   */
  canBeCancelled(order: Order): boolean {
    return [OrderStatus.PENDING, OrderStatus.PAID].includes(order.status);
  },

  /**
   * Check if an order can be refunded
   */
  canBeRefunded(order: Order): boolean {
    return (
      [OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.SHIPPED].includes(order.status) &&
      order.payment.status === PaymentStatus.COMPLETED
    );
  },

  /**
   * Check if an order has been completed
   */
  isComplete(order: Order): boolean {
    return order.status === OrderStatus.DELIVERED;
  },

  /**
   * Calculate the total items in an order
   */
  getTotalItems(order: Order): number {
    return order.items.reduce((total, item) => total + item.quantity, 0);
  },

  /**
   * Get the latest timeline event
   */
  getLatestTimelineEvent(order: Order): OrderTimeline | undefined {
    if (!order.timeline.length) return undefined;

    return [...order.timeline].sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    })[0];
  },
};
