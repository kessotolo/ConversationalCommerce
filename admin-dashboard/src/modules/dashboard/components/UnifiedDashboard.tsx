'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Activity,
    AlertTriangle,
    Bell,
    ChevronRight,
    DollarSign,
    Eye,
    Search,
    Settings,
    Shield,
    TrendingUp,
    Users,
    Building2,
    ShoppingCart,
    Package,
    Server,
    Zap,
    RefreshCw,
    Filter,
    Download,
    MoreHorizontal
} from 'lucide-react';

import { KPIWidget } from './KPIWidget';
import { ActivityFeed } from './ActivityFeed';
import { SystemHealthWidget } from './SystemHealthWidget';
import { SecurityOverview } from './SecurityOverview';
import { QuickActions } from './QuickActions';
import { GlobalSearch } from './GlobalSearch';
import { NotificationCenter } from './NotificationCenter';
import api from '@/lib/api';

interface DashboardMetrics {
    tenant_metrics: {
        total_tenants: number;
        active_tenants: number;
        verified_tenants: number;
        new_tenants: number;
        growth_rate: number;
    };
    user_metrics: {
        total_users: number;
        active_users: number;
        new_users: number;
        active_in_period: number;
        retention_rate: number;
    };
    order_metrics: {
        total_orders: number;
        completed_orders: number;
        recent_orders: number;
        total_revenue: number;
        avg_order_value: number;
        completion_rate: number;
    };
    product_metrics: {
        total_products: number;
        active_products: number;
        new_products: number;
        total_inventory: number;
    };
    security_metrics: {
        successful_logins: number;
        failed_logins: number;
        security_violations: number;
        emergency_lockdowns: number;
        threat_level: string;
    };
    performance_metrics: {
        total_requests: number;
        avg_response_time: number;
        error_count: number;
        uptime_percentage: number;
    };
    last_updated: string;
}

interface DashboardKPIs {
    total_tenants: number;
    active_tenants: number;
    total_users: number;
    active_users: number;
    total_orders: number;
    total_revenue: number;
    avg_daily_tenants: number;
    avg_daily_users: number;
    avg_daily_orders: number;
    avg_daily_revenue: number;
    system_health_score: number;
    security_score: number;
    errors_today: number;
    security_events_today: number;
    lockdowns_today: number;
}

interface SystemHealth {
    overall_status: string;
    uptime_percentage: number;
    database_status: string;
    database_response_time: number;
    api_response_time: number;
    error_rate: number;
    services_status: Record<string, string>;
}

export function UnifiedDashboard() {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [kpis, setKPIs] = useState<DashboardKPIs | null>(null);
    const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [searchOpen, setSearchOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);

    // Auto-refresh interval (30 seconds)
    const REFRESH_INTERVAL = 30000;

    const fetchDashboardData = useCallback(async () => {
        try {
            setRefreshing(true);

            // Fetch all dashboard data in parallel using the configured API client
            const [metricsResponse, kpisResponse, healthResponse] = await Promise.all([
                api.get('/api/admin/dashboard/metrics'),
                api.get('/api/admin/dashboard/kpis'),
                api.get('/api/admin/dashboard/health')
            ]);

            setMetrics(metricsResponse.data);
            setKPIs(kpisResponse.data);
            setSystemHealth(healthResponse.data);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboardData();

        // Set up auto-refresh
        const interval = setInterval(fetchDashboardData, REFRESH_INTERVAL);

        return () => clearInterval(interval);
    }, [fetchDashboardData]);

    const formatNumber = (num: number) => {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'healthy':
            case 'active':
                return 'text-green-600';
            case 'warning':
            case 'degraded':
                return 'text-yellow-600';
            case 'critical':
            case 'error':
                return 'text-red-600';
            default:
                return 'text-gray-600';
        }
    };

    const getThreatLevelColor = (level: string) => {
        switch (level.toLowerCase()) {
            case 'low':
                return 'bg-green-500';
            case 'medium':
                return 'bg-yellow-500';
            case 'high':
                return 'bg-orange-500';
            case 'critical':
                return 'bg-red-500';
            default:
                return 'bg-gray-500';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-6 pt-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Super Admin Dashboard</h2>
                    <p className="text-muted-foreground">
                        Real-time platform overview and system monitoring
                    </p>
                </div>

                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSearchOpen(true)}
                        className="hidden sm:flex"
                    >
                        <Search className="h-4 w-4 mr-2" />
                        Search
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setNotificationsOpen(true)}
                        className="relative"
                    >
                        <Bell className="h-4 w-4" />
                        {kpis && (kpis.errors_today > 0 || kpis.security_events_today > 0) && (
                            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs">
                                {kpis.errors_today + kpis.security_events_today}
                            </Badge>
                        )}
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchDashboardData}
                        disabled={refreshing}
                    >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {/* Critical Alerts */}
            {kpis && (kpis.lockdowns_today > 0 || kpis.security_events_today > 5) && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Critical Security Alert</AlertTitle>
                    <AlertDescription>
                        {kpis.lockdowns_today > 0 && `${kpis.lockdowns_today} emergency lockdown(s) today. `}
                        {kpis.security_events_today > 5 && `High security activity detected (${kpis.security_events_today} events).`}
                        <Button variant="link" className="p-0 h-auto ml-2 text-destructive-foreground">
                            View Details <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {/* System Health Overview */}
            {systemHealth && (
                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium">System Health</CardTitle>
                            <Badge
                                variant={systemHealth.overall_status === 'healthy' ? 'default' : 'destructive'}
                                className={systemHealth.overall_status === 'healthy' ? 'bg-green-500' : ''}
                            >
                                {systemHealth.overall_status.toUpperCase()}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold">{systemHealth.uptime_percentage}%</div>
                                <div className="text-xs text-muted-foreground">Uptime</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold">{(systemHealth.api_response_time * 1000).toFixed(0)}ms</div>
                                <div className="text-xs text-muted-foreground">Response</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold">{systemHealth.error_rate.toFixed(1)}%</div>
                                <div className="text-xs text-muted-foreground">Error Rate</div>
                            </div>
                            <div className="text-center">
                                <div className={`text-2xl font-bold ${getStatusColor(systemHealth.database_status)}`}>
                                    {systemHealth.database_status === 'healthy' ? '✓' : '✗'}
                                </div>
                                <div className="text-xs text-muted-foreground">Database</div>
                            </div>
                            {kpis && (
                                <>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold">{kpis.system_health_score}%</div>
                                        <div className="text-xs text-muted-foreground">Health Score</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold">{kpis.security_score}%</div>
                                        <div className="text-xs text-muted-foreground">Security</div>
                                    </div>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Main Dashboard Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    <TabsTrigger value="security">Security</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    {/* KPI Cards */}
                    {kpis && (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <KPIWidget
                                title="Total Tenants"
                                value={formatNumber(kpis.total_tenants)}
                                subValue={`${kpis.active_tenants} active`}
                                icon={Building2}
                                trend={kpis.avg_daily_tenants > 0 ? 'up' : 'stable'}
                                trendValue={`+${kpis.avg_daily_tenants.toFixed(1)}/day`}
                            />
                            <KPIWidget
                                title="Total Users"
                                value={formatNumber(kpis.total_users)}
                                subValue={`${kpis.active_users} active`}
                                icon={Users}
                                trend={kpis.avg_daily_users > 0 ? 'up' : 'stable'}
                                trendValue={`+${kpis.avg_daily_users.toFixed(1)}/day`}
                            />
                            <KPIWidget
                                title="Total Orders"
                                value={formatNumber(kpis.total_orders)}
                                subValue={`${kpis.avg_daily_orders.toFixed(0)}/day avg`}
                                icon={ShoppingCart}
                                trend={kpis.avg_daily_orders > 0 ? 'up' : 'stable'}
                                trendValue={`+${kpis.avg_daily_orders.toFixed(1)}/day`}
                            />
                            <KPIWidget
                                title="Total Revenue"
                                value={formatCurrency(kpis.total_revenue)}
                                subValue={`${formatCurrency(kpis.avg_daily_revenue)}/day avg`}
                                icon={DollarSign}
                                trend={kpis.avg_daily_revenue > 0 ? 'up' : 'stable'}
                                trendValue={`+${formatCurrency(kpis.avg_daily_revenue)}/day`}
                            />
                        </div>
                    )}

                    {/* Detailed Metrics */}
                    {metrics && (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {/* Tenant Metrics */}
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Tenant Overview</CardTitle>
                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-sm">Verified Tenants</span>
                                            <span className="text-sm font-medium">{metrics.tenant_metrics.verified_tenants}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm">New This Period</span>
                                            <span className="text-sm font-medium">{metrics.tenant_metrics.new_tenants}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm">Growth Rate</span>
                                            <span className={`text-sm font-medium ${metrics.tenant_metrics.growth_rate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {metrics.tenant_metrics.growth_rate.toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Order Metrics */}
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Order Performance</CardTitle>
                                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-sm">Completion Rate</span>
                                            <span className="text-sm font-medium">{metrics.order_metrics.completion_rate.toFixed(1)}%</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm">Avg Order Value</span>
                                            <span className="text-sm font-medium">{formatCurrency(metrics.order_metrics.avg_order_value)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm">Recent Orders</span>
                                            <span className="text-sm font-medium">{metrics.order_metrics.recent_orders}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Security Overview */}
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Security Status</CardTitle>
                                    <Shield className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-sm">Threat Level</span>
                                            <Badge className={getThreatLevelColor(metrics.security_metrics.threat_level)}>
                                                {metrics.security_metrics.threat_level}
                                            </Badge>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm">Failed Logins</span>
                                            <span className="text-sm font-medium">{metrics.security_metrics.failed_logins}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm">Violations</span>
                                            <span className="text-sm font-medium">{metrics.security_metrics.security_violations}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Quick Actions */}
                    <QuickActions />
                </TabsContent>

                <TabsContent value="analytics" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Performance Trends</CardTitle>
                                <CardDescription>System performance over time</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-64 flex items-center justify-center text-muted-foreground">
                                    <TrendingUp className="h-8 w-8 mr-2" />
                                    Performance chart would go here
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Usage Analytics</CardTitle>
                                <CardDescription>Platform usage statistics</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-64 flex items-center justify-center text-muted-foreground">
                                    <Activity className="h-8 w-8 mr-2" />
                                    Usage analytics chart would go here
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="security" className="space-y-4">
                    <SecurityOverview />
                </TabsContent>

                <TabsContent value="activity" className="space-y-4">
                    <ActivityFeed />
                </TabsContent>
            </Tabs>

            {/* Global Search Modal */}
            {searchOpen && (
                <GlobalSearch
                    open={searchOpen}
                    onClose={() => setSearchOpen(false)}
                />
            )}

            {/* Notification Center */}
            {notificationsOpen && (
                <NotificationCenter
                    open={notificationsOpen}
                    onClose={() => setNotificationsOpen(false)}
                />
            )}
        </div>
    );
}