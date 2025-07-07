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
import { TenantControlCenter } from '@/modules/tenant/components/TenantControlCenter';
import { FeatureFlagManagement } from '@/modules/feature-flags/components/FeatureFlagManagement';
import { ImpersonationManagement } from '@/modules/security/components/ImpersonationManagement';
import { ContextManagement } from '@/modules/context/components/ContextManagement';
import { SystemMonitoring } from '@/modules/monitoring/components/SystemMonitoring';
import { EmergencyControls } from '@/modules/emergency/components/EmergencyControls';
import { ComplianceDashboard } from '@/modules/compliance/components/ComplianceDashboard';
import { DashboardOverview } from './DashboardOverview';
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
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-9">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    <TabsTrigger value="security">Security</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                    <TabsTrigger value="tenants">Tenants</TabsTrigger>
                    <TabsTrigger value="features">Features</TabsTrigger>
                    <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
                    <TabsTrigger value="emergency">Emergency</TabsTrigger>
                    <TabsTrigger value="compliance">Compliance</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <DashboardOverview kpis={kpis} metrics={metrics} />
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

                <TabsContent value="tenants" className="space-y-4">
                    <TenantControlCenter />
                </TabsContent>

                <TabsContent value="features" className="space-y-4">
                    <div className="grid gap-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Feature Flag Management</h3>
                            <FeatureFlagManagement />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Impersonation Management</h3>
                            <ImpersonationManagement />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Context Management</h3>
                            <ContextManagement />
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="monitoring" className="space-y-4">
                    <SystemMonitoring />
                </TabsContent>

                <TabsContent value="emergency" className="space-y-4">
                    <EmergencyControls />
                </TabsContent>

                <TabsContent value="compliance" className="space-y-4">
                    <ComplianceDashboard />
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