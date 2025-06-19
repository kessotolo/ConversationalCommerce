import type { ServiceRegistry } from './ServiceRegistry';

/**
 * Interface for service initializers
 * Each module can implement this to register its services
 */
export interface ServiceInitializer {
  /**
   * Initialize and register services in the registry
   */
  initialize(registry: ServiceRegistry): void;
}
