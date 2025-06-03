import { ServiceInitializer } from '../../../core/services/ServiceInitializer';
import { ServiceRegistry } from '../../../core/services/ServiceRegistry';
import { HttpOrderService } from '../OrderService';
import { initializeOrderEventHandlers } from '../../events/OrderEventHandlers';

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
