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
    MoreHorizontal,
    User,
    CheckCircle
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
import { TenantImpersonation } from '@/modules/tenant/components/TenantImpersonation';

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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                            <p className="text-gray-600 mt-1">Super Admin Control Center for ConversationalCommerce</p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSearchOpen(true)}
                                className="hidden md:flex"
                            >
                                <Search className="h-4 w-4 mr-2" />
                                Quick Search
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setNotificationsOpen(true)}
                            >
                                <Bell className="h-4 w-4 mr-2" />
                                Notifications
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={fetchDashboardData}
                                disabled={refreshing}
                            >
                                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <Card className="shadow-xl border-0">
                    <CardHeader className="border-b bg-white">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 lg:w-auto">
                                <TabsTrigger value="overview" className="flex items-center gap-2">
                                    <Activity className="h-4 w-4" />
                                    <span className="hidden md:inline">Overview</span>
                                </TabsTrigger>
                                <TabsTrigger value="tenants" className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4" />
                                    <span className="hidden md:inline">Tenants</span>
                                </TabsTrigger>
                                <TabsTrigger value="impersonation" className="flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    <span className="hidden md:inline">Impersonation</span>
                                </TabsTrigger>
                                <TabsTrigger value="monitoring" className="flex items-center gap-2">
                                    <Server className="h-4 w-4" />
                                    <span className="hidden md:inline">Monitoring</span>
                                </TabsTrigger>
                                <TabsTrigger value="security" className="flex items-center gap-2">
                                    <Shield className="h-4 w-4" />
                                    <span className="hidden md:inline">Security</span>
                                </TabsTrigger>
                                <TabsTrigger value="compliance" className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4" />
                                    <span className="hidden md:inline">Compliance</span>
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsContent value="overview" className="p-6">
                                <DashboardOverview
                                    metrics={metrics}
                                    kpis={kpis}
                                    systemHealth={systemHealth}
                                    loading={loading}
                                />
                            </TabsContent>
                            <TabsContent value="tenants" className="p-6">
                                <TenantControlCenter />
                            </TabsContent>
                            <TabsContent value="impersonation" className="p-6">
                                <TenantImpersonation />
                            </TabsContent>
                            <TabsContent value="monitoring" className="p-6">
                                <SystemMonitoring />
                            </TabsContent>
                            <TabsContent value="security" className="p-6">
                                <div className="space-y-6">
                                    <EmergencyControls />
                                    <SecurityOverview />
                                </div>
                            </TabsContent>
                            <TabsContent value="compliance" className="p-6">
                                <ComplianceDashboard />
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>

            {/* Modals */}
            {searchOpen && (
                <GlobalSearch
                    isOpen={searchOpen}
                    onClose={() => setSearchOpen(false)}
                />
            )}
            {notificationsOpen && (
                <NotificationCenter
                    isOpen={notificationsOpen}
                    onClose={() => setNotificationsOpen(false)}
                />
            )}
        </div>
    );
}