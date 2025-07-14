import { NextRequest, NextResponse } from 'next/server';
import { ClerkMiddleware } from '@clerk/nextjs/server';

/**
 * Multi-tenant routing middleware for enwhe.io
 * 
 * Handles routing for:
 * - Merchant admin: admin.enwhe.io/store/{merchant-id}/
 * - Merchant storefront: {merchant-id}.enwhe.io
 */
function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host') || '';
  
  // Extract environment-specific info
  const currentEnv = process.env.NODE_ENV;
  const isDevelopment = currentEnv === 'development';
  
  // For development, use localhost with different ports to simulate subdomains
  // For production, use real subdomains
  let merchantId: string | null = null;
  let isAdminDomain = false;
  
  // Handle admin domain (admin.enwhe.io)
  if (hostname.startsWith('admin.') || (isDevelopment && hostname.includes('localhost'))) {
    isAdminDomain = true;
    
    // Check if we're accessing a specific merchant admin area
    const storeMatch = url.pathname.match(/^\/store\/([^\/]+)/);
    if (storeMatch && storeMatch[1]) {
      merchantId = storeMatch[1];
    }
    
    // If on admin domain but not in store path, keep normal routing
    if (!merchantId) {
      return NextResponse.next();
    }
    
    // Ensure the merchant ID is attached to the request for context
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-merchant-id', merchantId);
    
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }
  
  // Handle merchant-specific storefront (merchant-id.enwhe.io)
  // In development: localhost:3000 -> default merchant or specified via query param
  if (isDevelopment && hostname.includes('localhost')) {
    // For development, extract merchant ID from query param if available
    merchantId = url.searchParams.get('merchant') || 'development';
  } else {
    // In production, extract merchant ID from subdomain
    const subdomain = hostname.split('.')[0];
    if (subdomain && subdomain !== 'www' && subdomain !== 'app') {
      merchantId = subdomain;
    }
  }
  
  // If we have a merchant ID from the subdomain, attach it to the request
  if (merchantId) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-merchant-id', merchantId);
    
    // For storefront routes, rewrite to the /store/[merchantId] path internally
    // but keep the original URL in the browser
    if (!isAdminDomain && !url.pathname.startsWith('/api/')) {
      // Skip rewriting for API routes
      url.pathname = `/store/${merchantId}${url.pathname}`;
      
      return NextResponse.rewrite(url, {
        request: {
          headers: requestHeaders,
        },
      });
    }
    
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }
  
  // Default: allow the request to continue
  return NextResponse.next();
}

// Apply Clerk middleware first, then our custom middleware
export default ClerkMiddleware(middleware);

// Define which paths this middleware will run on
export const config = {
  matcher: [
    // Match all pathnames except for:
    // - API routes that don't need tenant context
    // - Static files (images, favicon, etc.)
    // - Authentication paths (handled by Clerk)
    '/((?!_next/static|_next/image|favicon.ico|api/public).*)',
  ],
};
