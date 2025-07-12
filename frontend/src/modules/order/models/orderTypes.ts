/**
 * Type definitions for order-related entities
 * Improves type safety by removing 'unknown' types
 */
import type { UUID } from '@/modules/core/models/base';
import type { Money } from '@/modules/core/models/base/money';

/**
 * Order timeline event interface
 */
export interface OrderTimelineEvent {
  id: UUID;
  order_id: UUID;
  event_type: string;
  timestamp: string;
  user_id?: string;
  details: {
    status?: string;
    notes?: string;
    payment_status?: string;
    shipping_status?: string;
    [key: string]: unknown;
  };
}

/**
 * Payment details interface for order payments
 */
export interface OrderPaymentDetails {
  payment_method: 'card' | 'mobile_money' | 'cash' | 'bank_transfer' | string;
  payment_provider?: string;
  transaction_id?: string;
  amount: Money;
  status: 'pending' | 'completed' | 'failed' | 'refunded' | string;
  receipt_number?: string;
  payer_name?: string;
  payer_phone?: string;
  payer_email?: string;
  payment_date?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Shipping details interface for order fulfillment
 */
export interface OrderShippingDetails {
  carrier?: string;
  tracking_number?: string;
  shipping_method: 'pickup' | 'delivery' | 'courier' | string;
  estimated_delivery?: string;
  actual_delivery?: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'returned' | string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postal_code?: string;
    country: string;
    latitude?: number;
    longitude?: number;
    instructions?: string;
  };
  contact: {
    name: string;
    phone: string;
    email?: string;
  };
  notes?: string;
  metadata?: Record<string, unknown>;
}
