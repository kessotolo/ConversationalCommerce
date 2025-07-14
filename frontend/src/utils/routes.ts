import { Route } from 'next';

/**
 * Helper utility to create type-safe route paths for dynamic routes in Next.js App Router
 * This helps address TypeScript errors with dynamic routes in Next.js 13+
 */

/**
 * Type-safe route generator for merchant-specific admin routes
 * 
 * @param merchantId - The merchant ID for the route
 * @param path - The path segment after /store/{merchantId}/
 * @returns A properly typed route string for Next.js Link component
 */
export function createMerchantAdminRoute(merchantId: string, path?: string): string {
  // Base route is /store/{merchantId}/dashboard
  const baseRoute = `/store/${merchantId}/dashboard`;
  
  // If additional path is provided, append it
  if (path) {
    return `${baseRoute}/${path}`;
  }
  
  return baseRoute;
}

/**
 * Type-safe route generator for merchant-specific storefront routes
 * 
 * @param merchantId - The merchant ID for the route
 * @param path - The path segment after the merchant's subdomain
 * @returns A properly typed route string for Next.js Link component 
 */
export function createMerchantStorefrontRoute(merchantId: string, path?: string): string {
  // In development, we simulate the subdomain routing
  if (process.env.NODE_ENV === 'development') {
    const baseRoute = `/storefront/${merchantId}`;
    
    if (path) {
      return `${baseRoute}/${path}`;
    }
    
    return baseRoute;
  }
  
  // In production, this would be handled by the middleware redirecting
  // from {merchantId}.enwhe.io to the appropriate route
  return path ? `/${path}` : '/';
}
