'use client';

import { useAuth } from '@clerk/nextjs';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

export function AuthRedirect() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Only run this effect if the auth state is loaded
    if (!isLoaded) return;

    // Add a small delay to ensure state is fully processed
    const timer = setTimeout(() => {
      // If user is signed in and on auth pages, redirect to dashboard
      if (isSignedIn && (pathname === '/sign-in' || pathname === '/sign-up' || pathname === '/')) {
        router.push('/dashboard');
      }

      // Note: We don't need to handle the reverse case here because
      // Clerk's middleware (authMiddleware) will already handle redirecting
      // unauthenticated users away from protected routes
    }, 100);

    return () => clearTimeout(timer);
  }, [isLoaded, isSignedIn, pathname, router]);

  return null;
}
