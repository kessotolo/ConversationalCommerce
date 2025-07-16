"use client";

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTenant } from '@/contexts/TenantContext';
import { AdminLayout } from '../layouts/AdminLayout';
import { CardSkeleton } from '@/components/Skeletons/CardSkeleton';
import { TableSkeleton } from '@/components/Skeletons/TableSkeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { createMerchantAdminRoute } from '@/utils/routes';
import { dashboardService } from '@/services/dashboardService';
import type { Route } from 'next';

// Mock data for demonstration
interface DashboardStats {
  totalOrders: number;
  revenue: number;
  totalProducts: number;
  totalCustomers: number;
}

interface TenantDetails {
  name?: string;
  profile?: {
    isComplete?: boolean;
  };
  paymentMethods?: Array<unknown>;
  theme?: {
    isCustomized?: boolean;
  };
}

interface MerchantDashboardPageProps {
  params: {
    merchantId: string;
  };
}

export default function MerchantDashboardPage({ params }: MerchantDashboardPageProps) {
  const { merchantId } = params;
  const { tenant, isLoading: tenantLoading } = useTenant();

  // State for dashboard statistics
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    revenue: 0,
    totalProducts: 0,
    totalCustomers: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<Error | null>(null);

  // Mock tenant details for demonstration
  const tenantDetails: TenantDetails = {
    name: tenant?.name || 'My Store',
    profile: {
      isComplete: true,
    },
    paymentMethods: [],
    theme: {
      isCustomized: false,
    },
  };

  // Fetch dashboard statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setStatsLoading(true);
        setStatsError(null);

        // Use real API service
        const data = await dashboardService.getDashboardStats(merchantId);
        setStats(data);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        setStatsError(error instanceof Error ? error : new Error('Unknown error'));
      } finally {
        setStatsLoading(false);
      }
    };

    if (merchantId) {
      fetchStats();
    }
  }, [merchantId]);

  // Setup guide steps
  interface SetupGuideStep {
    title: string;
    description: string;
    completed: boolean;
    href: string;
    external?: boolean;
  }

  const setUpGuideSteps: SetupGuideStep[] = [
    {
      title: 'Complete Profile',
      description: 'Add your business information and contact details',
      completed: tenantDetails.profile?.isComplete || false,
      href: createMerchantAdminRoute(merchantId, 'profile'),
    },
    {
      title: 'Add Payment Methods',
      description: 'Set up payment options for your customers',
      completed: (tenantDetails.paymentMethods?.length || 0) > 0,
      href: createMerchantAdminRoute(merchantId, 'settings/payments'),
    },
    {
      title: 'Customize Theme',
      description: 'Personalize your store appearance',
      completed: tenantDetails.theme?.isCustomized || false,
      href: createMerchantAdminRoute(merchantId, 'settings/theme'),
    },
    {
      title: 'Add Products',
      description: 'Start building your product catalog',
      completed: stats.totalProducts > 0,
      href: createMerchantAdminRoute(merchantId, 'products'),
    },
    {
      title: 'Read Merchant Guide',
      description: 'Learn how to maximize your store potential',
      completed: false,
      href: 'https://help.enwhe.io/merchant-guide',
      external: true,
    },
  ];

  const completedSteps = setUpGuideSteps.filter(step => step.completed).length;

  return (
    <AdminLayout merchantId={merchantId}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold mb-6" id="dashboard-heading">Dashboard</h1>
        <Link
          href={createMerchantAdminRoute(merchantId, 'settings')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Settings
        </Link>
      </div>

      {/* Dashboard Stats with loading state and error handling */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6" aria-live="polite">
        {statsLoading ? (
          // Skeleton loading state
          <>
            <CardSkeleton lines={2} hasAction={false} />
            <CardSkeleton lines={2} hasAction={false} />
            <CardSkeleton lines={2} hasAction={false} />
            <CardSkeleton lines={2} hasAction={false} />
          </>
        ) : statsError ? (
          // Error state
          <div className="col-span-full bg-red-50 p-4 rounded-lg border border-red-200" role="alert">
            <h3 className="font-medium text-red-800">Unable to load dashboard statistics</h3>
            <p className="mt-1 text-sm text-red-700">
              {statsError instanceof Error ? statsError.message : 'An unknown error occurred'}
            </p>
            <button
              className="mt-2 px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200"
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>
          </div>
        ) : (
          // Loaded state
          <>
            <StatCard
              title="Total Orders"
              value={`${stats.totalOrders}`}
              change="+12% from last month"
              positive={true}
              href={createMerchantAdminRoute(merchantId, 'orders')}
            />
            <StatCard
              title="Revenue"
              value={`$${stats.revenue}`}
              change="+8% from last month"
              positive={true}
              href={createMerchantAdminRoute(merchantId, 'analytics/revenue')}
            />
            <StatCard
              title="Products"
              value={`${stats.totalProducts}`}
              change="+2 this week"
              positive={true}
              href={createMerchantAdminRoute(merchantId, 'products')}
            />
            <StatCard
              title="Customers"
              value={`${stats.totalCustomers}`}
              change="+3 this week"
              positive={true}
              href={createMerchantAdminRoute(merchantId, 'customers')}
            />
          </>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 id="recent-activity-heading" className="text-lg font-medium text-gray-900">Recent Activity</h2>
          <p className="text-gray-500 text-sm">Latest orders and customer interactions</p>
        </div>

        <ErrorBoundary>
          <Suspense fallback={<TableSkeleton rows={3} columns={3} />}>
            <div className="overflow-hidden">
              <div className="space-y-6">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="bg-white shadow sm:rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Order #{1000 + item}</h3>
                          <p className="mt-1 text-xs text-gray-500">2 hours ago</p>
                        </div>
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          Paid
                        </span>
                      </div>
                      <div className="mt-3">
                        <p className="text-sm text-gray-500">Customer: John Doe</p>
                        <p className="text-sm text-gray-500">Amount: $125.00</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Suspense>
        </ErrorBoundary>
      </div>

      {/* Setup Guide */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900" id="setup-guide-heading">Store Setup Guide</h2>
          <span className="text-sm text-gray-500" aria-live="polite">{completedSteps}/{setUpGuideSteps.length} completed</span>
        </div>

        <div className="space-y-4">
          {setUpGuideSteps.map((step: SetupGuideStep, index: number) => (
            <SetupStep
              key={index}
              title={step.title}
              description={step.description}
              completed={step.completed}
              href={step.href}
              external={step.external}
            />
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}

// Dashboard stat card with improved accessibility
function StatCard({
  title,
  value,
  change,
  positive,
  href
}: {
  title: string;
  value: string;
  change: string;
  positive: boolean;
  href: string;
}) {
  return (
    <Link href={href as Route} className="block">
      <div
        className="bg-white rounded-lg shadow p-6 h-full hover:shadow-md transition-shadow"
        aria-labelledby={`stat-title-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <h3
          id={`stat-title-${title.toLowerCase().replace(/\s+/g, '-')}`}
          className="text-sm font-medium text-gray-500 mb-1"
        >
          {title}
        </h3>
        <div className="flex items-end justify-between">
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change && (
            <span className={`text-sm ${positive ? 'text-green-600' : 'text-red-600'}`}>
              {change}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// Empty State Component with accessibility attributes
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center" role="status">
      <div className="rounded-full bg-gray-100 p-3 mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <p className="text-gray-500">{message}</p>
    </div>
  );
}

// Setup Step Component
function SetupStep({
  title,
  description,
  completed,
  href,
  external = false
}: {
  title: string;
  description: string;
  completed: boolean;
  href: string;
  external?: boolean;
}) {
  const StepContent = () => (
    <div className="flex items-start space-x-3">
      <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${completed ? 'bg-green-100' : 'bg-gray-100'
        }`}>
        {completed ? (
          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ) : (
          <div className={`w-2 h-2 rounded-full ${completed ? 'bg-green-600' : 'bg-gray-400'}`} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className={`text-sm font-medium ${completed ? 'text-green-800' : 'text-gray-900'
          }`}>
          {title}
        </h3>
        <p className={`text-sm ${completed ? 'text-green-600' : 'text-gray-500'
          }`}>
          {description}
        </p>
      </div>
    </div>
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`block p-4 rounded-lg border ${completed
          ? 'border-green-200 bg-green-50 hover:bg-green-100'
          : 'border-gray-200 bg-white hover:bg-gray-50'
          } transition-colors`}
      >
        <StepContent />
      </a>
    );
  }

  return (
    <Link
      href={href as Route}
      className={`block p-4 rounded-lg border ${completed
        ? 'border-green-200 bg-green-50 hover:bg-green-100'
        : 'border-gray-200 bg-white hover:bg-gray-50'
        } transition-colors`}
    >
      <StepContent />
    </Link>
  );
}
