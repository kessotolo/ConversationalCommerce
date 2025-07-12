'use client';

import {
  ShoppingBag,
  DollarSign,
  ArrowUpRight,
  PlusCircle,
  BarChart3,
  Users,
  Loader2,
  TrendingUp,
  ChevronRight,
  Zap,
  Target,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

import { ChannelPerformance } from '@/components/dashboard/ChannelPerformance';
import { RecentOrders } from '@/components/dashboard/RecentOrders';
import { SalesChart } from '@/components/dashboard/SalesChart';
import { StatCard } from '@/components/dashboard/StatCard';
import { TopProducts } from '@/components/dashboard/TopProducts';
import ActivationJourney from '@/components/dashboard/ActivationJourney';
import { defaultSetupTasks } from '@/components/dashboard/ActivationSetupStage';
import { defaultEngageTasks } from '@/components/dashboard/ActivationEngageStage';
import { defaultConvertTasks } from '@/components/dashboard/ActivationConvertStage';
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
import { Button } from '@/components/ui/button';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';
import type { DashboardStatsResponse } from '@/modules/core/models/dashboard';

// Define types to match component requirements
type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export default function Dashboard() {
  const [period, setPeriod] = useState<'7days' | '30days' | '90days'>('7days');
  const [showMobileActivationDrawer, setShowMobileActivationDrawer] = useState(false);
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

  useEffect(() => {
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

  // Map onboarding status to activation tasks
  const setupTasks = defaultSetupTasks.map((task) => ({
    ...task,
    completed: onboardingStatus ?
      (task.id === 'business-info' && onboardingStatus.business_info_complete) ||
      (task.id === 'upload-logo' && onboardingStatus.kyc_upload_complete) ||
      (task.id === 'kyc-documents' && onboardingStatus.kyc_complete) ||
      (task.id === 'domain-setup' && onboardingStatus.domain_complete) ||
      (task.id === 'payment-setup' && false) // Add payment status when available
      : false
  }));

  const engageTasks = defaultEngageTasks.map((task) => ({
    ...task,
    completed: false // Will be updated based on actual engagement status
  }));

  const convertTasks = defaultConvertTasks.map((task) => ({
    ...task,
    completed: false // Will be updated based on actual conversion status
  }));

  // Handle activation task actions
  const handleActivationTaskAction = (stage: 'setup' | 'engage' | 'convert', taskId: string) => {
    // Route to appropriate dashboard pages based on task
    const taskRoutes: Record<string, string> = {
      'business-info': '/dashboard/settings',
      'upload-logo': '/dashboard/storefront/customize',
      'kyc-documents': '/dashboard/settings',
      'domain-setup': '/dashboard/storefront',
      'payment-setup': '/dashboard/settings',
      'whatsapp-setup': '/dashboard/settings',
      'instagram-connect': '/dashboard/settings',
      'telegram-setup': '/dashboard/settings',
      'add-first-product': '/dashboard/products/add',
      'create-discount': '/dashboard/settings',
      'setup-analytics': '/dashboard/analytics',
      'test-purchase': '/dashboard/orders',
      'add-gift-option': '/dashboard/settings'
    };

    const route = taskRoutes[taskId];
    if (route) {
      window.location.href = route;
    }
  };

  // Handle journey completion
  const handleJourneyComplete = () => {
    toast({
      title: "🎉 Activation Complete!",
      description: "Your store is now ready to convert customers. Great job!",
    });
  };

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
    <div className="min-h-screen bg-[#fdfcf7] pb-20 md:pb-6">
      {/* Header with enhanced mobile spacing */}
      <div className="sticky top-0 z-30 bg-[#fdfcf7]/95 backdrop-blur-md border-b border-[#e6f0eb]/50 px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-1 tracking-tight">
              Welcome back, {tenant?.name || 'there'}! 👋
            </h1>
            <p className="text-gray-500 text-sm sm:text-base">Let's grow your business together</p>
          </div>

          {/* Enhanced Period Selector with better mobile touch targets */}
          <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm p-1 rounded-2xl shadow-sm border border-[#e6f0eb]/50 w-full sm:w-auto">
            {[
              { key: '7days', label: '7D' },
              { key: '30days', label: '30D' },
              { key: '90days', label: '90D' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPeriod(key as '7days' | '30days' | '90days')}
                className={`
                  flex-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-1.5 text-sm rounded-xl font-medium
                  transition-all duration-200 min-h-[44px] sm:min-h-[36px] flex items-center justify-center
                  ${period === key
                    ? 'bg-[#6C9A8B] text-white shadow-md transform scale-105'
                    : 'text-gray-600 hover:bg-[#e6f0eb]/50 active:scale-95'
                  }
                `}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 sm:space-y-8">
        {/* Activation Journey - Enhanced mobile experience */}
        <div className="relative">
          <ActivationJourney
            setupTasks={setupTasks}
            engageTasks={engageTasks}
            convertTasks={convertTasks}
            onTaskAction={handleActivationTaskAction}
            onJourneyComplete={handleJourneyComplete}
            showMobileDrawer={showMobileActivationDrawer}
            onMobileDrawerToggle={() => setShowMobileActivationDrawer(!showMobileActivationDrawer)}
          />
        </div>

        {/* Enhanced Quick Actions with better mobile layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Link
            href="/dashboard/products/add"
            className="group relative overflow-hidden bg-gradient-to-r from-[#6C9A8B] to-[#5d8a7b] text-white p-4 sm:p-5 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl group-hover:bg-white/30 transition-colors">
                <PlusCircle className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm sm:text-base">Add Product</h3>
                <p className="text-xs sm:text-sm text-white/80">Start selling</p>
              </div>
              <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>

          <Link
            href="/dashboard/orders"
            className="group relative overflow-hidden bg-white border-2 border-[#e6f0eb] p-4 sm:p-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 active:scale-95 hover:border-[#6C9A8B]/30"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#e6f0eb] rounded-xl group-hover:bg-[#6C9A8B]/10 transition-colors">
                <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6 text-[#6C9A8B]" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm sm:text-base text-gray-900">Orders</h3>
                <p className="text-xs sm:text-sm text-gray-600">{orders.length} total</p>
              </div>
              <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 opacity-60 group-hover:opacity-100 transition-opacity text-gray-400" />
            </div>
          </Link>

          <Link
            href="/dashboard/analytics"
            className="group relative overflow-hidden bg-white border-2 border-[#e6f0eb] p-4 sm:p-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 active:scale-95 hover:border-[#6C9A8B]/30"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#e6f0eb] rounded-xl group-hover:bg-[#6C9A8B]/10 transition-colors">
                <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-[#6C9A8B]" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm sm:text-base text-gray-900">Analytics</h3>
                <p className="text-xs sm:text-sm text-gray-600">View insights</p>
              </div>
              <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 opacity-60 group-hover:opacity-100 transition-opacity text-gray-400" />
            </div>
          </Link>

          <Link
            href="/dashboard/messages"
            className="group relative overflow-hidden bg-white border-2 border-[#e6f0eb] p-4 sm:p-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 active:scale-95 hover:border-[#6C9A8B]/30"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#e6f0eb] rounded-xl group-hover:bg-[#6C9A8B]/10 transition-colors">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-[#6C9A8B]" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm sm:text-base text-gray-900">Messages</h3>
                <p className="text-xs sm:text-sm text-gray-600">Chat with customers</p>
              </div>
              <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 opacity-60 group-hover:opacity-100 transition-opacity text-gray-400" />
            </div>
          </Link>
        </div>

        {/* Enhanced Stats Overview with better mobile stacking */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <Card className="relative overflow-hidden bg-white border-2 border-[#e6f0eb]/50 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 active:scale-95">
            <CardContent className="p-4 sm:p-5">
              <StatCard
                title="Total Orders"
                value={orders.length}
                icon={<ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6 text-[#6C9A8B]" />}
                change={analytics?.totalOrdersChange}
                trend={analytics?.totalOrdersTrend}
                subtitle="Last 30 days"
              />
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-white border-2 border-[#e6f0eb]/50 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 active:scale-95">
            <CardContent className="p-4 sm:p-5">
              <StatCard
                title="Total Revenue"
                value={analytics?.totalRevenue}
                icon={<DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-[#6C9A8B]" />}
                change={analytics?.totalRevenueChange}
                trend={analytics?.totalRevenueTrend}
                subtitle="Last 30 days"
              />
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-white border-2 border-[#e6f0eb]/50 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 active:scale-95">
            <CardContent className="p-4 sm:p-5">
              <StatCard
                title="Customers"
                value={customers.length}
                icon={<Users className="h-5 w-5 sm:h-6 sm:w-6 text-[#6C9A8B]" />}
                change={analytics?.customersChange}
                trend={analytics?.customersTrend}
                subtitle="Last 30 days"
              />
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-white border-2 border-[#e6f0eb]/50 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 active:scale-95">
            <CardContent className="p-4 sm:p-5">
              <StatCard
                title="Conversion Rate"
                value={analytics?.conversionRate}
                icon={<ArrowUpRight className="h-5 w-5 sm:h-6 sm:w-6 text-[#6C9A8B]" />}
                change={analytics?.conversionRateChange}
                trend={analytics?.conversionRateTrend}
                subtitle="Last 30 days"
              />
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Social-style Messages Feed */}
        <Card className="bg-white border-2 border-[#e6f0eb]/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#6C9A8B]" />
              Messages & Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 sm:space-y-4">
              {analytics?.recentMessages?.map((msg: any) => (
                <div
                  key={msg.id}
                  className="bg-[#f7faf9] rounded-xl p-3 sm:p-4 flex items-start gap-3 hover:bg-[#e6f0eb]/30 transition-colors"
                >
                  <img
                    src={msg.avatar}
                    alt={msg.sender}
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900 text-sm sm:text-base truncate">{msg.sender}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">{msg.time}</span>
                    </div>
                    <div className="text-gray-700 text-sm sm:text-base">{msg.content}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Sales Chart */}
        <Card className="bg-white border-2 border-[#e6f0eb]/50 shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <SalesChart data={analytics?.salesData || []} period={period} />
          </CardContent>
        </Card>

        {/* Enhanced Data Widgets with better mobile stacking */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <Card className="bg-white border-2 border-[#e6f0eb]/50 shadow-sm hover:shadow-md transition-all duration-300">
            <CardContent className="p-4 sm:p-6">
              <RecentOrders orders={recentOrders} />
            </CardContent>
          </Card>

          <Card className="bg-white border-2 border-[#e6f0eb]/50 shadow-sm hover:shadow-md transition-all duration-300">
            <CardContent className="p-4 sm:p-6">
              <TopProducts products={analytics?.topProducts || []} />
            </CardContent>
          </Card>

          <Card className="bg-white border-2 border-[#e6f0eb]/50 shadow-sm hover:shadow-md transition-all duration-300">
            <CardContent className="p-4 sm:p-6">
              <ChannelPerformance data={analytics?.channelData || []} />
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <Card className="bg-white border-2 border-[#e6f0eb]/50 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 active:scale-95">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
                {stats.revenueGrowth !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    {stats.revenueGrowth > 0 ? '+' : ''}{stats.revenueGrowth.toFixed(1)}% from last month
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white border-2 border-[#e6f0eb]/50 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 active:scale-95">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{stats.totalOrders}</div>
                {stats.ordersGrowth !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    {stats.ordersGrowth > 0 ? '+' : ''}{stats.ordersGrowth.toFixed(1)}% from last month
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white border-2 border-[#e6f0eb]/50 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 active:scale-95">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{stats.totalProducts || 0}</div>
                {stats.productsGrowth !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    {stats.productsGrowth > 0 ? '+' : ''}{stats.productsGrowth.toFixed(1)}% from last month
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white border-2 border-[#e6f0eb]/50 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 active:scale-95">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{stats.totalUsers || 0}</div>
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
        <AnalyticsDashboard stats={stats} onRefresh={fetchDashboardStats} />
      </div>
    </div>
  );
}
