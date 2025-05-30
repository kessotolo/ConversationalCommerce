import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

/**
 * Type definition for auth session with UUID tenant data
 */
interface AuthSessionWithTenant {
  userId?: string;
  sessionId?: string;
  tenantId?: string; // UUID format from database
  getToken?: () => Promise<string>;
}

/**
 * Middleware function that extracts tenant information from subdomains or custom domains
 * This handles the UUID-based tenant resolution and connects with authentication
 */
export function middleware(request: NextRequest) {
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
  else if (hostname.endsWith(`.${primaryDomain}`) && hostnameArray.length > 2 && hostnameArray[0] !== 'www') {
    // Extract subdomain from hostname
    tenantIdentifier = hostnameArray[0];
    identifierType = 'subdomain';
  } 
  // If not a subdomain of our primary domain, check if it's a custom domain
  else if (!hostname.endsWith(primaryDomain) && hostnameArray.length >= 2) {
    // This might be a custom domain - we'll need to look it up
    identifierType = 'custom_domain';
    tenantIdentifier = hostname;
  } 
  // Default case - main domain without subdomain
  else {
    tenantIdentifier = 'default';
    identifierType = 'subdomain';
  }
  
  // Handle authentication paths directly
  // These paths should bypass tenant resolution
  const authPaths = ['/sign-in', '/sign-up', '/api/auth'];
  if (authPaths.some(path => url.pathname.startsWith(path))) {
    return NextResponse.next();
  }
  
  // Handle public paths that don't need auth
  const publicPaths = ['/', '/api/public', '/api/tenants/by-subdomain'];
  const isPublicPath = publicPaths.some(path => url.pathname.startsWith(path));
  
  // Add tenant info to headers for use in getServerSideProps and API routes
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
  
  // Protected routes check
  if (!isPublicPath) {
    // This is a protected path - check auth status
    // When Clerk is properly configured, you'll use:
    // const { userId } = auth();
    // if (!userId) {
    //   return NextResponse.redirect(new URL('/sign-in', request.url));
    // }
    
    // For now, we'll allow access without auth checks
    // This can be replaced with proper auth once Clerk is configured
  }
  
  return response;
}

export const config = {
  matcher: [
    // Match all paths except for static files and certain Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|gif|png|svg)).*)',
  ],
};
