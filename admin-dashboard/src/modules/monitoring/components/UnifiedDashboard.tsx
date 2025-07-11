'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Activity,
    AlertTriangle,
    Shield,
    TrendingUp,
    Users,
    Server,
    FileText
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { SystemMonitoring } from './SystemMonitoring';
import { EmergencyControls } from './EmergencyControls';
import { ComplianceDashboard } from './ComplianceDashboard';
import { ServiceHistory } from './ServiceHistory';

interface DashboardOverview {
    total_tenants: number;
    active_tenants: number;
    total_users: number;
    active_users: number;
    total_orders: number;
    revenue_today: number;
    revenue_month: number;
    system_health: string;
    critical_alerts: number;
    pending_reviews: number;
}

type UnifiedDashboardProps = Record<string, never>;

export function UnifiedDashboard({ }: UnifiedDashboardProps) {
    const [overview, setOverview] = useState<DashboardOverview | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // TODO: Replace with real API endpoint
        async function fetchOverview() {
            try {
                // Simulate API call
                const response = await fetch('/api/admin/dashboard/overview');
                if (!response.ok) throw new Error('Failed to fetch overview');
                const data = await response.json();
                setOverview(data);
                setError(null);
            } catch (error) {
                console.error('Failed to fetch dashboard overview:', error);
                setError(error instanceof Error ? error.message : 'Unknown error occurred');
                // Fallback: mock data for now
                setOverview({
                    total_tenants: 12,
                    active_tenants: 10,
                    total_users: 1200,
                    active_users: 900,
                    total_orders: 3400,
                    revenue_today: 1200,
                    revenue_month: 32000,
                    system_health: 'healthy',
                    critical_alerts: 1,
                    pending_reviews: 3
                });
            }
        }
        fetchOverview();
    }, []);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const getHealthColor = (health: string) => {
        switch (health.toLowerCase()) {
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

    return (
        <div className="space-y-6">
            {/* Dashboard Overview */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Activity className="h-5 w-5 mr-2" />
                        Dashboard Overview
                    </CardTitle>
                    <CardDescription>
                        Real-time platform metrics and system status
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {error && (
                        <Alert className="mb-4">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                Failed to load dashboard data: {error}
                            </AlertDescription>
                        </Alert>
                    )}
                    {overview && (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <div className="flex items-center space-x-3">
                                <Users className="h-8 w-8 text-blue-500" />
                                <div>
                                    <p className="text-sm font-medium">Total Tenants</p>
                                    <p className="text-2xl font-bold">{overview.total_tenants}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {overview.active_tenants} active
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-3">
                                <Users className="h-8 w-8 text-green-500" />
                                <div>
                                    <p className="text-sm font-medium">Total Users</p>
                                    <p className="text-2xl font-bold">{overview.total_users}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {overview.active_users} active
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-3">
                                <FileText className="h-8 w-8 text-purple-500" />
                                <div>
                                    <p className="text-sm font-medium">Total Orders</p>
                                    <p className="text-2xl font-bold">{overview.total_orders}</p>
                                    <p className="text-xs text-muted-foreground">
                                        Revenue: {formatCurrency(overview.revenue_month)}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-3">
                                <Server className="h-8 w-8 text-orange-500" />
                                <div>
                                    <p className="text-sm font-medium">System Health</p>
                                    <p className={`text-2xl font-bold ${getHealthColor(overview.system_health)}`}>
                                        {overview.system_health}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {overview.critical_alerts} critical alerts
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Main Dashboard Tabs */}
            <Tabs defaultValue="monitoring" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="monitoring" className="flex items-center space-x-2">
                        <Activity className="h-4 w-4" />
                        <span>Monitoring</span>
                    </TabsTrigger>
                    <TabsTrigger value="emergency" className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Emergency</span>
                    </TabsTrigger>
                    <TabsTrigger value="compliance" className="flex items-center space-x-2">
                        <Shield className="h-4 w-4" />
                        <span>Compliance</span>
                    </TabsTrigger>
                    <TabsTrigger value="history" className="flex items-center space-x-2">
                        <TrendingUp className="h-4 w-4" />
                        <span>History</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="monitoring" className="space-y-4">
                    <SystemMonitoring />
                </TabsContent>

                <TabsContent value="emergency" className="space-y-4">
                    <EmergencyControls />
                </TabsContent>

                <TabsContent value="compliance" className="space-y-4">
                    <ComplianceDashboard />
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                    <ServiceHistory />
                </TabsContent>
            </Tabs>
        </div>
    );
}