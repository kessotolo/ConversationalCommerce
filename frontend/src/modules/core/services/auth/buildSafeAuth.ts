/**
 * Core module authentication service abstraction
 * Provides build-safe authentication while preserving clean architecture
 */
import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/nextjs';

// Types from core module
import type { Result } from '@/modules/core/models/base';

// Type definitions
export interface AuthUser {
  id: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
}

export interface AuthService {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  getToken(): Promise<string | null>;
}

/**
 * Hook that provides auth capabilities with build-time safety
 * This follows our modular architecture pattern by keeping auth logic
 * in the core module and providing a clean interface
 */
export function useAuthService(): AuthService {
  // Check if we're in a build environment where auth should be bypassed
  const isBuildEnv =
    typeof window === 'undefined' &&
    (!process.env['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'] ||
      process.env['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'] === '');

  // If in build environment, return safe defaults that won't cause build errors
  if (isBuildEnv) {
    return {
      isAuthenticated: false,
      isLoading: false,
      user: null,
      getToken: async () => null,
    };
  }

  // Otherwise use real Clerk auth
  const { isLoaded: authLoaded, isSignedIn, getToken } = useClerkAuth();
  const { isLoaded: userLoaded, user } = useClerkUser();

  // Map Clerk user to our domain model
  const authUser: AuthUser | null = user
    ? {
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress || null,
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl,
      }
    : null;

  return {
    isAuthenticated: !!isSignedIn,
    isLoading: !authLoaded || !userLoaded,
    user: authUser,
    getToken,
  };
}

/**
 * Function to check authentication with proper error handling
 * Follows Result pattern from core module
 */
export async function checkAuth(): Promise<Result<AuthUser | null>> {
  try {
    // In build environment, return success with null user
    if (
      typeof window === 'undefined' &&
      (!process.env['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'] ||
        process.env['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'] === '')
    ) {
      return {
        success: true,
        data: null,
      };
    }

    // Use server-side auth functions here if needed

    return {
      success: true,
      data: null, // Replace with actual user in real implementation
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
