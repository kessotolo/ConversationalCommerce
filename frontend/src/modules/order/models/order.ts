/**
 * Order Models
 * 
 * These models define the order processing functionality for the
 * Conversational Commerce platform, optimized for WhatsApp-based
 * purchasing flows.
 */

import { Entity, Money, TenantScoped, UUID } from '../../core/models/base';

/**
 * Order
 * Represents a customer order in the system
 */
export interface Order extends TenantScoped {
  orderNumber: string;
  customerId: UUID;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: Money;
  shippingCost: Money;
  tax: Money;
  discount: Money;
  total: Money;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  shippingAddress?: Address;
  billingAddress?: Address;
  customerNotes?: string;
  merchantNotes?: string;
  source: OrderSource;
  tags: string[];
  metadata: OrderMetadata;
  conversationId?: UUID;
}

/**
 * Order status
 * The current state of an order
 */
export enum OrderStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  ON_HOLD = 'on_hold'
}

/**
 * Order item
 * A product within an order
 */
export interface OrderItem extends Entity {
  orderId: UUID;
  productId: UUID;
  variantId?: UUID;
  name: string;
  sku?: string;
  quantity: number;
  unitPrice: Money;
  subtotal: Money;
  discount: Money;
  tax: Money;
  total: Money;
  imageUrl?: string;
  customizations?: string;
  metadata?: Record<string, any>;
}

/**
 * Payment status
 * The current state of payment for an order
 */
export enum PaymentStatus {
  PENDING = 'pending',
  AUTHORIZED = 'authorized',
  PAID = 'paid',
  PARTIALLY_PAID = 'partially_paid',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
  FAILED = 'failed'
}

/**
 * Fulfillment status
 * The current state of order fulfillment
 */
export enum FulfillmentStatus {
  UNFULFILLED = 'unfulfilled',
  PARTIALLY_FULFILLED = 'partially_fulfilled',
  FULFILLED = 'fulfilled',
  DELIVERED = 'delivered',
  RETURNED = 'returned',
  PARTIALLY_RETURNED = 'partially_returned'
}

/**
 * Address
 * A physical address
 */
export interface Address {
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
  phone?: string;
  isDefault?: boolean;
}

/**
 * Order source
 * The source channel for an order
 */
export enum OrderSource {
  WHATSAPP = 'whatsapp',
  STOREFRONT = 'storefront',
  INSTAGRAM = 'instagram',
  FACEBOOK = 'facebook',
  MESSENGER = 'messenger',
  SMS = 'sms',
  ADMIN = 'admin',
  POS = 'pos',
  OTHER = 'other'
}

/**
 * Order metadata
 * Additional information about an order
 */
export interface OrderMetadata {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  deviceType?: string;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  offlineCreated?: boolean;
  conversationThreadId?: string;
}

/**
 * Transaction
 * A payment transaction for an order
 */
export interface Transaction extends Entity {
  orderId: UUID;
  amount: Money;
  type: TransactionType;
  status: TransactionStatus;
  gateway: string;
  gatewayTransactionId?: string;
  paymentMethod: PaymentMethod;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

/**
 * Transaction type
 * The type of payment transaction
 */
export enum TransactionType {
  SALE = 'sale',
  AUTHORIZATION = 'authorization',
  CAPTURE = 'capture',
  REFUND = 'refund',
  VOID = 'void'
}

/**
 * Transaction status
 * The status of a payment transaction
 */
export enum TransactionStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILURE = 'failure',
  ERROR = 'error'
}

/**
 * Payment method
 * The method used for payment
 */
export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  MOBILE_MONEY = 'mobile_money',
  BANK_TRANSFER = 'bank_transfer',
  CASH_ON_DELIVERY = 'cash_on_delivery',
  PAYPAL = 'paypal',
  CRYPTO = 'crypto',
  OFFLINE = 'offline',
  OTHER = 'other'
}

/**
 * Fulfillment
 * A shipment or delivery of order items
 */
export interface Fulfillment extends Entity {
  orderId: UUID;
  status: FulfillmentStatus;
  trackingCompany?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  items: FulfillmentItem[];
  notes?: string;
}

/**
 * Fulfillment item
 * An item included in a fulfillment
 */
export interface FulfillmentItem {
  orderItemId: UUID;
  quantity: number;
}
