'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
    Building2,
    Users,
    ShoppingCart,
    TrendingUp,
    AlertTriangle,
    CheckCircle,
    X,
    Activity,
    Shield,
    DollarSign,
    Clock,
    Eye,
    Edit,
    Trash2,
    Pause,
    Play,
    ArrowLeft,
    RefreshCw
} from 'lucide-react';

interface TenantDetailsProps {
    tenantId: string;
    onBack: () => void;
}

interface TenantActivity {
    id: string;
    type: string;
    title: string;
    description: string;
    timestamp: string;
    severity: 'info' | 'warning' | 'error';
    metadata?: Record<string, any>;
}

interface TenantHealth {
    status: 'healthy' | 'warning' | 'critical';
    uptime_percentage: number;
    response_time: number;
    error_rate: number;
    last_activity: string;
    active_sessions: number;
    database_connections: number;
    memory_usage: number;
    cpu_usage: number;
}

interface TenantUsage {
    period: string;
    total_orders: number;
    total_revenue: number;
    active_users: number;
    new_users: number;
    order_completion_rate: number;
    avg_order_value: number;
    top_products: Array<{
        name: string;
        orders: number;
        revenue: number;
    }>;
}

export function TenantDetails({ tenantId, onBack }: TenantDetailsProps) {
    const [tenant, setTenant] = useState<any>(null);
    const [activities, setActivities] = useState<TenantActivity[]>([]);
    const [health, setHealth] = useState<TenantHealth | null>(null);
    const [usage, setUsage] = useState<TenantUsage | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mock data - replace with API calls
        const mockTenant = {
            id: tenantId,
            name: 'TechCorp',
            subdomain: 'techcorp',
            custom_domain: 'techcorp.com',
            status: 'active',
            is_verified: true,
            created_at: '2024-01-15T10:30:00Z',
            admin_user_id: 'user1',
            admin_user_name: 'John Smith',
            metrics: {
                total_users: 1250,
                total_orders: 3420,
                total_revenue: 125000,
                active_users: 890,
                order_completion_rate: 94.5,
                avg_order_value: 36.5
            }
        };

        const mockActivities: TenantActivity[] = [
            {
                id: '1',
                type: 'order_created',
                title: 'New Order #1234',
                description: 'Order placed by user@example.com',
                timestamp: '2024-01-20T14:30:00Z',
                severity: 'info',
                metadata: { order_id: '1234', amount: 45.99 }
            },
            {
                id: '2',
                type: 'user_registered',
                title: 'New User Registration',
                description: 'User john.doe@techcorp.com registered',
                timestamp: '2024-01-20T13:15:00Z',
                severity: 'info'
            },
            {
                id: '3',
                type: 'payment_failed',
                title: 'Payment Failed',
                description: 'Payment failed for order #1230',
                timestamp: '2024-01-20T12:45:00Z',
                severity: 'warning',
                metadata: { order_id: '1230', error: 'Insufficient funds' }
            }
        ];

        const mockHealth: TenantHealth = {
            status: 'healthy',
            uptime_percentage: 99.8,
            response_time: 150,
            error_rate: 0.2,
            last_activity: '2024-01-20T14:30:00Z',
            active_sessions: 45,
            database_connections: 12,
            memory_usage: 65,
            cpu_usage: 42
        };

        const mockUsage: TenantUsage = {
            period: 'Last 30 days',
            total_orders: 3420,
            total_revenue: 125000,
            active_users: 890,
            new_users: 45,
            order_completion_rate: 94.5,
            avg_order_value: 36.5,
            top_products: [
                { name: 'Product A', orders: 150, revenue: 7500 },
                { name: 'Product B', orders: 120, revenue: 6000 },
                { name: 'Product C', orders: 95, revenue: 4750 }
            ]
        };

        setTenant(mockTenant);
        setActivities(mockActivities);
        setHealth(mockHealth);
        setUsage(mockUsage);
        setLoading(false);
    }, [tenantId]);

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'error':
                return 'text-red-600';
            case 'warning':
                return 'text-yellow-600';
            default:
                return 'text-blue-600';
        }
    };

    const getHealthColor = (status: string) => {
        switch (status) {
            case 'healthy':
                return 'text-green-600';
            case 'warning':
                return 'text-yellow-600';
            case 'critical':
                return 'text-red-600';
            default:
                return 'text-gray-600';
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!tenant) {
        return (
            <div className="text-center py-8">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-600" />
                <p>Tenant not found</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button variant="outline" onClick={onBack}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">{tenant.name}</h2>
                        <p className="text-muted-foreground">
                            {tenant.subdomain}.enwhe.com
                            {tenant.custom_domain && ` • ${tenant.custom_domain}`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <Badge variant={tenant.is_verified ? 'default' : 'secondary'}>
                        {tenant.is_verified ? 'Verified' : 'Unverified'}
                    </Badge>
                    <Badge variant="outline">
                        {tenant.status}
                    </Badge>
                    <Button variant="outline">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{tenant.metrics.total_users}</div>
                        <p className="text-xs text-muted-foreground">
                            {tenant.metrics.active_users} active
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{tenant.metrics.total_orders}</div>
                        <p className="text-xs text-muted-foreground">
                            {tenant.metrics.order_completion_rate}% completion
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(tenant.metrics.total_revenue)}</div>
                        <p className="text-xs text-muted-foreground">
                            Avg: {formatCurrency(tenant.metrics.avg_order_value)}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Health</CardTitle>
                        <Shield className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${getHealthColor(health?.status || 'healthy')}`}>
                            {health?.uptime_percentage}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Uptime
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="activity" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                    <TabsTrigger value="health">Health</TabsTrigger>
                    <TabsTrigger value="usage">Usage</TabsTrigger>
                </TabsList>

                <TabsContent value="activity" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Activity</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {activities.map((activity) => (
                                    <div key={activity.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                                        <div className={`p-2 rounded-full ${getSeverityColor(activity.severity)}`}>
                                            <Activity className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-sm font-medium">{activity.title}</h4>
                                            <p className="text-sm text-muted-foreground">{activity.description}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {formatDate(activity.timestamp)}
                                            </p>
                                        </div>
                                        <Badge variant="outline">
                                            {activity.type}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="health" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>System Health</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span>Uptime</span>
                                        <span>{health?.uptime_percentage}%</span>
                                    </div>
                                    <Progress value={health?.uptime_percentage} className="h-2" />
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span>Response Time</span>
                                        <span>{health?.response_time}ms</span>
                                    </div>
                                    <Progress value={100 - (health?.response_time || 0) / 2} className="h-2" />
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span>Error Rate</span>
                                        <span>{health?.error_rate}%</span>
                                    </div>
                                    <Progress value={100 - (health?.error_rate || 0)} className="h-2" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Resource Usage</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span>Memory Usage</span>
                                        <span>{health?.memory_usage}%</span>
                                    </div>
                                    <Progress value={health?.memory_usage} className="h-2" />
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span>CPU Usage</span>
                                        <span>{health?.cpu_usage}%</span>
                                    </div>
                                    <Progress value={health?.cpu_usage} className="h-2" />
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Active Sessions:</span>
                                        <div className="font-medium">{health?.active_sessions}</div>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">DB Connections:</span>
                                        <div className="font-medium">{health?.database_connections}</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="usage" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Usage Statistics - {usage?.period}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <div className="text-2xl font-bold">{usage?.total_orders}</div>
                                            <div className="text-sm text-muted-foreground">Total Orders</div>
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold">{formatCurrency(usage?.total_revenue || 0)}</div>
                                            <div className="text-sm text-muted-foreground">Revenue</div>
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold">{usage?.active_users}</div>
                                            <div className="text-sm text-muted-foreground">Active Users</div>
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold">{usage?.new_users}</div>
                                            <div className="text-sm text-muted-foreground">New Users</div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-medium mb-2">Top Products</h4>
                                    <div className="space-y-2">
                                        {usage?.top_products.map((product, index) => (
                                            <div key={index} className="flex justify-between text-sm">
                                                <span>{product.name}</span>
                                                <span>{product.orders} orders ({formatCurrency(product.revenue)})</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}