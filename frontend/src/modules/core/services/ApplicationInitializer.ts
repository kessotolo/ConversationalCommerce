import { getOrderServiceInitializer } from '@/modules/order/services/initialization/orderServiceInitializer';

import { ServiceRegistry } from './ServiceRegistry';

import type { ServiceInitializer } from './ServiceInitializer';

/**
 * ApplicationInitializer sets up all services across the application
 * Follows the modular monolith architecture pattern
 */
export class ApplicationInitializer {
  private registry: ServiceRegistry;
  private initializers: ServiceInitializer[] = [];

  constructor() {
    this.registry = new ServiceRegistry();
    this.registerInitializers();
  }

  /**
   * Register all service initializers
   */
  private registerInitializers(): void {
    // Add order service initializer
    this.initializers.push(getOrderServiceInitializer());

    // Add other service initializers as needed
    // e.g., this.initializers.push(getTenantServiceInitializer());
    // e.g., this.initializers.push(getProductServiceInitializer());
  }

  /**
   * Initialize all registered services
   */
  initialize(): ServiceRegistry {
    // Initialize each service
    for (const initializer of this.initializers) {
      initializer.initialize(this.registry);
    }

    return this.registry;
  }

  /**
   * Get the service registry instance
   */
  getRegistry(): ServiceRegistry {
    return this.registry;
  }
}

/**
 * Singleton instance of the initialized application
 */
let appInstance: ApplicationInitializer | null = null;

/**
 * Get or create the application initializer
 */
export function getApplication(): ApplicationInitializer {
  if (!appInstance) {
    appInstance = new ApplicationInitializer();
  }
  return appInstance;
}

/**
 * Get the service registry with all initialized services
 */
export function getInitializedServiceRegistry(): ServiceRegistry {
  const app = getApplication();
  return app.initialize();
}
