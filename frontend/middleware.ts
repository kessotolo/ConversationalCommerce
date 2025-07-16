import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define which routes require authentication
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/admin(.*)',
  '/store/*/admin(.*)',
  '/profile(.*)',
  '/settings(.*)',
  '/api/protected(.*)',
]);

// Define public routes that should never require auth
const isPublicRoute = createRouteMatcher([
  '/',
  '/about(.*)',
  '/contact(.*)',
  '/store(.*)', // Public storefronts
  '/api/public(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
]);

/**
 * Comprehensive middleware that combines Clerk authentication with tenant handling
 * Handles both authentication and multi-tenant routing for enwhe.io
 */
async function tenantAndAuthMiddleware(request: NextRequest) {
  // Get hostname from request (e.g. merchant-id.enwhe.io or customdomain.com)
  const hostname = request.headers.get('host') || '';
  const url = request.nextUrl.clone();

  // Extract tenant identifier (either subdomain or custom domain)
  let tenantIdentifier: string = 'default';
  let identifierType: 'subdomain' | 'custom_domain' = 'subdomain';
  let merchantId: string | null = null;
  let isAdminDomain = false;
  const hostnameArray = hostname.split('.');

  // Domain configuration
  const baseDomain = process.env['NEXT_PUBLIC_BASE_DOMAIN'] || 'enwhe.io';
  const adminDomain = process.env['NEXT_PUBLIC_ADMIN_DOMAIN'] || 'admin.enwhe.com';
  const appDomain = process.env['NEXT_PUBLIC_APP_DOMAIN'] || 'app.enwhe.io';
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Check for localhost or IP address which don't have subdomains in standard format
  if (hostname.includes('localhost') || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    // For development, check for subdomain in a custom header or query param
    const subdomain = url.searchParams.get('subdomain') || url.searchParams.get('merchant');
    tenantIdentifier = typeof subdomain === 'string' && subdomain.length > 0 ? subdomain : 'default';
    merchantId = tenantIdentifier !== 'default' ? tenantIdentifier : 'development';
    identifierType = 'subdomain';

    // Check if this is admin context in development
    if (url.pathname.startsWith('/admin') || hostname.includes('admin')) {
      isAdminDomain = true;
      tenantIdentifier = 'admin';
    }
  }
  // Check if this is the admin domain
  else if (hostname === adminDomain || hostname.startsWith('admin.')) {
    isAdminDomain = true;
    tenantIdentifier = 'admin';
    identifierType = 'subdomain';

    // Check if we're accessing a specific merchant admin area
    const storeMatch = url.pathname.match(/^\/store\/([^\/]+)/);
    if (storeMatch && storeMatch[1]) {
      merchantId = storeMatch[1];
    }
  }
  // Check if this is the main app domain
  else if (hostname === appDomain) {
    tenantIdentifier = 'app';
    identifierType = 'subdomain';
  }
  // Check if this is a merchant subdomain (merchant-id.enwhe.io)
  else if (
    hostname.endsWith(`.${baseDomain}`) &&
    hostnameArray.length > 2 &&
    hostnameArray[0] !== 'www'
  ) {
    // Extract merchant ID from subdomain
    tenantIdentifier = hostnameArray[0];
    merchantId = hostnameArray[0];
    identifierType = 'subdomain';
  }
  // Otherwise treat as a custom domain
  else {
    // Here you would typically lookup the custom domain in your database
    // to find the associated tenant. For simplicity, we're using the domain itself.
    tenantIdentifier = hostname;
    merchantId = hostname;
    identifierType = 'custom_domain';
  }

  // Add tenant and merchant identifiers to request headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-identifier', tenantIdentifier);
  requestHeaders.set('x-tenant-identifier-type', identifierType);

  if (merchantId) {
    requestHeaders.set('x-merchant-id', merchantId);
  }

  // Handle storefront route rewriting for merchant subdomains
  if (merchantId && !isAdminDomain && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/store/')) {
    // Rewrite merchant storefront routes to /store/[merchantId] path internally
    url.pathname = `/store/${merchantId}${url.pathname}`;

    const response = NextResponse.rewrite(url, {
      request: {
        headers: requestHeaders,
      },
    });

    // Set tenant cookies
    setTenantCookies(response, tenantIdentifier, identifierType);
    return response;
  }

  // Create the standard response with headers
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Set tenant cookies
  setTenantCookies(response, tenantIdentifier, identifierType);
  return response;
}

/**
 * Helper function to set tenant cookies
 */
function setTenantCookies(response: NextResponse, tenantIdentifier: string, identifierType: string) {
  const isProduction = process.env.NODE_ENV === 'production';

  response.cookies.set('tenant_identifier', tenantIdentifier, {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: '/',
  });

  response.cookies.set('tenant_identifier_type', identifierType, {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: '/',
  });
}

// Export the middleware with Clerk authentication wrapped around our tenant logic
export default clerkMiddleware((auth, req) => {
  // Check if this route requires protection
  if (isProtectedRoute(req)) {
    // Apply authentication protection for protected routes
    return auth.protect();
  }

  // Auto-redirect authenticated users from landing page to dashboard
  if (req.url.includes('/') && req.nextUrl.pathname === '/' && auth.userId) {
    // User is authenticated and on the home page
    // Instead of showing home page with prompt, redirect to dashboard
    const dashboardUrl = new URL('/dashboard', req.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // For all routes (protected and public), apply tenant logic
  return tenantAndAuthMiddleware(req);
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
