'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useTenant } from '@/contexts/TenantContext';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  const { tenant, isLoading: isTenantLoading } = useTenant();
  const { user, isLoaded: isUserLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    // Only run after both user and tenant are loaded
    if (!isUserLoaded || isTenantLoading) return;

    // If user is not authenticated, redirect to sign-in
    if (!user) {
      router.push('/sign-in');
      return;
    }

    // If user is authenticated but no tenant exists, redirect to store setup
    if (user && !tenant) {
      router.push('/store-setup');
      return;
    }

    // If tenant exists but is missing basic info, redirect to store setup
    if (tenant && !tenant.name) {
      router.push('/store-setup');
      return;
    }
  }, [tenant, isTenantLoading, user, isUserLoaded, router]);

  return <DashboardLayout>{children}</DashboardLayout>;
}
