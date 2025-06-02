/**
 * getToken.ts - Get authentication token without using React hooks
 */
import { getStoredAuthToken } from '@/utils/auth-utils';

/**
 * Get the current authentication token
 * Implemented without React hooks to avoid ESLint issues
 */
export function getToken(): string | null {
  return getStoredAuthToken();
}
