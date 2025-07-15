// We need to use the correct type for Next.js routes
import type { Route } from 'next';

/**
 * Helper utility to create type-safe route paths for dynamic routes in Next.js App Router
 * This helps address TypeScript errors with dynamic routes in Next.js 13+
 */

/**
 * Type-safe route generator for merchant-specific admin routes
 * 
 * @param merchantId - The merchant ID for the route
 * @param path - The path segment after /store/{merchantId}/
 * @returns A properly typed route for Next.js Link component
 */
export function createMerchantAdminRoute(merchantId: string, path?: string): Route {
  // Cast to Route type to ensure compatibility with Next.js Link component
  // Base route is /store/{merchantId}/dashboard
  const baseRoute = `/store/${merchantId}/dashboard`;
  
  // If additional path is provided, append it
  if (path) {
    return `${baseRoute}/${path}` as Route;
  }
  
  return baseRoute as Route;
}

/**
 * Type-safe route generator for merchant-specific storefront routes
 * 
 * @param merchantId - The merchant ID for the route
 * @param path - The path segment after the merchant's subdomain
 * @returns A properly typed route for Next.js Link component 
 */
export function createMerchantStorefrontRoute(merchantId: string, path?: string): Route {
  // In development, we simulate the subdomain routing
  if (process.env.NODE_ENV === 'development') {
    const baseRoute = `/storefront/${merchantId}`;
    
    if (path) {
      return `${baseRoute}/${path}` as Route;
    }
    
    return baseRoute as Route;
  }
  
  // In production, this would be handled by the middleware redirecting
  // from {merchantId}.enwhe.io to the appropriate route
  return (path ? `/${path}` : '/') as Route;
}
