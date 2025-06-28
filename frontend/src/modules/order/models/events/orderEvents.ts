import type { Order, OrderStatus, PaymentStatus } from '@/modules/order/models/order';

/**
 * Base interface for all domain events
 */
export interface DomainEvent {
  event_type: string;
  timestamp: string;
  tenant_id: string;
  event_id: string;
  event_metadata?: Record<string, unknown>;
}

/**
 * Base class for all order events
 */
export interface OrderEvent extends DomainEvent {
  order_id: string;
  order_number: string;
}

/**
 * Event emitted when a new order is created
 */
export interface OrderCreatedEvent extends OrderEvent {
  event_type: 'ORDER_CREATED';
  order: Order;
}

/**
 * Event emitted when an order status changes
 */
export interface OrderStatusChangedEvent extends OrderEvent {
  event_type: 'ORDER_STATUS_CHANGED';
  previous_status: OrderStatus;
  new_status: OrderStatus;
  changed_by?: string;
  notes?: string;
}

/**
 * Event emitted when a payment is processed
 */
export interface PaymentProcessedEvent extends OrderEvent {
  event_type: 'PAYMENT_PROCESSED';
  payment_status: PaymentStatus;
  amount: {
    amount: number;
    currency: string;
  };
  transaction_id?: string;
  payment_method: string;
  payment_provider?: string;
}

/**
 * Event emitted when an order is shipped
 */
export interface OrderShippedEvent extends OrderEvent {
  event_type: 'ORDER_SHIPPED';
  tracking_number?: string;
  shipping_provider?: string;
  estimated_delivery_date?: string;
}

/**
 * Event emitted when an order is delivered
 */
export interface OrderDeliveredEvent extends OrderEvent {
  event_type: 'ORDER_DELIVERED';
  delivery_date: string;
  received_by?: string;
  delivery_notes?: string;
}

/**
 * Event emitted when an order is cancelled
 */
export interface OrderCancelledEvent extends OrderEvent {
  event_type: 'ORDER_CANCELLED';
  cancellation_reason?: string;
  cancelled_by?: string;
  refund_initiated?: boolean;
}

/**
 * Event emitted when an order is refunded
 */
export interface OrderRefundedEvent extends OrderEvent {
  event_type: 'ORDER_REFUNDED';
  refund_amount: {
    amount: number;
    currency: string;
  };
  refund_reason?: string;
  refund_transaction_id?: string;
  is_partial_refund: boolean;
}

/**
 * Union type of all order events
 */
export type OrderEventUnion =
  | OrderCreatedEvent
  | OrderStatusChangedEvent
  | PaymentProcessedEvent
  | OrderShippedEvent
  | OrderDeliveredEvent
  | OrderCancelledEvent
  | OrderRefundedEvent;

/**
 * Factory functions to create order events
 */
export const OrderEventFactory = {
  createOrderCreatedEvent(order: Order, metadata?: Record<string, unknown>): OrderCreatedEvent {
    return {
      event_type: 'ORDER_CREATED',
      event_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      tenant_id: order.tenant_id,
      order_id: order.id,
      order_number: order.order_number,
      order,
      ...(metadata !== undefined ? { event_metadata: metadata } : {}),
    };
  },

  createOrderStatusChangedEvent(
    order: Order,
    previousStatus: OrderStatus,
    newStatus: OrderStatus,
    changedBy?: string,
    notes?: string,
    metadata?: Record<string, unknown>,
  ): OrderStatusChangedEvent {
    return {
      event_type: 'ORDER_STATUS_CHANGED',
      event_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      tenant_id: order.tenant_id,
      order_id: order.id,
      order_number: order.order_number,
      previous_status: previousStatus,
      new_status: newStatus,
      ...(changedBy !== undefined ? { changed_by: changedBy } : {}),
      ...(notes !== undefined ? { notes } : {}),
      ...(metadata !== undefined ? { event_metadata: metadata } : {}),
    };
  },

  createPaymentProcessedEvent(
    order: Order,
    paymentStatus: PaymentStatus,
    amount: { amount: number; currency: string },
    transactionId?: string,
    paymentMethod?: string,
    paymentProvider?: string,
    metadata?: Record<string, unknown>,
  ): PaymentProcessedEvent {
    return {
      event_type: 'PAYMENT_PROCESSED',
      event_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      tenant_id: order.tenant_id,
      order_id: order.id,
      order_number: order.order_number,
      payment_status: paymentStatus,
      amount,
      ...(transactionId !== undefined ? { transaction_id: transactionId } : {}),
      payment_method: paymentMethod || order.payment.method,
      ...(paymentProvider !== undefined ? { payment_provider: paymentProvider } : {}),
      ...(metadata !== undefined ? { event_metadata: metadata } : {}),
    };
  },
};
