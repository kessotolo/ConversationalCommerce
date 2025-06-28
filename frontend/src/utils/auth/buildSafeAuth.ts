/**
 * Clean architecture abstraction for Clerk authentication that works during both build and runtime
 * This prevents authentication errors during static generation while maintaining clean code
 */
import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/nextjs';

/**
 * Safe version of useAuth that returns default values during build
 * This prevents build errors without file modifications or script hacks
 */
export function useAuth() {
  // During build time (detected via env variable), return safe defaults
  if (
    typeof process !== 'undefined' &&
    (process.env['IS_BUILD_TIME'] === 'true' || !process.env['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'])
  ) {
    return {
      isLoaded: true,
      userId: null,
      sessionId: null,
      getToken: async () => null,
      isSignedIn: false,
    };
  }

  // During runtime, use the actual Clerk hook
  return useClerkAuth();
}

/**
 * Safe version of useUser that returns default values during build
 */
export function useUser() {
  // During build time, return safe defaults
  if (
    typeof process !== 'undefined' &&
    (process.env['IS_BUILD_TIME'] === 'true' || !process.env['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'])
  ) {
    return {
      isLoaded: true,
      isSignedIn: false,
      user: null,
    };
  }

  // During runtime, use the actual Clerk hook
  return useClerkUser();
}
