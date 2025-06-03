import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Type definition for auth session with UUID tenant data
 */
interface AuthSessionWithTenant {
  userId?: string;
  sessionId?: string;
  tenantId?: string; // UUID format from database
  getToken?: () => Promise<string>;
}

// Define public routes that don't require authentication
const publicPaths = [
  '/',
  '/about',
  '/contact',
  '/sign-in',
  '/sign-up',
  '/api/public',
  '/api/webhook',
  '/store',
];

// Check if we're in a build environment
const isBuildEnv =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === '' ||
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

/**
 * Custom middleware implementation that combines tenant handling with auth
 * While respecting clean architecture principles
 */
async function middlewareImplementation(request: NextRequest) {
  // Get hostname from request (e.g. tenant1.myapp.com or customdomain.com)
  const hostname = request.headers.get('host') || '';
  const url = request.nextUrl.clone();

  // Extract tenant identifier (either subdomain or custom domain)
  let tenantIdentifier: string = 'default';
  let identifierType: 'subdomain' | 'custom_domain' = 'subdomain';
  const hostnameArray = hostname.split('.');

  // Primary application domain (without subdomain)
  const primaryDomain = process.env.PRIMARY_DOMAIN || 'yourplatform.com';

  // Check for localhost or IP address which don't have subdomains in standard format
  if (hostname.includes('localhost') || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    // For development, check for subdomain in a custom header or query param
    tenantIdentifier = url.searchParams.get('subdomain') || 'default';
    identifierType = 'subdomain';
  }
  // Check if this is a subdomain of our primary domain
  else if (
    hostname.endsWith(`.${primaryDomain}`) &&
    hostnameArray.length > 2 &&
    hostnameArray[0] !== 'www'
  ) {
    // Extract subdomain from hostname
    tenantIdentifier = hostnameArray[0];
    identifierType = 'subdomain';
  }
  // Otherwise treat as a custom domain
  else {
    // Here you would typically lookup the custom domain in your database
    // to find the associated tenant. For simplicity, we're just using the domain itself.
    tenantIdentifier = hostname;
    identifierType = 'custom_domain';
  }

  // Check if the current path is public
  const isPublicPath = publicPaths.some(
    (publicPath) =>
      url.pathname === publicPath ||
      url.pathname.startsWith(`${publicPath}/`) ||
      url.pathname.startsWith('/api/public/') ||
      url.pathname.startsWith('/api/webhook/'),
  );

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
