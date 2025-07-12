'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Building2, ShoppingCart, Shield, TrendingUp, AlertTriangle, CheckCircle, Users, DollarSign, ArrowRight, Eye } from 'lucide-react';
import { QuickActions } from './QuickActions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
    active_users: number;
    total_revenue: number;
    system_health_score: number;
    security_score: number;
    errors_today: number;
}

interface DashboardOverviewProps {
    kpis: DashboardKPIs | null;
    metrics: DashboardMetrics | null;
    loading?: boolean;
}

export function DashboardOverview({ kpis, metrics, loading = false }: DashboardOverviewProps) {
    const router = useRouter();

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

    const getHealthColor = (score: number) => {
        if (score >= 90) return 'text-green-600 bg-green-50';
        if (score >= 70) return 'text-yellow-600 bg-yellow-50';
        return 'text-red-600 bg-red-50';
    };

    const getSecurityColor = (score: number) => {
        if (score >= 85) return 'text-green-600 bg-green-50';
        if (score >= 60) return 'text-yellow-600 bg-yellow-50';
        return 'text-red-600 bg-red-50';
    };

    const getErrorColor = (errors: number) => {
        if (errors === 0) return 'text-green-600 bg-green-50';
        if (errors <= 5) return 'text-yellow-600 bg-yellow-50';
        return 'text-red-600 bg-red-50';
    };

    const handleMetricClick = (metricType: string) => {
        switch (metricType) {
            case 'tenants':
                router.push('/dashboard/tenants');
                break;
            case 'users':
                router.push('/dashboard/users');
                break;
            case 'revenue':
                router.push('/dashboard/analytics/revenue');
                break;
            case 'health':
                router.push('/dashboard/monitoring/health');
                break;
            case 'security':
                router.push('/dashboard/security');
                break;
            case 'errors':
                router.push('/dashboard/monitoring/logs');
                break;
            case 'orders':
                router.push('/dashboard/orders');
                break;
            case 'products':
                router.push('/dashboard/products');
                break;
            case 'performance':
                router.push('/dashboard/monitoring/performance');
                break;
            default:
                console.log(`Navigate to ${metricType} details`);
        }
    };

    // Helper to render a metric card/button
    const MetricButton = ({
        onClick,
        icon,
        label,
        value,
        description,
        colorClass,
        viewText,
        disabled = false,
        tooltip
    }: {
        onClick?: () => void;
        icon: React.ReactNode;
        label: string;
        value: string | number;
        description: string;
        colorClass: string;
        viewText: string;
        to?: string;
        disabled?: boolean;
        tooltip?: string;
    }) => (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        className={`h-auto p-4 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 w-full flex flex-col items-start ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={disabled ? undefined : onClick}
                        disabled={disabled}
                        tabIndex={disabled ? -1 : 0}
                    >
                        <div className="flex items-center justify-between w-full mb-2">
                            {icon}
                            <span className="text-xs text-gray-500">{label}</span>
                        </div>
                        <div className={`text-2xl font-bold ${colorClass}`}>{value}</div>
                        <div className="text-xs text-gray-500 mt-1">{description}</div>
                        <div className={`flex items-center mt-2 text-xs ${colorClass}`}>
                            <span>{viewText}</span>
                            <ArrowRight className="w-3 h-3 ml-1" />
                        </div>
                    </Button>
                </TooltipTrigger>
                {tooltip && (
                    <TooltipContent>{tooltip}</TooltipContent>
                )}
            </Tooltip>
        </TooltipProvider>
    );

    if (loading) {
        return (
            <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-32" />
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="bg-white rounded-lg p-4 border border-gray-200">
                                    <Skeleton className="h-5 w-5 mb-2" />
                                    <Skeleton className="h-8 w-16 mb-2" />
                                    <Skeleton className="h-3 w-20" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* KPI Summary Row */}
            {kpis && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-xl">Platform Overview</CardTitle>
                                <CardDescription>Real-time metrics - Click any metric to view details</CardDescription>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push('/dashboard/analytics')}
                            >
                                <Eye className="w-4 h-4 mr-2" />
                                View Analytics
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            {/* Total Tenants */}
                            <MetricButton
                                onClick={() => handleMetricClick('tenants')}
                                icon={<Building2 className="w-5 h-5 text-blue-600" aria-hidden="true" />}
                                label="TENANTS"
                                value={formatNumber(kpis.total_tenants)}
                                description="Active merchants"
                                colorClass="text-blue-600"
                                viewText="View all tenants"
                                to="/dashboard/tenants"
                            />
                            {/* Active Users */}
                            <MetricButton
                                onClick={() => handleMetricClick('users')}
                                icon={<Users className="w-5 h-5 text-green-600" aria-hidden="true" />}
                                label="USERS"
                                value={formatNumber(kpis.active_users)}
                                description="Currently active"
                                colorClass="text-green-600"
                                viewText="View user analytics"
                                to="/dashboard/users"
                            />
                            {/* Total Revenue */}
                            <MetricButton
                                onClick={() => handleMetricClick('revenue')}
                                icon={<DollarSign className="w-5 h-5 text-yellow-600" aria-hidden="true" />}
                                label="REVENUE"
                                value={formatCurrency(kpis.total_revenue)}
                                description="Total platform"
                                colorClass="text-yellow-600"
                                viewText="View revenue report"
                                to="/dashboard/analytics/revenue"
                            />
                            {/* System Health */}
                            <MetricButton
                                onClick={() => handleMetricClick('health')}
                                icon={<CheckCircle className="w-5 h-5 text-green-500" aria-hidden="true" />}
                                label="HEALTH"
                                value={kpis.system_health_score + '%'}
                                description="System status"
                                colorClass={getHealthColor(kpis.system_health_score)}
                                viewText="View system health"
                                to="/dashboard/monitoring/health"
                            />
                            {/* Security */}
                            <MetricButton
                                onClick={() => handleMetricClick('security')}
                                icon={<Shield className="w-5 h-5 text-purple-600" aria-hidden="true" />}
                                label="SECURITY"
                                value={kpis.security_score + '%'}
                                description="Threat level"
                                colorClass={getSecurityColor(kpis.security_score)}
                                viewText="View security dashboard"
                                to="/dashboard/security"
                            />
                            {/* Errors */}
                            <MetricButton
                                onClick={() => handleMetricClick('errors')}
                                icon={<AlertTriangle className="w-5 h-5 text-red-600" aria-hidden="true" />}
                                label="ERRORS"
                                value={kpis.errors_today}
                                description="Today's issues"
                                colorClass={getErrorColor(kpis.errors_today)}
                                viewText="View error logs"
                                to="/dashboard/monitoring/logs"
                            />
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                    <QuickActions />
                </CardContent>
            </Card>

            {/* Detailed Metrics Grid */}
            {metrics && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Tenant Metrics */}
                    <Card className="hover:shadow-md transition-shadow duration-200 cursor-pointer" onClick={() => handleMetricClick('tenants')}>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base">Tenant Overview</CardTitle>
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <Building2 className="w-4 h-4 text-blue-600" aria-hidden="true" />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Verified Tenants</span>
                                    <span className="text-sm font-semibold text-gray-900">{metrics.tenant_metrics.verified_tenants}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">New This Period</span>
                                    <span className="text-sm font-semibold text-gray-900">{metrics.tenant_metrics.new_tenants}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Growth Rate</span>
                                    <span className={`text-sm font-semibold ${metrics.tenant_metrics.growth_rate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {metrics.tenant_metrics.growth_rate >= 0 ? '+' : ''}{metrics.tenant_metrics.growth_rate.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="pt-2 border-t border-gray-100">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <TrendingUp className="w-4 h-4 text-green-600" aria-hidden="true" />
                                            <span className="text-xs text-gray-500">Active growth trend</span>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-blue-600" />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Order Metrics */}
                    <Card className="hover:shadow-md transition-shadow duration-200 cursor-pointer" onClick={() => handleMetricClick('orders')}>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base">Order Performance</CardTitle>
                                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <ShoppingCart className="w-4 h-4 text-purple-600" aria-hidden="true" />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Completion Rate</span>
                                    <span className="text-sm font-semibold text-gray-900">{metrics.order_metrics.completion_rate.toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Avg Order Value</span>
                                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(metrics.order_metrics.avg_order_value)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Recent Orders</span>
                                    <span className="text-sm font-semibold text-gray-900">{metrics.order_metrics.recent_orders}</span>
                                </div>
                                <div className="pt-2 border-t border-gray-100">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <CheckCircle className="w-4 h-4 text-green-600" aria-hidden="true" />
                                            <span className="text-xs text-gray-500">High completion rate</span>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-purple-600" />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Security Metrics */}
                    <Card className="hover:shadow-md transition-shadow duration-200 cursor-pointer" onClick={() => handleMetricClick('security')}>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base">Security Status</CardTitle>
                                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                                    <Shield className="w-4 h-4 text-red-600" aria-hidden="true" />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Failed Logins</span>
                                    <span className="text-sm font-semibold text-gray-900">{metrics.security_metrics.failed_logins}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Security Violations</span>
                                    <span className="text-sm font-semibold text-gray-900">{metrics.security_metrics.security_violations}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Threat Level</span>
                                    <Badge className={`text-xs ${getThreatLevelColor(metrics.security_metrics.threat_level)}`}>
                                        {metrics.security_metrics.threat_level}
                                    </Badge>
                                </div>
                                <div className="pt-2 border-t border-gray-100">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <AlertTriangle className="w-4 h-4 text-yellow-600" aria-hidden="true" />
                                            <span className="text-xs text-gray-500">Monitoring active</span>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-red-600" />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* System Performance */}
            <Card className="hover:shadow-md transition-shadow duration-200 cursor-pointer" onClick={() => handleMetricClick('performance')}>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">System Performance</CardTitle>
                        <ArrowRight className="w-5 h-5 text-gray-400" />
                    </div>
                </CardHeader>
                <CardContent>
                    {metrics && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Uptime</span>
                                    <span className="text-sm font-semibold text-gray-900">{metrics.performance_metrics.uptime_percentage.toFixed(2)}%</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Avg Response Time</span>
                                    <span className="text-sm font-semibold text-gray-900">{metrics.performance_metrics.avg_response_time}ms</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Total Requests</span>
                                    <span className="text-sm font-semibold text-gray-900">{formatNumber(metrics.performance_metrics.total_requests)}</span>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Error Count</span>
                                    <span className="text-sm font-semibold text-gray-900">{metrics.performance_metrics.error_count}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Last Updated</span>
                                    <span className="text-sm font-semibold text-gray-900">{new Date(metrics.last_updated).toLocaleTimeString()}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* User Activity */}
            <Card className="hover:shadow-md transition-shadow duration-200 cursor-pointer" onClick={() => handleMetricClick('users')}>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">User Activity</CardTitle>
                        <ArrowRight className="w-5 h-5 text-gray-400" />
                    </div>
                </CardHeader>
                <CardContent>
                    {metrics && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-gray-900">{formatNumber(metrics.user_metrics.total_users)}</div>
                                <div className="text-sm text-gray-600">Total Users</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-gray-900">{formatNumber(metrics.user_metrics.active_users)}</div>
                                <div className="text-sm text-gray-600">Active Users</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-gray-900">{metrics.user_metrics.retention_rate.toFixed(1)}%</div>
                                <div className="text-sm text-gray-600">Retention Rate</div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Last Updated */}
            {metrics && (
                <div className="text-center text-sm text-gray-500">
                    Last updated: {new Date(metrics.last_updated).toLocaleString()}
                </div>
            )}
        </div>
    );
}