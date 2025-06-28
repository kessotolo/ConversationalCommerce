import type { DomainEvent, OrderEventUnion } from '@/modules/order/models/events/orderEvents';

/**
 * Event handler type definition
 */
export type EventHandler<T extends DomainEvent> = (event: T) => Promise<void> | void;

/**
 * EventBus for publishing and subscribing to domain events
 * Following the event-driven architecture approach
 */
export class EventBus {
  private static instance: EventBus;
  // Store handlers as functions accepting DomainEvent for type safety
  private handlers: Map<string, Array<(event: DomainEvent) => void | Promise<void>>>;

  private constructor() {
    this.handlers = new Map();
  }

  /**
   * Get the singleton instance of EventBus
   */
  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Subscribe to a specific event type
   * Note: Handlers must type guard the event if they expect a specific subtype.
   */
  public subscribe<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    // Cast handler to accept DomainEvent (safe if handler type guards internally)
    const handlers = this.handlers.get(eventType)!;
    handlers.push(handler as (event: DomainEvent) => void | Promise<void>);
    // Return unsubscribe function
    return () => {
      const index = handlers.indexOf(handler as (event: DomainEvent) => void | Promise<void>);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    };
  }

  /**
   * Publish an event to all subscribers
   */
  public async publish<T extends DomainEvent>(event: T): Promise<void> {
    const eventType = event.event_type;
    const handlers = this.handlers.get(eventType) || [];

    // Log the event for debugging
    console.debug(`[EventBus] Publishing event ${eventType}`, event);

    // Execute all handlers
    await Promise.all(
      handlers.map(async (handler) => {
        try {
          await handler(event);
        } catch (error) {
          console.error(`[EventBus] Error in handler for ${eventType}:`, error);
        }
      }),
    );
  }

  /**
   * Subscribe to all order events
   */
  public subscribeToAllOrderEvents(handler: EventHandler<OrderEventUnion>): () => void {
    const orderEventTypes = [
      'ORDER_CREATED',
      'ORDER_STATUS_CHANGED',
      'PAYMENT_PROCESSED',
      'ORDER_SHIPPED',
      'ORDER_DELIVERED',
      'ORDER_CANCELLED',
      'ORDER_REFUNDED',
    ];

    // Create unsubscribe functions for all event types
    const unsubscribeFunctions = orderEventTypes.map((eventType) =>
      this.subscribe(eventType, handler),
    );

    // Return combined unsubscribe function
    return () => {
      unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
    };
  }

  /**
   * Clear all event handlers - mainly for testing
   */
  public clear(): void {
    this.handlers.clear();
  }
}

/**
 * Get the application event bus
 */
export function getEventBus(): EventBus {
  return EventBus.getInstance();
}
