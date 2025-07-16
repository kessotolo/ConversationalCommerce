import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/nextjs';

import { useTenant } from '@/contexts/TenantContext';

// Interface for auth with UUID tenant connection
interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  tenantId?: string; // UUID format matching your database
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  error: null,
  signIn: async () => { },
  signOut: async () => { },
  isAuthenticated: false,
});

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [error, setError] = useState<Error | null>(null);
  const { tenant } = useTenant();

  // Use real Clerk authentication
  const { isLoaded: authLoaded, isSignedIn, getToken } = useClerkAuth();
  const { isLoaded: userLoaded, user: clerkUser } = useClerkUser();

  // Derive auth state from Clerk
  const isLoading = !authLoaded || !userLoaded;
  const isAuthenticated = !!isSignedIn && !!clerkUser;

  // Map Clerk user to our AuthUser interface
  const user: AuthUser | null = clerkUser ? {
    id: clerkUser.id,
    email: clerkUser.primaryEmailAddress?.emailAddress || '',
    firstName: clerkUser.firstName || undefined,
    lastName: clerkUser.lastName || undefined,
    tenantId: tenant?.id || '',
  } : null;

  // Sign in function (redirects to Clerk)
  const signIn = async (email: string, password: string) => {
    try {
      setError(null);

      // With Clerk, users sign in through Clerk's UI components
      // This function can redirect to sign-in page or handle programmatic sign-in
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/sign-in';
      }
    } catch (err) {
      console.error('Sign in error:', err);
      setError(err instanceof Error ? err : new Error('Failed to sign in'));
      throw err;
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      setError(null);

      // Use Clerk's sign out method
      if (typeof window !== 'undefined' && (window as any).__clerk) {
        await (window as any).__clerk.signOut();
      }
    } catch (err) {
      console.error('Sign out error:', err);
      setError(err instanceof Error ? err : new Error('Failed to sign out'));
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        signIn,
        signOut,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
