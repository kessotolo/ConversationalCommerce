/**
 * Core authentication hook that follows modular monolith architecture
 *
 * This hook provides a clean domain interface for authentication
 * while safely handling build-time vs runtime environments without hacky scripts
 */
import { useAuthService, type AuthUser } from '@/modules/core/services/auth';

export interface UserAuth {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  getToken: () => Promise<string | null>;
}

/**
 * Hook for accessing authentication state that follows our architecture patterns
 *
 * Example usage:
 * ```tsx
 * const { user, isAuthenticated } = useAuth();
 *
 * if (isAuthenticated) {
 *   // User is authenticated, can access user.id, etc.
 * }
 * ```
 */
export function useAuth(): UserAuth {
  const authService = useAuthService();

  return {
    user: authService.user,
    isAuthenticated: authService.isAuthenticated,
    isLoading: authService.isLoading,
    getToken: authService.getToken,
  };
}

/**
 * Server-side authentication check that follows Result pattern
 * from core domain models
 */
export { checkAuth } from '@/modules/core/services/auth';
