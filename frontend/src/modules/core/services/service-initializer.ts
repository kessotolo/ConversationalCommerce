/**
 * Service Initializer
 * 
 * This module initializes all services for the application and registers them
 * with the service registry. It serves as the bootstrapping mechanism for
 * the modular monolith architecture.
 */

import { ConversationService, IConversationService } from '../../conversation/services';
import { IOrderService, OrderService } from '../../order/services';
import { IProductService, ProductService } from '../../product/services';
import { ITenantService, TenantService } from '../../tenant/services';
import { IServiceRegistry, ServiceRegistry } from './service-registry';

/**
 * Service Types
 * Constants for service type identifiers
 */
export const ServiceTypes = {
  // Core services
  LOGGER: 'core.logger',
  EVENT_BUS: 'core.eventBus',
  CACHE: 'core.cache',
  TENANT_CONTEXT: 'core.tenantContext',
  FEATURE_FLAG: 'core.featureFlag',
  
  // Domain services
  TENANT_SERVICE: 'tenant.tenantService',
  CONVERSATION_SERVICE: 'conversation.conversationService',
  PRODUCT_SERVICE: 'product.productService',
  ORDER_SERVICE: 'order.orderService',
  
  // Additional services can be added here as the application grows
};

/**
 * Initializes all services for the application
 * This function should be called at application startup
 */
export function initializeServices(): IServiceRegistry {
  const registry = ServiceRegistry.getInstance();
  
  // Initialize domain services
  initializeTenantServices(registry);
  initializeConversationServices(registry);
  initializeProductServices(registry);
  initializeOrderServices(registry);
  
  return registry;
}

/**
 * Initializes tenant-related services
 * @param registry Service registry
 */
function initializeTenantServices(registry: IServiceRegistry): void {
  const tenantService: ITenantService = new TenantService();
  registry.register(ServiceTypes.TENANT_SERVICE, tenantService, 'tenant');
}

/**
 * Initializes conversation-related services
 * @param registry Service registry
 */
function initializeConversationServices(registry: IServiceRegistry): void {
  const conversationService: IConversationService = new ConversationService();
  registry.register(ServiceTypes.CONVERSATION_SERVICE, conversationService, 'conversation');
}

/**
 * Initializes product-related services
 * @param registry Service registry
 */
function initializeProductServices(registry: IServiceRegistry): void {
  const productService: IProductService = new ProductService();
  registry.register(ServiceTypes.PRODUCT_SERVICE, productService, 'product');
}

/**
 * Initializes order-related services
 * @param registry Service registry
 */
function initializeOrderServices(registry: IServiceRegistry): void {
  const orderService: IOrderService = new OrderService();
  registry.register(ServiceTypes.ORDER_SERVICE, orderService, 'order');
}

/**
 * Gets a service from the registry
 * Helper function to simplify service retrieval
 * @param serviceType Service type identifier
 */
export function getService<T>(serviceType: string): T {
  const registry = ServiceRegistry.getInstance();
  return registry.get<T>(serviceType);
}

/**
 * Service container hook for React components
 * This can be used in a React context provider to make services available
 * throughout the component tree
 */
export function useServices(): {
  tenantService: ITenantService;
  conversationService: IConversationService;
  productService: IProductService;
  orderService: IOrderService;
} {
  const registry = ServiceRegistry.getInstance();
  
  return {
    tenantService: registry.get<ITenantService>(ServiceTypes.TENANT_SERVICE),
    conversationService: registry.get<IConversationService>(ServiceTypes.CONVERSATION_SERVICE),
    productService: registry.get<IProductService>(ServiceTypes.PRODUCT_SERVICE),
    orderService: registry.get<IOrderService>(ServiceTypes.ORDER_SERVICE),
  };
}
