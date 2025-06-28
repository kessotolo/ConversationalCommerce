import type { Address } from '@/modules/core/models/base/address';
import type { TenantScoped } from '@/modules/core/models/base';
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
  WHATSAPP = 'WHATSAPP',
  WEBSITE = 'WEBSITE',
  INSTAGRAM = 'INSTAGRAM',
}

/**
 * Payment method enum for different payment options
 */
export enum PaymentMethod {
  CARD = 'CARD',
  MOBILE_MONEY = 'MOBILE_MONEY',
  CASH_ON_DELIVERY = 'CASH_ON_DELIVERY',
  BANK_TRANSFER = 'BANK_TRANSFER',
  USSD = 'USSD',
}

/**
 * Payment status enum for tracking payment state
 */
export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

/**
 * Shipping method enum for different shipping options
 */
export enum ShippingMethod {
  RIDER = 'rider',
  COURIER = 'courier',
  PICKUP = 'pickup',
  BODA = 'boda',
  BUS_PARCEL = 'bus_parcel',
  IN_PERSON = 'in_person',
  OTHER = 'other',
}

/**
 * Order item representing a product in an order
 */
export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: Money;
  total_price: Money;
  variant_id?: string;
  variant_name?: string;
  image_url?: string;
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
  id?: string; // Optional for guest checkout
  name: string;
  email: string;
  phone: string;
  is_guest: boolean;
}

/**
 * Order timeline entry for tracking order history
 */
export interface OrderTimeline {
  id: string;
  status: OrderStatus;
  timestamp: string;
  note?: string;
  created_by?: string;
}

/**
 * Complete Order domain model with all details
 */
export interface Order extends TenantScoped {
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
  idempotency_key: string; // Used to prevent duplicate orders
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
