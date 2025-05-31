/**
 * Module Registration
 * 
 * This file registers all modules in the Conversational Commerce platform.
 */

// Module Imports
import * as coreModule from './core';
import * as tenantModule from './tenant';
import * as storefrontModule from './storefront';
import * as conversationModule from './conversation';
import * as productModule from './product';
import * as orderModule from './order';
import * as paymentModule from './payment';
import * as securityModule from './security';

// Export all modules
export const modules = {
  core: coreModule,
  tenant: tenantModule,
  storefront: storefrontModule,
  conversation: conversationModule,
  product: productModule,
  order: orderModule,
  payment: paymentModule,
  security: securityModule,
};

// Export individual modules
export { coreModule };
export { tenantModule };
export { storefrontModule };
export { conversationModule };
export { productModule };
export { orderModule };
export { paymentModule };
export { securityModule };
