import type { NextPage } from 'next';
import { useUser } from '@clerk/nextjs';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

import { MobileNav } from '@/components/layout/MobileNav';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';

/**
 * Dashboard page that includes analytics components
 * Protected by authentication check
 */
const DashboardPage: NextPage = () => {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  // Auth protection
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  // Show loading state while checking auth
  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen py-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">
          Loading dashboard...
        </p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Dashboard | Conversational Commerce</title>
        <meta name="description" content="Business analytics and performance dashboard" />
      </Head>

      <main className="pb-20 pt-4">
        <div className="container mx-auto max-w-7xl px-4">
          <h1 className="text-3xl font-bold mb-6 mt-2">
            Analytics Dashboard
          </h1>
          <AnalyticsDashboard />
        </div>
      </main>

      <MobileNav />
    </>
  );
};

export default DashboardPage;
