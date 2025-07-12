import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Custom middleware implementation that combines tenant handling with auth
 * While respecting clean architecture principles
 */
async function middlewareImplementation(request: NextRequest) {

  // Get hostname from request (e.g. merchant-id.enwhe.io or customdomain.com)
  const hostname = request.headers.get('host') || '';
  const url = request.nextUrl.clone();

  // Extract tenant identifier (either subdomain or custom domain)
  let tenantIdentifier: string = 'default';
  let identifierType: 'subdomain' | 'custom_domain' = 'subdomain';
  const hostnameArray = hostname.split('.');

  // Domain configuration
  const baseDomain = process.env['NEXT_PUBLIC_BASE_DOMAIN'] || 'enwhe.io';
  const adminDomain = process.env['NEXT_PUBLIC_ADMIN_DOMAIN'] || 'admin.enwhe.com';
  const appDomain = process.env['NEXT_PUBLIC_APP_DOMAIN'] || 'app.enwhe.io';

  // Check for localhost or IP address which don't have subdomains in standard format
  if (hostname.includes('localhost') || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    // For development, check for subdomain in a custom header or query param
    const subdomain = url.searchParams.get('subdomain');
    tenantIdentifier =
      typeof subdomain === 'string' && subdomain.length > 0 ? subdomain : 'default';
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
    identifierType = 'subdomain';
  }
  // Check if this is the admin domain
  else if (hostname === adminDomain) {
    // Admin domain - no tenant context needed
    tenantIdentifier = 'admin';
    identifierType = 'subdomain';
  }
  // Check if this is the main app domain
  else if (hostname === appDomain) {
    // Main app domain - no tenant context needed
    tenantIdentifier = 'app';
    identifierType = 'subdomain';
  }
  // Otherwise treat as a custom domain
  else {
    // Here you would typically lookup the custom domain in your database
    // to find the associated tenant. For simplicity, we're just using the domain itself.
    tenantIdentifier = hostname;
    identifierType = 'custom_domain';
  }

  // Add tenant identifier to request headers for server components to access
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-identifier', tenantIdentifier);
  requestHeaders.set('x-tenant-identifier-type', identifierType);

  // Store tenant information in cookies for client-side access
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Set cookies with tenant information (secure in production, not in development)
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

  return response;
}

// Export the middleware function directly
export default middlewareImplementation;

export const config = {
  matcher: [
    // Match all routes except static files and _next
    '/((?!.*\\..*|_next).*)',
    '/',
    '/(api|trpc)(.*)',
  ],
};
