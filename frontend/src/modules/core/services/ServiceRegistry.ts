/**
 * Type for cleanup functions registered in the service registry
 */
export type CleanupFunction = () => void;

/**
 * ServiceRegistry manages all application services
 * Provides dependency injection for the modular monolith architecture
 */
export class ServiceRegistry {
  private services: Map<string, unknown>;
  private cleanupFunctions: Map<string, CleanupFunction>;

  constructor() {
    this.services = new Map();
    this.cleanupFunctions = new Map();
  }

  /**
   * Register a service with the registry
   */
  register<T>(name: string, service: T): void {
    this.services.set(name, service);
  }

  /**
   * Get a service from the registry
   */
  get<T>(name: string): T | undefined {
    return this.services.get(name) as T | undefined;
  }

  /**
   * Check if a service exists in the registry
   */
  has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Register a cleanup function for a service
   */
  registerCleanup(name: string, cleanup: CleanupFunction): void {
    this.cleanupFunctions.set(name, cleanup);
  }

  /**
   * Run cleanup function for a specific service
   */
  cleanup(name: string): void {
    const cleanup = this.cleanupFunctions.get(name);
    if (cleanup) {
      cleanup();
      this.cleanupFunctions.delete(name);
    }
  }

  /**
   * Run all cleanup functions
   */
  cleanupAll(): void {
    for (const [, cleanup] of this.cleanupFunctions.entries()) {
      cleanup();
    }
    this.cleanupFunctions.clear();
  }
}
