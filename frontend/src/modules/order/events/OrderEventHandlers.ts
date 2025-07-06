import type {
  OrderCreatedEvent,
  OrderStatusChangedEvent,
  PaymentProcessedEvent,
  OrderShippedEvent,
  OrderDeliveredEvent,
  OrderCancelledEvent,
} from '@/modules/order/models/events/orderEvents';

import { getEventBus } from './EventBus';

/**
 * Initialize order event handlers
 * Registers handlers for different order events to execute side-effects
 */
export function initializeOrderEventHandlers(): () => void {
  const eventBus = getEventBus();

  // Create individual subscriptions
  const unsubscribeOrderCreated = eventBus.subscribe<OrderCreatedEvent>(
    'ORDER_CREATED',
    handleOrderCreated,
  );

  const unsubscribeStatusChanged = eventBus.subscribe<OrderStatusChangedEvent>(
    'ORDER_STATUS_CHANGED',
    handleOrderStatusChanged,
  );

  const unsubscribePaymentProcessed = eventBus.subscribe<PaymentProcessedEvent>(
    'PAYMENT_PROCESSED',
    handlePaymentProcessed,
  );

  const unsubscribeOrderShipped = eventBus.subscribe<OrderShippedEvent>(
    'ORDER_SHIPPED',
    handleOrderShipped,
  );

  const unsubscribeOrderDelivered = eventBus.subscribe<OrderDeliveredEvent>(
    'ORDER_DELIVERED',
    handleOrderDelivered,
  );

  const unsubscribeOrderCancelled = eventBus.subscribe<OrderCancelledEvent>(
    'ORDER_CANCELLED',
    handleOrderCancelled,
  );

  // Return combined unsubscribe function
  return () => {
    unsubscribeOrderCreated();
    unsubscribeStatusChanged();
    unsubscribePaymentProcessed();
    unsubscribeOrderShipped();
    unsubscribeOrderDelivered();
    unsubscribeOrderCancelled();
  };
}

/**
 * Handle order created events
 * - Update UI
 * - Show notifications
 * - Update analytics
 */
async function handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
  console.log('[OrderEvent] Order created:', event.order_number);

  try {
    // Show notification
    if (typeof window !== 'undefined' && 'Notification' in window) {
      showNotification('Order Created', `Your order #${event.order_number} has been created`);
    }

    // Track analytics
    trackOrderEvent('order_created', {
      order_id: event.order_id,
      order_number: event.order_number,
      value: event.order.total_amount.amount,
      currency: event.order.total_amount.currency,
      items: event.order.items.length,
    });

    // Additional side effects...
  } catch (error) {
    console.error('Error handling order created event:', error);
  }
}

/**
 * Handle order status changed events
 * - Update UI
 * - Show notifications
 */
async function handleOrderStatusChanged(event: OrderStatusChangedEvent): Promise<void> {
  console.log(
    `[OrderEvent] Order ${event.order_number} status changed: ${event.previous_status} -> ${event.new_status}`,
  );

  try {
    // Show notification
    if (typeof window !== 'undefined' && 'Notification' in window) {
      showNotification(
        'Order Status Updated',
        `Your order #${event.order_number} is now ${event.new_status}`,
      );
    }

    // Track status change
    trackOrderEvent('order_status_changed', {
      order_id: event.order_id,
      order_number: event.order_number,
      previous_status: event.previous_status,
      new_status: event.new_status,
    });

    // Additional side effects based on the specific status...
  } catch (error) {
    console.error('Error handling order status changed event:', error);
  }
}

/**
 * Handle payment processed events
 */
async function handlePaymentProcessed(event: PaymentProcessedEvent): Promise<void> {
  console.log(
    `[OrderEvent] Payment processed for order ${event.order_number}: ${event.payment_status}`,
  );

  try {
    // Show notification
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const message =
        event.payment_status === 'COMPLETED'
          ? `Payment of ${event.amount.amount} ${event.amount.currency} was successful`
          : `Payment for order #${event.order_number} failed`;

      showNotification('Payment Update', message);
    }

    // Track payment
    trackOrderEvent('payment_processed', {
      order_id: event.order_id,
      order_number: event.order_number,
      status: event.payment_status,
      amount: event.amount.amount,
      currency: event.amount.currency,
      payment_method: event.payment_method,
    });
  } catch (error) {
    console.error('Error handling payment processed event:', error);
  }
}

/**
 * Handle order shipped events
 */
async function handleOrderShipped(event: OrderShippedEvent): Promise<void> {
  console.log(`[OrderEvent] Order ${event.order_number} shipped`);

  try {
    // Show notification with tracking info
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const message = event.tracking_number
        ? `Your order #${event.order_number} has shipped. Tracking: ${event.tracking_number}`
        : `Your order #${event.order_number} has shipped`;

      showNotification('Order Shipped', message);
    }

    // Track shipment
    trackOrderEvent('order_shipped', {
      order_id: event.order_id,
      order_number: event.order_number,
      tracking_number: event.tracking_number,
      shipping_provider: event.shipping_provider,
    });
  } catch (error) {
    console.error('Error handling order shipped event:', error);
  }
}

/**
 * Handle order delivered events
 */
async function handleOrderDelivered(event: OrderDeliveredEvent): Promise<void> {
  console.log(`[OrderEvent] Order ${event.order_number} delivered`);

  try {
    // Show notification
    if (typeof window !== 'undefined' && 'Notification' in window) {
      showNotification('Order Delivered', `Your order #${event.order_number} has been delivered!`);
    }

    // Track delivery
    trackOrderEvent('order_delivered', {
      order_id: event.order_id,
      order_number: event.order_number,
      delivery_date: event.delivery_date,
    });

    // Prompt for review after delivery
    setTimeout(() => {
      // Could show review prompt
    }, 3000);
  } catch (error) {
    console.error('Error handling order delivered event:', error);
  }
}

/**
 * Handle order cancelled events
 */
async function handleOrderCancelled(event: OrderCancelledEvent): Promise<void> {
  console.log(`[OrderEvent] Order ${event.order_number} cancelled`);

  try {
    // Show notification
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const reason = event.cancellation_reason ? ` Reason: ${event.cancellation_reason}` : '';

      showNotification(
        'Order Cancelled',
        `Your order #${event.order_number} has been cancelled.${reason}`,
      );
    }

    // Track cancellation
    trackOrderEvent('order_cancelled', {
      order_id: event.order_id,
      order_number: event.order_number,
      reason: event.cancellation_reason,
      refund_initiated: event.refund_initiated,
    });
  } catch (error) {
    console.error('Error handling order cancelled event:', error);
  }
}

/**
 * Show a browser notification
 * With fallback to console for browsers without permission
 */
function showNotification(title: string, message: string): void {
  // Only run in browser environment
  if (typeof window === 'undefined') return;

  // Check if browser supports notifications
  if (!('Notification' in window)) {
    console.log(`${title}: ${message}`);
    return;
  }

  // Show notification if permission granted
  if (Notification.permission === 'granted') {
    new Notification(title, { body: message });
  }
  // Request permission if not determined
  else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        new Notification(title, { body: message });
      }
    });
  }
}

/**
 * Track order events for analytics
 * Implements offline resilience for African markets
 */
function trackOrderEvent(eventName: string, properties: Record<string, unknown>): void {
  try {
    // If analytics is available, track the event
    if (typeof window !== 'undefined' && window.analytics) {
      window.analytics.track(eventName, properties);
      return;
    }

    // Offline fallback - store events to send later
    if (typeof window !== 'undefined') {
      const events = JSON.parse(localStorage.getItem('offline_analytics') || '[]');
      events.push({
        event: eventName,
        properties,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem('offline_analytics', JSON.stringify(events));

      // Process offline events when online
      if (!window.__analyticsOnlineListener) {
        window.__analyticsOnlineListener = true;
        window.addEventListener('online', processOfflineAnalytics);
      }
    }
  } catch (error) {
    console.error('Error tracking order event:', error);
  }
}

/**
 * Process offline analytics events when connection is restored
 */
function processOfflineAnalytics(): void {
  if (typeof window === 'undefined' || !window.analytics) return;

  try {
    const events = JSON.parse(localStorage.getItem('offline_analytics') || '[]');
    if (events.length === 0) return;

    // Process each event
    events.forEach((event: { event: string; properties: Record<string, unknown>; timestamp: string }) => {
      window.analytics?.track(event.event, {
        ...event.properties,
        offline_tracked_at: event.timestamp,
      });
    });

    // Clear the offline events
    localStorage.setItem('offline_analytics', '[]');
  } catch (error) {
    console.error('Error processing offline analytics:', error);
  }
}

// Add global types
declare global {
  interface Window {
    analytics?: {
      track: (event: string, properties?: Record<string, unknown>) => void;
    };
    __analyticsOnlineListener?: boolean;
  }
}
