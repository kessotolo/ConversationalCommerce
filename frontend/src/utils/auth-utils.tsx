import { useAuth as useClerkAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import React, { createContext, useContext, useEffect, useState } from 'react';

import type { ReactNode } from 'react';
import type { Route } from 'next';

// Type definitions
interface AuthContextType {
  isLoading: boolean;
  isAuthenticated: boolean;
  userId: string | null;
  redirectToLogin: () => void;
  redirectToDashboard: () => void;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  isLoading: true,
  isAuthenticated: false,
  userId: null,
  redirectToLogin: () => { },
  redirectToDashboard: () => { },
});

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded: isAuthLoaded, userId } = useClerkAuth();
  const { isLoaded: isUserLoaded } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (isAuthLoaded && isUserLoaded) {
      setIsLoading(false);
    }
  }, [isAuthLoaded, isUserLoaded]);

  const redirectToLogin = () => {
    router.push('/sign-in' as Route);
  };

  const redirectToDashboard = () => {
    router.push('/dashboard');
  };

  const value = {
    isLoading,
    isAuthenticated: !!userId,
    userId: userId ?? null,
    redirectToLogin,
    redirectToDashboard,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook for using auth context
export function useAuth() {
  return useContext(AuthContext);
}

// Higher order component for protected routes

export function getStoredAuthToken(): string | null {
  // Get token from localStorage
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken');
  }
  return null;
}
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { isLoading, isAuthenticated, redirectToLogin } = useAuth();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        redirectToLogin();
      }
    }, [isLoading, isAuthenticated]);

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#fdfcf7]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#6C9A8B]" />
        </div>
      );
    }

    if (!isAuthenticated) {
      return null; // Will redirect in the useEffect
    }

    return <Component {...props} />;
  };
}
