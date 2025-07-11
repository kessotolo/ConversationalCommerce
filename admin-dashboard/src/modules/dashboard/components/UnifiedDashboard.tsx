'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Activity,
    Bell,
    Search,
    RefreshCw,
    Server,
    Shield,
    User,
    Building2,
    CheckCircle,
    Users,
    ShoppingCart,
    DollarSign
} from 'lucide-react';

import { SecurityOverview } from './SecurityOverview';
import { GlobalSearch } from './GlobalSearch';
import { NotificationCenter } from './NotificationCenter';
import { TenantControlCenter } from '@/modules/tenant/components/TenantControlCenter';
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

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Loading SuperAdmin Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Professional Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                    <Shield className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-gray-900">SuperAdmin</h1>
                                    <p className="text-sm text-gray-500">ConversationalCommerce Control Center</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSearchOpen(true)}
                                className="hidden md:flex items-center space-x-2"
                            >
                                <Search className="h-4 w-4" />
                                <span>Quick Search</span>
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setNotificationsOpen(true)}
                                className="relative"
                            >
                                <Bell className="h-4 w-4" />
                                {kpis && (kpis.errors_today > 0 || kpis.security_events_today > 0) && (
                                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
                                )}
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={fetchDashboardData}
                                disabled={refreshing}
                                className="flex items-center space-x-2"
                            >
                                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                                <span className="hidden md:inline">Refresh</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Quick Stats Row */}
                {kpis && (
                    <div className="admin-grid admin-grid-cols-4 mb-8">
                        <div className="admin-metric-card">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="admin-metric-label">Total Tenants</p>
                                    <p className="admin-metric-value">{formatNumber(kpis.total_tenants)}</p>
                                    <p className="admin-metric-change positive">
                                        +{kpis.avg_daily_tenants.toFixed(1)} today
                                    </p>
                                </div>
                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <Building2 className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                        </div>

                        <div className="admin-metric-card">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="admin-metric-label">Active Users</p>
                                    <p className="admin-metric-value">{formatNumber(kpis.active_users)}</p>
                                    <p className="admin-metric-change positive">
                                        +{kpis.avg_daily_users.toFixed(1)} today
                                    </p>
                                </div>
                                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                    <Users className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                        </div>

                        <div className="admin-metric-card">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="admin-metric-label">Total Orders</p>
                                    <p className="admin-metric-value">{formatNumber(kpis.total_orders)}</p>
                                    <p className="admin-metric-change positive">
                                        +{kpis.avg_daily_orders.toFixed(1)} today
                                    </p>
                                </div>
                                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <ShoppingCart className="w-6 h-6 text-purple-600" />
                                </div>
                            </div>
                        </div>

                        <div className="admin-metric-card">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="admin-metric-label">Total Revenue</p>
                                    <p className="admin-metric-value">{formatCurrency(kpis.total_revenue)}</p>
                                    <p className="admin-metric-change positive">
                                        +{formatCurrency(kpis.avg_daily_revenue)} today
                                    </p>
                                </div>
                                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                                    <DollarSign className="w-6 h-6 text-yellow-600" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* System Health Banner */}
                {systemHealth && (
                    <div className="mb-8">
                        <div className={`admin-card p-4 ${systemHealth.overall_status === 'healthy'
                            ? 'border-green-200 bg-green-50'
                            : systemHealth.overall_status === 'warning'
                                ? 'border-yellow-200 bg-yellow-50'
                                : 'border-red-200 bg-red-50'
                            }`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className={`w-3 h-3 rounded-full ${systemHealth.overall_status === 'healthy'
                                        ? 'bg-green-500'
                                        : systemHealth.overall_status === 'warning'
                                            ? 'bg-yellow-500'
                                            : 'bg-red-500'
                                        }`}></div>
                                    <div>
                                        <p className="font-medium text-gray-900">
                                            System Status: {systemHealth.overall_status.charAt(0).toUpperCase() + systemHealth.overall_status.slice(1)}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            Uptime: {systemHealth.uptime_percentage.toFixed(2)}% |
                                            API Response: {systemHealth.api_response_time}ms |
                                            Error Rate: {systemHealth.error_rate.toFixed(2)}%
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-4 text-sm text-gray-600">
                                    <span>Database: {systemHealth.database_status}</span>
                                    <span>DB Response: {systemHealth.database_response_time}ms</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Dashboard Content */}
                <div className="admin-card">
                    <div className="admin-card-header">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 lg:w-auto bg-gray-100 p-1 rounded-lg">
                                <TabsTrigger value="overview" className="admin-tab-trigger">
                                    <Activity className="h-4 w-4" />
                                    <span className="hidden md:inline">Overview</span>
                                </TabsTrigger>
                                <TabsTrigger value="tenants" className="admin-tab-trigger">
                                    <Building2 className="h-4 w-4" />
                                    <span className="hidden md:inline">Tenants</span>
                                </TabsTrigger>
                                <TabsTrigger value="impersonation" className="admin-tab-trigger">
                                    <User className="h-4 w-4" />
                                    <span className="hidden md:inline">Impersonation</span>
                                </TabsTrigger>
                                <TabsTrigger value="monitoring" className="admin-tab-trigger">
                                    <Server className="h-4 w-4" />
                                    <span className="hidden md:inline">Monitoring</span>
                                </TabsTrigger>
                                <TabsTrigger value="security" className="admin-tab-trigger">
                                    <Shield className="h-4 w-4" />
                                    <span className="hidden md:inline">Security</span>
                                </TabsTrigger>
                                <TabsTrigger value="compliance" className="admin-tab-trigger">
                                    <CheckCircle className="h-4 w-4" />
                                    <span className="hidden md:inline">Compliance</span>
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    <div className="admin-card-content">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsContent value="overview" className="space-y-6">
                                <DashboardOverview
                                    metrics={metrics}
                                    kpis={kpis}
                                />
                            </TabsContent>
                            <TabsContent value="tenants" className="space-y-6">
                                <TenantControlCenter />
                            </TabsContent>
                            <TabsContent value="impersonation" className="space-y-6">
                                <TenantImpersonation />
                            </TabsContent>
                            <TabsContent value="monitoring" className="space-y-6">
                                <SystemMonitoring />
                            </TabsContent>
                            <TabsContent value="security" className="space-y-6">
                                <div className="space-y-6">
                                    <EmergencyControls />
                                    <SecurityOverview />
                                </div>
                            </TabsContent>
                            <TabsContent value="compliance" className="space-y-6">
                                <ComplianceDashboard />
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {searchOpen && (
                <GlobalSearch
                    open={searchOpen}
                    onClose={() => setSearchOpen(false)}
                />
            )}
            {notificationsOpen && (
                <NotificationCenter
                    open={notificationsOpen}
                    onClose={() => setNotificationsOpen(false)}
                />
            )}
        </div>
    );
}