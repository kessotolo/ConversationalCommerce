'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, ShoppingCart, DollarSign, Shield } from 'lucide-react';
import { KPIWidget } from './KPIWidget';
import { QuickActions } from './QuickActions';

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

interface DashboardOverviewProps {
    kpis: DashboardKPIs | null;
    metrics: DashboardMetrics | null;
}

export function DashboardOverview({ kpis, metrics }: DashboardOverviewProps) {
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

    return (
        <div className="space-y-4">
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
        </div>
    );
}