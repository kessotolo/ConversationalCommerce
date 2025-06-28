import type { ServiceInitializer } from '@/modules/core/services/ServiceInitializer';
import type { ServiceRegistry } from '@/modules/core/services/ServiceRegistry';

import { initializeOrderEventHandlers } from '@/modules/order/events/OrderEventHandlers';
import { HttpOrderService } from '@/modules/order/services/OrderService';

/**
 * OrderServiceInitializer integrates the OrderService into the application's
 * service registry and initializes event handlers
 */
export class OrderServiceInitializer implements ServiceInitializer {
  /**
   * Initialize and register the OrderService in the service registry
   */
  initialize(registry: ServiceRegistry): void {
    // Register the order service
    const orderService = new HttpOrderService();
    registry.register('orderService', orderService);

    // Initialize event handlers
    const unsubscribeHandlers = initializeOrderEventHandlers();

    // Register cleanup function
    registry.registerCleanup('orderEventHandlers', () => {
      unsubscribeHandlers();
    });
  }
}

/**
 * Get an instance of the order service initializer
 */
export function getOrderServiceInitializer(): ServiceInitializer {
  return new OrderServiceInitializer();
}
