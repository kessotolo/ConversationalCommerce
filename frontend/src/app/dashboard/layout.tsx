'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useTenant } from '@/contexts/TenantContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  const { tenant, isLoading: isTenantLoading } = useTenant();
  const router = useRouter();
  useEffect(() => {
    if (!isTenantLoading && tenant && !tenant.name) {
      router.replace('/store-setup');
    }
  }, [tenant, isTenantLoading, router]);
  return <DashboardLayout>{children}</DashboardLayout>;
}
