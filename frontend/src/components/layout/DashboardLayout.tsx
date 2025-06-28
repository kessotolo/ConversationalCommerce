
import { MobileNav } from '@/components/layout/MobileNav';
import { Sidebar } from '@/components/layout/Sidebar';
import KYCBanner from '@/components/common/KYCBanner';

import type { ReactNode } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Navigation */}
      <MobileNav />

      {/* Main Content */}
      <div className="md:pl-64 flex flex-col flex-1">
        {/* KYC Banner - non-blocking notification */}
        <KYCBanner className="sticky top-0 z-10" />
        
        <main className="flex-1 pb-20 md:pb-0">
          {' '}
          {/* Increased bottom padding for mobile to prevent content from being hidden under tabs */}
          <div className="py-6 px-4 sm:px-6 md:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
