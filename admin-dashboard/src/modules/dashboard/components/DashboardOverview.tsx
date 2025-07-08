'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, ShoppingCart, DollarSign, Shield, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
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
        <div className="space-y-8">
            {/* Quick Actions */}
            <div className="admin-card">
                <div className="admin-card-header">
                    <CardTitle className="text-lg font-semibold text-gray-900">Quick Actions</CardTitle>
                </div>
                <div className="admin-card-content">
                    <QuickActions />
                </div>
            </div>

            {/* Detailed Metrics Grid */}
            {metrics && (
                <div className="admin-grid admin-grid-cols-3">
                    {/* Tenant Metrics */}
                    <div className="admin-card">
                        <div className="admin-card-header">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base font-semibold text-gray-900">Tenant Overview</CardTitle>
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <Building2 className="w-4 h-4 text-blue-600" />
                                </div>
                            </div>
                        </div>
                        <div className="admin-card-content">
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
                                    <div className="flex items-center space-x-2">
                                        <TrendingUp className="w-4 h-4 text-green-600" />
                                        <span className="text-xs text-gray-500">Active growth trend</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Order Metrics */}
                    <div className="admin-card">
                        <div className="admin-card-header">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base font-semibold text-gray-900">Order Performance</CardTitle>
                                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <ShoppingCart className="w-4 h-4 text-purple-600" />
                                </div>
                            </div>
                        </div>
                        <div className="admin-card-content">
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
                                    <div className="flex items-center space-x-2">
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                        <span className="text-xs text-gray-500">High completion rate</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Security Metrics */}
                    <div className="admin-card">
                        <div className="admin-card-header">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base font-semibold text-gray-900">Security Status</CardTitle>
                                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                                    <Shield className="w-4 h-4 text-red-600" />
                                </div>
                            </div>
                        </div>
                        <div className="admin-card-content">
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
                                    <Badge className={`admin-status-badge ${getThreatLevelColor(metrics.security_metrics.threat_level)}`}>
                                        {metrics.security_metrics.threat_level}
                                    </Badge>
                                </div>
                                <div className="pt-2 border-t border-gray-100">
                                    <div className="flex items-center space-x-2">
                                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                                        <span className="text-xs text-gray-500">Monitoring active</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Performance Metrics */}
            {metrics && (
                <div className="admin-card">
                    <div className="admin-card-header">
                        <CardTitle className="text-lg font-semibold text-gray-900">System Performance</CardTitle>
                    </div>
                    <div className="admin-card-content">
                        <div className="admin-grid admin-grid-cols-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-gray-900">{metrics.performance_metrics.total_requests.toLocaleString()}</div>
                                <div className="text-sm text-gray-600">Total Requests</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-gray-900">{metrics.performance_metrics.avg_response_time}ms</div>
                                <div className="text-sm text-gray-600">Avg Response Time</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-gray-900">{metrics.performance_metrics.error_count}</div>
                                <div className="text-sm text-gray-600">Errors Today</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-gray-900">{metrics.performance_metrics.uptime_percentage.toFixed(2)}%</div>
                                <div className="text-sm text-gray-600">Uptime</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* User Activity */}
            {metrics && (
                <div className="admin-card">
                    <div className="admin-card-header">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-semibold text-gray-900">User Activity</CardTitle>
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                <Users className="w-4 h-4 text-green-600" />
                            </div>
                        </div>
                    </div>
                    <div className="admin-card-content">
                        <div className="admin-grid admin-grid-cols-3">
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
                    </div>
                </div>
            )}

            {/* Last Updated */}
            {metrics && (
                <div className="text-center text-sm text-gray-500">
                    Last updated: {new Date(metrics.last_updated).toLocaleString()}
                </div>
            )}
        </div>
    );
}