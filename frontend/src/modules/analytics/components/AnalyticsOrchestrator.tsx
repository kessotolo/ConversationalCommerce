'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, TrendingUp, Users, ShoppingBag, Package } from 'lucide-react';

// Import analytics components (to be created)
// import RevenueAnalytics from './RevenueAnalytics';
// import CustomerAnalytics from './CustomerAnalytics';
// import ProductAnalytics from './ProductAnalytics';
// import RealTimeMetrics from './RealTimeMetrics';
import { useTenant } from '@/contexts/TenantContext';
import type { DashboardStatsResponse } from '@/modules/core/models/dashboard';

/**
 * Business Context:
 * - "Merchant" = Business customer using the platform to run their online store
 * - "Tenant" = Individual merchant's isolated data environment (tenant_id identifies each merchant)
 * - Multi-tenant SaaS architecture with data isolation
 * - Analytics provide insights for merchant business decision-making
 */

export interface AnalyticsTimeRange {
    label: string;
    value: string;
    days: number;
}

export interface AnalyticsFilters {
    timeRange: AnalyticsTimeRange;
    dateFrom?: string;
    dateTo?: string;
    channel?: string;
    productCategory?: string;
    customerSegment?: string;
}

export interface AnalyticsMetrics {
    totalRevenue: number;
    totalOrders: number;
    totalCustomers: number;
    totalProducts: number;
    averageOrderValue: number;
    conversionRate: number;
    customerLifetimeValue: number;
    returnCustomerRate: number;
    // Growth rates
    revenueGrowth: number;
    orderGrowth: number;
    customerGrowth: number;
    // Time-based data
    revenueByDay: Array<{ date: string; revenue: number; orders: number }>;
    topProducts: Array<{ id: string; name: string; sales: number; revenue: number }>;
    customerSegments: Array<{ segment: string; count: number; revenue: number }>;
    channelPerformance: Array<{ channel: string; orders: number; revenue: number }>;
}

const TIME_RANGES: AnalyticsTimeRange[] = [
    { label: 'Last 7 days', value: '7d', days: 7 },
    { label: 'Last 30 days', value: '30d', days: 30 },
    { label: 'Last 90 days', value: '90d', days: 90 },
    { label: 'Last 12 months', value: '12m', days: 365 },
];

interface AnalyticsOrchestratorProps {
    className?: string;
}

/**
 * Analytics Orchestrator Component
 *
 * Main coordinator for merchant analytics and business intelligence.
 * Provides comprehensive insights across revenue, customers, products,
 * and real-time metrics for informed business decisions.
 *
 * Features:
 * - Multi-view dashboard (Revenue, Customers, Products, Real-time)
 * - Advanced filtering and time range selection
 * - Real-time data updates
 * - Export capabilities
 * - Mobile-optimized responsive design
 * - Data caching for performance
 * - Error handling and retry mechanisms
 */
export default function AnalyticsOrchestrator({ className = '' }: AnalyticsOrchestratorProps) {
    const { tenant } = useTenant();
    const { toast } = useToast();

    // State management
    const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'customers' | 'products' | 'realtime'>('overview');
    const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState<AnalyticsFilters>({
        timeRange: { label: 'Last 30 days', value: '30d', days: 30 }, // Default to 30 days
    });
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // Fetch analytics data with error handling and retry logic
    const fetchAnalyticsData = useCallback(async (showLoading = true) => {
        if (!tenant?.id) return;

        if (showLoading) setIsLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                tenant_id: tenant.id,
                time_range: filters.timeRange.value,
                ...(filters.dateFrom && { date_from: filters.dateFrom }),
                ...(filters.dateTo && { date_to: filters.dateTo }),
                ...(filters.channel && { channel: filters.channel }),
                ...(filters.productCategory && { product_category: filters.productCategory }),
                ...(filters.customerSegment && { customer_segment: filters.customerSegment }),
            });

            // Fetch analytics data from multiple endpoints in parallel
            const [
                dashboardStatsRes,
                revenueAnalyticsRes,
                customerAnalyticsRes,
                productAnalyticsRes
            ] = await Promise.all([
                fetch(`/api/v1/admin/dashboard/stats?${params}`),
                fetch(`/api/v1/analytics/revenue?${params}`),
                fetch(`/api/v1/analytics/customers?${params}`),
                fetch(`/api/v1/analytics/products?${params}`)
            ]);

            if (!dashboardStatsRes.ok) {
                throw new Error('Failed to fetch dashboard statistics');
            }

            const [dashboardStats, revenueData, customerData, productData] = await Promise.all([
                dashboardStatsRes.json(),
                revenueAnalyticsRes.ok ? revenueAnalyticsRes.json() : { revenue_by_day: [], total_revenue: 0 },
                customerAnalyticsRes.ok ? customerAnalyticsRes.json() : { segments: [], metrics: {} },
                productAnalyticsRes.ok ? productAnalyticsRes.json() : { top_products: [], metrics: {} }
            ]);

            // Transform and combine data into analytics metrics
            const analyticsMetrics: AnalyticsMetrics = {
                totalRevenue: dashboardStats.total_revenue || 0,
                totalOrders: dashboardStats.total_orders || 0,
                totalCustomers: dashboardStats.total_customers || 0,
                totalProducts: dashboardStats.total_products || 0,
                averageOrderValue: dashboardStats.avg_order_value || 0,
                conversionRate: dashboardStats.conversion_rate || 0,
                customerLifetimeValue: customerData.metrics?.lifetime_value || 0,
                returnCustomerRate: customerData.metrics?.return_rate || 0,

                // Growth rates
                revenueGrowth: dashboardStats.revenue_growth || 0,
                orderGrowth: dashboardStats.order_growth || 0,
                customerGrowth: dashboardStats.customer_growth || 0,

                // Time-based data
                revenueByDay: revenueData.revenue_by_day || [],
                topProducts: productData.top_products || [],
                customerSegments: customerData.segments || [],
                channelPerformance: dashboardStats.channel_performance || [],
            };

            setMetrics(analyticsMetrics);
            setLastUpdated(new Date());

            // Cache data for offline access
            localStorage.setItem(`analytics_${tenant.id}_${filters.timeRange.value}`, JSON.stringify({
                data: analyticsMetrics,
                timestamp: Date.now(),
            }));

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load analytics data';
            setError(errorMessage);

            // Try to load cached data
            const cachedData = localStorage.getItem(`analytics_${tenant.id}_${filters.timeRange.value}`);
            if (cachedData) {
                try {
                    const parsed = JSON.parse(cachedData);
                    if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) { // 24 hours
                        setMetrics(parsed.data);
                        toast({
                            title: 'Using cached data',
                            description: 'Showing previously loaded analytics data',
                            variant: 'default',
                        });
                    }
                } catch {
                    // Ignore cache parsing errors
                }
            }

            toast({
                title: 'Error loading analytics',
                description: errorMessage,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [tenant?.id, filters, toast]);

    // Load data on component mount and filter changes
    useEffect(() => {
        fetchAnalyticsData();
    }, [fetchAnalyticsData]);

    // Refresh handler
    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await fetchAnalyticsData(false);
    }, [fetchAnalyticsData]);

    // Filter change handlers
    const handleTimeRangeChange = useCallback((timeRange: AnalyticsTimeRange) => {
        setFilters(prev => ({ ...prev, timeRange }));
    }, []);

    const handleFilterChange = useCallback((newFilters: Partial<AnalyticsFilters>) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    }, []);

    // Export handler
    const handleExport = useCallback(async (format: 'csv' | 'pdf' | 'excel') => {
        if (!tenant?.id || !metrics) return;

        try {
            const params = new URLSearchParams({
                tenant_id: tenant.id,
                format,
                time_range: filters.timeRange.value,
            });

            const response = await fetch(`/api/v1/analytics/export?${params}`);
            if (!response.ok) throw new Error('Export failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `analytics_${filters.timeRange.value}_${Date.now()}.${format}`;
            a.click();
            window.URL.revokeObjectURL(url);

            toast({
                title: 'Export successful',
                description: `Analytics data exported as ${format.toUpperCase()}`,
            });
        } catch (err) {
            toast({
                title: 'Export failed',
                description: 'Unable to export analytics data',
                variant: 'destructive',
            });
        }
    }, [tenant?.id, metrics, filters, toast]);

    if (!tenant?.id) {
        return (
            <div className={`p-6 ${className}`}>
                <Card>
                    <CardContent className="p-8 text-center">
                        <h2 className="text-xl font-semibold mb-2">No merchant selected</h2>
                        <p className="text-muted-foreground">Please select a merchant to view analytics</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className={`p-4 sm:p-6 space-y-6 ${className}`}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">Analytics Dashboard</h1>
                    <p className="text-muted-foreground mt-1">
                        Business insights for {tenant.subdomain}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {lastUpdated && (
                        <Badge variant="outline" className="text-xs">
                            Updated {lastUpdated.toLocaleTimeString()}
                        </Badge>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="flex items-center gap-2"
                    >
                        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Time Range Selector */}
            <div className="flex flex-wrap gap-2">
                {TIME_RANGES.map((range) => (
                    <Button
                        key={range.value}
                        variant={filters.timeRange.value === range.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleTimeRangeChange(range)}
                        className="text-xs"
                    >
                        {range.label}
                    </Button>
                ))}
            </div>

            {/* Error State */}
            {error && (
                <Card className="border-destructive">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <p className="text-destructive text-sm">{error}</p>
                            <Button variant="outline" size="sm" onClick={handleRefresh}>
                                Retry
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Loading State */}
            {isLoading ? (
                <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            ) : (
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-6">
                    {/* Tab Navigation */}
                    <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 gap-1">
                        <TabsTrigger value="overview" className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            <span className="hidden sm:inline">Overview</span>
                        </TabsTrigger>
                        <TabsTrigger value="revenue" className="flex items-center gap-2">
                            <span className="text-lg">💰</span>
                            <span className="hidden sm:inline">Revenue</span>
                        </TabsTrigger>
                        <TabsTrigger value="customers" className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span className="hidden sm:inline">Customers</span>
                        </TabsTrigger>
                        <TabsTrigger value="products" className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            <span className="hidden sm:inline">Products</span>
                        </TabsTrigger>
                        <TabsTrigger value="realtime" className="flex items-center gap-2">
                            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="hidden sm:inline">Live</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* Tab Content */}
                    <TabsContent value="overview">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Total Revenue</p>
                                            <p className="text-2xl font-bold">${metrics?.totalRevenue?.toLocaleString() || '0'}</p>
                                            <p className={`text-xs ${(metrics?.revenueGrowth || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {(metrics?.revenueGrowth || 0) >= 0 ? '+' : ''}{metrics?.revenueGrowth?.toFixed(1) || '0'}% from last period
                                            </p>
                                        </div>
                                        <span className="text-2xl">💰</span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Total Orders</p>
                                            <p className="text-2xl font-bold">{metrics?.totalOrders?.toLocaleString() || '0'}</p>
                                            <p className={`text-xs ${(metrics?.orderGrowth || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {(metrics?.orderGrowth || 0) >= 0 ? '+' : ''}{metrics?.orderGrowth?.toFixed(1) || '0'}% from last period
                                            </p>
                                        </div>
                                        <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Customers</p>
                                            <p className="text-2xl font-bold">{metrics?.totalCustomers?.toLocaleString() || '0'}</p>
                                            <p className={`text-xs ${(metrics?.customerGrowth || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {(metrics?.customerGrowth || 0) >= 0 ? '+' : ''}{metrics?.customerGrowth?.toFixed(1) || '0'}% from last period
                                            </p>
                                        </div>
                                        <Users className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Avg Order Value</p>
                                            <p className="text-2xl font-bold">${metrics?.averageOrderValue?.toFixed(2) || '0.00'}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {metrics?.conversionRate?.toFixed(1) || '0'}% conversion rate
                                            </p>
                                        </div>
                                        <TrendingUp className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Overview Charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card>
                                <CardContent className="p-6">
                                    <h3 className="text-lg font-medium mb-4">Revenue Analytics</h3>
                                    <p className="text-muted-foreground">Coming soon - Advanced revenue charts and insights</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-6">
                                    <h3 className="text-lg font-medium mb-4">Customer Analytics</h3>
                                    <p className="text-muted-foreground">Coming soon - Customer behavior analysis</p>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="revenue">
                        <Card>
                            <CardContent className="p-6">
                                <h3 className="text-lg font-medium mb-4">Revenue Analytics</h3>
                                <p className="text-muted-foreground">Advanced revenue dashboard coming soon</p>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="customers">
                        <Card>
                            <CardContent className="p-6">
                                <h3 className="text-lg font-medium mb-4">Customer Analytics</h3>
                                <p className="text-muted-foreground">Customer analytics dashboard coming soon</p>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="products">
                        <Card>
                            <CardContent className="p-6">
                                <h3 className="text-lg font-medium mb-4">Product Analytics</h3>
                                <p className="text-muted-foreground">Product performance dashboard coming soon</p>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="realtime">
                        <Card>
                            <CardContent className="p-6">
                                <h3 className="text-lg font-medium mb-4">Real-time Metrics</h3>
                                <p className="text-muted-foreground">Live dashboard coming soon</p>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}