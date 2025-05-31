/**
 * Service Registry
 * 
 * This provides a centralized registry for all services in the application.
 * It facilitates dependency injection and helps maintain module boundaries.
 */

import { IEventBus, ILogger } from './base-service';

/**
 * Service Registry interface
 * Defines operations for registering and retrieving services
 */
export interface IServiceRegistry {
  /**
   * Registers a service instance with the registry
   * @param serviceType The service interface type
   * @param implementation The service implementation
   * @param moduleName The module the service belongs to
   */
  register<T>(serviceType: string, implementation: T, moduleName: string): void;
  
  /**
   * Gets a service instance from the registry
   * @param serviceType The service interface type
   * @throws Error if the service is not registered
   */
  get<T>(serviceType: string): T;
  
  /**
   * Checks if a service is registered
   * @param serviceType The service interface type
   */
  has(serviceType: string): boolean;
  
  /**
   * Gets all registered services for a module
   * @param moduleName The module name
   */
  getModuleServices(moduleName: string): Record<string, any>;
}

/**
 * Service metadata
 * Metadata about a registered service
 */
interface ServiceMetadata<T> {
  implementation: T;
  moduleName: string;
  registeredAt: Date;
}

/**
 * Service Registry implementation
 * Concrete implementation of the service registry
 */
export class ServiceRegistry implements IServiceRegistry {
  private static instance: ServiceRegistry;
  private services: Map<string, ServiceMetadata<any>> = new Map();
  private logger?: ILogger;
  private eventBus?: IEventBus;
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}
  
  /**
   * Gets the singleton instance of the service registry
   */
  public static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }
  
  /**
   * Sets the logger for the registry
   * @param logger The logger implementation
   */
  public setLogger(logger: ILogger): void {
    this.logger = logger;
  }
  
  /**
   * Sets the event bus for the registry
   * @param eventBus The event bus implementation
   */
  public setEventBus(eventBus: IEventBus): void {
    this.eventBus = eventBus;
  }
  
  /**
   * Registers a service instance with the registry
   * @param serviceType The service interface type
   * @param implementation The service implementation
   * @param moduleName The module the service belongs to
   */
  public register<T>(serviceType: string, implementation: T, moduleName: string): void {
    if (this.services.has(serviceType)) {
      const existingService = this.services.get(serviceType);
      this.logger?.warn(`Service ${serviceType} already registered by module ${existingService?.moduleName}. Overriding with implementation from ${moduleName}.`);
    }
    
    this.services.set(serviceType, {
      implementation,
      moduleName,
      registeredAt: new Date()
    });
    
    this.logger?.info(`Service ${serviceType} registered by module ${moduleName}`);
    this.eventBus?.publish('service.registered', { serviceType, moduleName });
  }
  
  /**
   * Gets a service instance from the registry
   * @param serviceType The service interface type
   * @throws Error if the service is not registered
   */
  public get<T>(serviceType: string): T {
    const service = this.services.get(serviceType);
    if (!service) {
      const error = `Service ${serviceType} not registered`;
      this.logger?.error(error);
      throw new Error(error);
    }
    
    return service.implementation as T;
  }
  
  /**
   * Checks if a service is registered
   * @param serviceType The service interface type
   */
  public has(serviceType: string): boolean {
    return this.services.has(serviceType);
  }
  
  /**
   * Gets all registered services for a module
   * @param moduleName The module name
   */
  public getModuleServices(moduleName: string): Record<string, any> {
    const moduleServices: Record<string, any> = {};
    
    for (const [serviceType, metadata] of this.services.entries()) {
      if (metadata.moduleName === moduleName) {
        moduleServices[serviceType] = metadata.implementation;
      }
    }
    
    return moduleServices;
  }
  
  /**
   * Gets all registered service types
   */
  public getRegisteredServiceTypes(): string[] {
    return Array.from(this.services.keys());
  }
  
  /**
   * Clears all registered services
   * Used primarily for testing
   */
  public clear(): void {
    this.services.clear();
    this.logger?.info('Service registry cleared');
  }
}
