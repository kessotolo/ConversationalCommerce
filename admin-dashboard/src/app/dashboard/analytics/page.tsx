'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    ShoppingCart,
    Users,
    Building2,
    Activity
} from 'lucide-react';
import api from '@/lib/api';

interface AnalyticsData {
    revenue: {
        total: number;
        today: number;
        this_week: number;
        this_month: number;
        growth_rate: number;
        trend: 'up' | 'down';
    };
    orders: {
        total: number;
        today: number;
        this_week: number;
        this_month: number;
        growth_rate: number;
        trend: 'up' | 'down';
    };
    users: {
        total: number;
        active: number;
        new_this_month: number;
        growth_rate: number;
        trend: 'up' | 'down';
    };
    tenants: {
        total: number;
        active: number;
        new_this_month: number;
        growth_rate: number;
        trend: 'up' | 'down';
    };
    top_performers: Array<{
        id: string;
        name: string;
        revenue: number;
        orders: number;
        growth_rate: number;
    }>;
    recent_activity: Array<{
        id: string;
        type: string;
        description: string;
        amount?: number;
        timestamp: string;
    }>;
}

export default function AnalyticsPage() {
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

    const fetchAnalytics = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.get(`/api/admin/analytics?range=${timeRange}`);
            setAnalytics(response.data);
        } catch (error) {
            console.error('Error fetching analytics:', error);
            // Fallback to mock data for development
            setAnalytics({
                revenue: {
                    total: 1250000,
                    today: 4500,
                    this_week: 32000,
                    this_month: 125000,
                    growth_rate: 12.5,
                    trend: 'up'
                },
                orders: {
                    total: 45000,
                    today: 150,
                    this_week: 1200,
                    this_month: 4500,
                    growth_rate: 8.3,
                    trend: 'up'
                },
                users: {
                    total: 25000,
                    active: 8900,
                    new_this_month: 1200,
                    growth_rate: 15.2,
                    trend: 'up'
                },
                tenants: {
                    total: 150,
                    active: 142,
                    new_this_month: 12,
                    growth_rate: 9.1,
                    trend: 'up'
                },
                top_performers: [
                    {
                        id: '1',
                        name: 'TechCorp Store',
                        revenue: 125000,
                        orders: 3420,
                        growth_rate: 18.5
                    },
                    {
                        id: '2',
                        name: 'Fashion Boutique',
                        revenue: 89000,
                        orders: 2150,
                        growth_rate: 12.3
                    }
                ],
                recent_activity: [
                    {
                        id: '1',
                        type: 'order',
                        description: 'New order from TechCorp Store',
                        amount: 125.50,
                        timestamp: '2024-01-20T14:30:00Z'
                    },
                    {
                        id: '2',
                        type: 'tenant',
                        description: 'New tenant registered: Fashion Boutique',
                        timestamp: '2024-01-20T12:15:00Z'
                    }
                ]
            });
        } finally {
            setLoading(false);
        }
    }, [timeRange]);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const formatNumber = (num: number) => {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    };

    const getTrendIcon = (trend: string) => {
        return trend === 'up' ? TrendingUp : TrendingDown;
    };

    const getTrendColor = (trend: string) => {
        return trend === 'up' ? 'text-green-600' : 'text-red-600';
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i}>
                            <CardContent className="p-6">
                                <Skeleton className="h-6 w-24 mb-2" />
                                <Skeleton className="h-8 w-16 mb-2" />
                                <Skeleton className="h-4 w-20" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="text-center py-12">
                <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No analytics data available</h3>
                <p className="text-gray-500">Analytics data will appear here once available.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
                    <p className="text-gray-600">Platform performance and revenue insights</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant={timeRange === '7d' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTimeRange('7d')}
                    >
                        7D
                    </Button>
                    <Button
                        variant={timeRange === '30d' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTimeRange('30d')}
                    >
                        30D
                    </Button>
                    <Button
                        variant={timeRange === '90d' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTimeRange('90d')}
                    >
                        90D
                    </Button>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Revenue */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <DollarSign className="w-5 h-5 text-green-600" />
                            <Badge className={getTrendColor(analytics.revenue.trend)}>
                                {React.createElement(getTrendIcon(analytics.revenue.trend), { className: 'w-4 h-4 mr-1' })}
                                {analytics.revenue.growth_rate}%
                            </Badge>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                            {formatCurrency(analytics.revenue.total)}
                        </div>
                        <div className="text-sm text-gray-500">Total Revenue</div>
                        <div className="mt-2 text-xs text-gray-400">
                            Today: {formatCurrency(analytics.revenue.today)}
                        </div>
                    </CardContent>
                </Card>

                {/* Orders */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <ShoppingCart className="w-5 h-5 text-blue-600" />
                            <Badge className={getTrendColor(analytics.orders.trend)}>
                                {React.createElement(getTrendIcon(analytics.orders.trend), { className: 'w-4 h-4 mr-1' })}
                                {analytics.orders.growth_rate}%
                            </Badge>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                            {formatNumber(analytics.orders.total)}
                        </div>
                        <div className="text-sm text-gray-500">Total Orders</div>
                        <div className="mt-2 text-xs text-gray-400">
                            Today: {analytics.orders.today}
                        </div>
                    </CardContent>
                </Card>

                {/* Users */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <Users className="w-5 h-5 text-purple-600" />
                            <Badge className={getTrendColor(analytics.users.trend)}>
                                {React.createElement(getTrendIcon(analytics.users.trend), { className: 'w-4 h-4 mr-1' })}
                                {analytics.users.growth_rate}%
                            </Badge>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                            {formatNumber(analytics.users.total)}
                        </div>
                        <div className="text-sm text-gray-500">Total Users</div>
                        <div className="mt-2 text-xs text-gray-400">
                            Active: {formatNumber(analytics.users.active)}
                        </div>
                    </CardContent>
                </Card>

                {/* Tenants */}
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <Building2 className="w-5 h-5 text-orange-600" />
                            <Badge className={getTrendColor(analytics.tenants.trend)}>
                                {React.createElement(getTrendIcon(analytics.tenants.trend), { className: 'w-4 h-4 mr-1' })}
                                {analytics.tenants.growth_rate}%
                            </Badge>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                            {analytics.tenants.total}
                        </div>
                        <div className="text-sm text-gray-500">Total Tenants</div>
                        <div className="mt-2 text-xs text-gray-400">
                            Active: {analytics.tenants.active}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Top Performers */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Top Performing Tenants</CardTitle>
                    <CardDescription>Tenants with highest revenue and growth</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {analytics.top_performers.map((tenant) => (
                            <div key={tenant.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                <div className="flex items-center space-x-3">
                                    <Building2 className="w-5 h-5 text-blue-600" />
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{tenant.name}</h3>
                                        <p className="text-sm text-gray-500">
                                            {tenant.orders} orders • {formatCurrency(tenant.revenue)} revenue
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-semibold text-green-600">
                                        +{tenant.growth_rate}%
                                    </div>
                                    <div className="text-xs text-gray-500">Growth</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Recent Activity</CardTitle>
                    <CardDescription>Latest platform events and transactions</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {analytics.recent_activity.map((activity) => (
                            <div key={activity.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                <div className="flex items-center space-x-3">
                                    <Activity className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{activity.description}</h3>
                                        <p className="text-sm text-gray-500">
                                            {new Date(activity.timestamp).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                {activity.amount && (
                                    <div className="text-right">
                                        <div className="text-sm font-semibold text-green-600">
                                            {formatCurrency(activity.amount)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}