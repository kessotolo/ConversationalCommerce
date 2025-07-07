'use client';

import {
  ShoppingBag,
  DollarSign,
  ArrowUpRight,
  PlusCircle,
  ChevronRight,
  CheckCircle,
  BarChart3,
  Users,
  Loader2,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

import { ChannelPerformance } from '@/components/dashboard/ChannelPerformance';
import { RecentOrders } from '@/components/dashboard/RecentOrders';
import { SalesChart } from '@/components/dashboard/SalesChart';
import { StatCard } from '@/components/dashboard/StatCard';
import { TopProducts } from '@/components/dashboard/TopProducts';
import OnboardingWizard from '@/modules/tenant/components/OnboardingWizard';
import { useAuth } from '@/utils/auth-utils';
import { useTenant } from '@/contexts/TenantContext';
import { HttpOrderService } from '@/modules/order/services/OrderService';
import { dashboardService } from '@/lib/api';
import type { Order } from '@/modules/order/models/order';
import { onboardingApi } from '@/modules/tenant/api/onboardingApi';
import type { OnboardingStatusResponse } from '@/modules/tenant/api/onboardingApi';
import { getStoredAuthToken } from '@/utils/auth-utils';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';
import type { DashboardStatsResponse } from '@/modules/core/models/dashboard';

// Define types to match component requirements
type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

interface Step {
  key: string;
  label: string;
  complete: boolean;
  action?: React.ReactNode;
}

// --- SmartNudgeCard component ---
function SmartNudgeCard({ steps, onOpenWizard }: { steps: Step[]; onOpenWizard: () => void }) {
  // Prioritize by logical order/impact
  const priority = [
    'addProduct',
    'payments',
    'domains',
    'notifications',
    'users',
    'storeDetails',
    'logo',
  ];
  const nextStep = priority
    .map((key) => steps.find((s) => s.key === key && !s.complete))
    .find(Boolean);
  if (!nextStep) return null;
  return (
    <div className="bg-white rounded-2xl border border-[#e6f0eb] shadow-sm p-6 mb-8 w-full max-w-sm hidden lg:block">
      <h2 className="text-lg font-bold text-gray-900 mb-2">Quick Start Tip</h2>
      <p className="text-gray-700 mb-4 text-base">
        {nextStep.label === 'Add your first product' && 'Add your first product to start selling!'}
        {nextStep.label === 'Configure payments' && 'Set up payments to get paid faster.'}
        {nextStep.label === 'Connect a domain' && 'Connect your domain to build trust with buyers.'}
        {nextStep.label === 'Set up notifications' &&
          'Enable notifications to stay updated on orders.'}
        {nextStep.label === 'Invite team members' && 'Invite your team to help manage your store.'}
        {nextStep.label === 'Set up store details' &&
          'Complete your store details for a professional look.'}
        {nextStep.label === 'Add a store logo' && 'Upload a logo to personalize your store.'}
      </p>
      <div className="flex gap-2">
        {nextStep.action && <div>{nextStep.action}</div>}
        <button className="text-xs text-[#6C9A8B] underline ml-2" onClick={onOpenWizard}>
          Open Onboarding Wizard
        </button>
      </div>
    </div>
  );
}

function OnboardingChecklist({ steps, onOpenWizard }: { steps: Step[]; onOpenWizard: () => void }) {
  // Prioritize incomplete steps, do not randomize order to avoid hydration mismatch
  const incomplete = steps.filter((s) => !s.complete);
  const complete = steps.filter((s) => s.complete);
  const ordered = [...incomplete, ...complete];
  const progress = steps.filter((s) => s.complete).length;
  return (
    <div className="bg-white rounded-2xl border border-[#e6f0eb] shadow-sm p-6 mb-8 w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">Get ready to sell</h2>
        <span className="text-xs text-gray-500">
          {progress} of {steps.length} complete
        </span>
      </div>
      <div className="w-full bg-[#f5f9f7] rounded-full h-2 mb-6">
        <div
          className="bg-[#6C9A8B] h-2 rounded-full transition-all"
          style={{ width: `${(progress / steps.length) * 100}%` }}
        />
      </div>
      <ul className="space-y-3">
        {ordered.map((step, idx) => (
          <li key={step.key} className="flex items-center justify-between group">
            <div className="flex items-center gap-3">
              {step.complete ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <span className="inline-block h-5 w-5 rounded-full border-2 border-[#e6f0eb] group-hover:border-[#6C9A8B]" />
              )}
              <span
                className={
                  step.complete ? 'text-gray-400 line-through' : 'text-gray-900 font-medium'
                }
              >
                {step.label}
              </span>
            </div>
            <div>{!step.complete && step.action}</div>
          </li>
        ))}
      </ul>
      <button
        className="mt-6 w-full bg-[#6C9A8B] hover:bg-[#5d8a7b] text-white font-semibold rounded-lg py-2"
        onClick={onOpenWizard}
      >
        Open Onboarding Wizard
      </button>
    </div>
  );
}

export default function Dashboard() {
  const [period, setPeriod] = useState<'7days' | '30days' | '90days'>('7days');
  const [showWizard, setShowWizard] = useState(false);
  const { isLoading, isAuthenticated } = useAuth();
  const { tenant } = useTenant();
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // State for real data
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<{ name: string; email: string; phone: string }[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatusResponse | null>(null);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!tenant?.id) return;
      setLoading(true);
      setError(null);
      try {
        const orderService = new HttpOrderService();
        const [ordersResult, analyticsRes] = await Promise.all([
          orderService.getOrders({ tenantId: tenant.id, limit: 100, offset: 0 }),
          dashboardService.getStats(),
        ]);
        if (ordersResult.success && Array.isArray(ordersResult.data?.items)) {
          setOrders(ordersResult.data.items);
          // Aggregate customers from orders
          const customerMap = new Map<string, { name: string; email: string; phone: string }>();
          for (const order of ordersResult.data.items) {
            const { name, email, phone } = order.customer;
            if (!customerMap.has(email)) {
              customerMap.set(email, { name, email, phone });
            }
          }
          setCustomers(Array.from(customerMap.values()));
        } else {
          setOrders([]);
          setCustomers([]);
        }
        setAnalytics(analyticsRes);
      } catch (err: unknown) {
        setError((err as Error).message ?? 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    if (tenant?.id) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.id, period]);

  useEffect(() => {
    const fetchOnboardingStatus = async () => {
      if (!tenant?.id) return;
      try {
        const token = getStoredAuthToken() ?? '';
        const status = await onboardingApi.getStatus(token);
        setOnboardingStatus(status);
      } catch (err) {
        setOnboardingError((err as Error).message ?? 'Failed to load onboarding status');
      }
    };
    fetchOnboardingStatus();
  }, [tenant?.id]);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await dashboardService.getStats();
        setStats(response.data);
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Failed to fetch dashboard stats';
        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, [toast]);

  // Handle loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfcf7]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#6C9A8B]" />
      </div>
    );
  }

  // Handle unauthenticated state
  if (!isAuthenticated) {
    // Will be handled by the auth utility's redirect
    return null;
  }

  // Use real onboarding status for checklist
  const steps: Step[] = onboardingStatus
    ? [
      {
        key: 'businessInfo',
        label: 'Business Info',
        complete: onboardingStatus.business_info_complete,
        action: (
          <button className="text-[#6C9A8B] font-semibold hover:underline flex items-center">
            Edit <ChevronRight className="ml-1 h-4 w-4" />
          </button>
        ),
      },
      {
        key: 'kyc',
        label: 'KYC',
        complete: onboardingStatus.kyc_complete,
        action: (
          <button className="text-[#6C9A8B] font-semibold hover:underline flex items-center">
            Submit <ChevronRight className="ml-1 h-4 w-4" />
          </button>
        ),
      },
      {
        key: 'kycUpload',
        label: 'KYC Document Upload',
        complete: onboardingStatus.kyc_upload_complete,
        action: (
          <button className="text-[#6C9A8B] font-semibold hover:underline flex items-center">
            Upload <ChevronRight className="ml-1 h-4 w-4" />
          </button>
        ),
      },
      {
        key: 'domain',
        label: 'Domain',
        complete: onboardingStatus.domain_complete,
        action: (
          <button className="text-[#6C9A8B] font-semibold hover:underline flex items-center">
            Set Domain <ChevronRight className="ml-1 h-4 w-4" />
          </button>
        ),
      },
      {
        key: 'teamInvite',
        label: 'Team Invite',
        complete: onboardingStatus.team_invite_complete,
        action: (
          <button className="text-[#6C9A8B] font-semibold hover:underline flex items-center">
            Invite <ChevronRight className="ml-1 h-4 w-4" />
          </button>
        ),
      },
    ]
    : [];

  // Before mapping orders for RecentOrders, filter to only include allowed statuses
  const allowedStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;
  const recentOrders = orders
    .filter((order) => allowedStatuses.includes(order.status as (typeof allowedStatuses)[number]))
    .map((order) => ({
      id: order.order_number,
      customerName: order.customer.name,
      amount: order.total_amount.amount,
      status: order.status.toLowerCase() as
        | 'pending'
        | 'processing'
        | 'shipped'
        | 'delivered'
        | 'cancelled',
      date: order.timeline[0]?.timestamp || '',
      phone: order.customer.phone,
    }));

  return (
    <>
      {/* Onboarding Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-4 w-full max-w-lg mx-auto relative animate-fade-in max-h-[90vh] overflow-y-auto">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition-colors"
              onClick={() => setShowWizard(false)}
              aria-label="Close onboarding wizard"
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <OnboardingWizard />
          </div>
        </div>
      )}
      <div className="min-h-screen bg-[#fdfcf7] py-6 px-2 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 mb-1 tracking-tight">Dashboard</h1>
            <p className="text-gray-500 text-base">Overview of your store performance</p>
          </div>
          {/* Period Selector */}
          <div className="mt-4 sm:mt-0 flex items-center gap-2 bg-[#f5f5f5] p-1 rounded-full shadow-sm">
            <button
              onClick={() => setPeriod('7days')}
              className={`px-4 py-1.5 text-sm rounded-full font-medium transition-all ${period === '7days' ? 'bg-[#6C9A8B] text-white shadow' : 'text-gray-600 hover:bg-[#e6f0eb]'}`}
            >
              7 Days
            </button>
            <button
              onClick={() => setPeriod('30days')}
              className={`px-4 py-1.5 text-sm rounded-full font-medium transition-all ${period === '30days' ? 'bg-[#6C9A8B] text-white shadow' : 'text-gray-600 hover:bg-[#e6f0eb]'}`}
            >
              30 Days
            </button>
            <button
              onClick={() => setPeriod('90days')}
              className={`px-4 py-1.5 text-sm rounded-full font-medium transition-all ${period === '90days' ? 'bg-[#6C9A8B] text-white shadow' : 'text-gray-600 hover:bg-[#e6f0eb]'}`}
            >
              90 Days
            </button>
          </div>
        </div>
        {/* Unified Onboarding Section */}
        <div className="flex flex-col lg:flex-row gap-6 mb-8">
          <SmartNudgeCard steps={steps} onOpenWizard={() => setShowWizard(true)} />
          <OnboardingChecklist steps={steps} onOpenWizard={() => setShowWizard(true)} />
        </div>
        {/* Quick Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-8 relative">
          <Link
            href="/dashboard/products/add"
            className="hidden sm:inline-flex bg-[#6C9A8B] text-white px-5 py-2 rounded-full text-sm font-semibold items-center shadow hover:bg-[#5d8a7b] transition-all ml-auto"
          >
            <PlusCircle className="mr-2 h-5 w-5" /> Add Product
          </Link>
          <Link
            href="/dashboard/orders"
            className="bg-white border border-[#e6f0eb] text-[#6C9A8B] px-5 py-2 rounded-full text-sm font-semibold flex items-center shadow-sm hover:bg-[#f5f9f7] transition-all"
          >
            <ShoppingBag className="mr-2 h-4 w-4" /> View Orders
          </Link>
          <Link
            href="/dashboard/analytics"
            className="bg-white border border-[#e6f0eb] text-[#6C9A8B] px-5 py-2 rounded-full text-sm font-semibold flex items-center shadow-sm hover:bg-[#f5f9f7] transition-all"
          >
            <BarChart3 className="mr-2 h-4 w-4" /> Analytics
          </Link>
        </div>

        {/* Floating Add Product Button (Mobile) */}
        <Link
          href="/dashboard/products/add"
          className="sm:hidden fixed bottom-6 right-6 z-50 bg-[#6C9A8B] text-white rounded-full shadow-lg p-4 flex items-center justify-center hover:bg-[#5d8a7b] transition-all"
        >
          <PlusCircle className="h-7 w-7" />
          <span className="sr-only">Add Product</span>
        </Link>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8 overflow-x-auto">
          <div className="min-w-0 rounded-2xl bg-white border border-[#e6f0eb] shadow-sm p-5 flex flex-col items-start">
            <StatCard
              title="Total Orders"
              value={orders.length}
              icon={<ShoppingBag className="h-5 w-5 text-[#6C9A8B]" />}
              change={analytics?.totalOrdersChange}
              trend={analytics?.totalOrdersTrend}
              subtitle="Last 30 days"
            />
          </div>
          <div className="min-w-0 rounded-2xl bg-white border border-[#e6f0eb] shadow-sm p-5 flex flex-col items-start">
            <StatCard
              title="Total Revenue"
              value={analytics?.totalRevenue}
              icon={<DollarSign className="h-5 w-5 text-[#6C9A8B]" />}
              change={analytics?.totalRevenueChange}
              trend={analytics?.totalRevenueTrend}
              subtitle="Last 30 days"
            />
          </div>
          <div className="min-w-0 rounded-2xl bg-white border border-[#e6f0eb] shadow-sm p-5 flex flex-col items-start">
            <StatCard
              title="Customers"
              value={customers.length}
              icon={<Users className="h-5 w-5 text-[#6C9A8B]" />}
              change={analytics?.customersChange}
              trend={analytics?.customersTrend}
              subtitle="Last 30 days"
            />
          </div>
          <div className="min-w-0 rounded-2xl bg-white border border-[#e6f0eb] shadow-sm p-5 flex flex-col items-start">
            <StatCard
              title="Conversion Rate"
              value={analytics?.conversionRate}
              icon={<ArrowUpRight className="h-5 w-5 text-[#6C9A8B]" />}
              change={analytics?.conversionRateChange}
              trend={analytics?.conversionRateTrend}
              subtitle="Last 30 days"
            />
          </div>
        </div>

        {/* Social-style Messages Feed */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Messages & Activity</h2>
          <div className="flex flex-col gap-4">
            {analytics?.recentMessages?.map((msg: any) => (
              <div
                key={msg.id}
                className="bg-white rounded-xl shadow-sm border border-[#e6f0eb] p-4 flex items-start gap-3"
              >
                <img
                  src={msg.avatar}
                  alt={msg.sender}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 text-sm">{msg.sender}</span>
                    <span className="text-xs text-gray-400">{msg.time}</span>
                  </div>
                  <div className="text-gray-700 text-sm">{msg.content}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sales Chart */}
        <div className="mb-8 rounded-2xl bg-white border border-[#e6f0eb] shadow-sm p-6">
          <SalesChart data={analytics?.salesData || []} period={period} />
        </div>

        {/* Data Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-2xl bg-white border border-[#e6f0eb] shadow-sm p-6">
            <RecentOrders orders={recentOrders} />
          </div>
          <div className="rounded-2xl bg-white border border-[#e6f0eb] shadow-sm p-6">
            <TopProducts products={analytics?.topProducts || []} />
          </div>
          <div className="rounded-2xl bg-white border border-[#e6f0eb] shadow-sm p-6">
            <ChannelPerformance data={analytics?.channelData || []} />
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
                {stats.revenueGrowth !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    {stats.revenueGrowth > 0 ? '+' : ''}{stats.revenueGrowth.toFixed(1)}% from last month
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalOrders}</div>
                {stats.ordersGrowth !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    {stats.ordersGrowth > 0 ? '+' : ''}{stats.ordersGrowth.toFixed(1)}% from last month
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalProducts || 0}</div>
                {stats.productsGrowth !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    {stats.productsGrowth > 0 ? '+' : ''}{stats.productsGrowth.toFixed(1)}% from last month
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers || 0}</div>
                {stats.customersGrowth !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    {stats.customersGrowth > 0 ? '+' : ''}{stats.customersGrowth.toFixed(1)}% from last month
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Analytics Dashboard Component */}
        <AnalyticsDashboard />
      </div>
      {/* Mobile Bottom Nav */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-lg flex justify-around items-center py-2 z-50 sm:hidden">
        <Link href="/dashboard" className="flex flex-col items-center text-[#6C9A8B]">
          <svg
            className="w-6 h-6 mb-0.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M3 12l2-2m0 0l7-7 7 7m-9 2v8m4-8v8m5 0a2 2 0 002-2V7a2 2 0 00-2-2h-3.5a2 2 0 00-2 2v1" />
          </svg>
          <span className="text-xs">Home</span>
        </Link>
        <Link href="/dashboard/orders" className="flex flex-col items-center text-gray-400">
          <svg
            className="w-6 h-6 mb-0.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M3 7h18M3 12h18M3 17h18" />
          </svg>
          <span className="text-xs">Orders</span>
        </Link>
        <Link href="/dashboard/products" className="flex flex-col items-center text-gray-400">
          <svg
            className="w-6 h-6 mb-0.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6m16 0v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6m16 0H4" />
          </svg>
          <span className="text-xs">Products</span>
        </Link>
        <Link href="/dashboard/messages" className="flex flex-col items-center text-gray-400">
          <svg
            className="w-6 h-6 mb-0.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          <span className="text-xs">Messages</span>
        </Link>
        <Link href="/dashboard/profile" className="flex flex-col items-center text-gray-400">
          <svg
            className="w-6 h-6 mb-0.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
          <span className="text-xs">Profile</span>
        </Link>
      </div>
    </>
  );
}
