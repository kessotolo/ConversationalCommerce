'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    Server,
    Database,
    Activity,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Clock
} from 'lucide-react';

interface SystemHealthWidgetProps {
    className?: string;
}

export function SystemHealthWidget({ className }: SystemHealthWidgetProps) {
    // Mock system health data
    const healthData = {
        overall_status: 'healthy',
        uptime_percentage: 99.9,
        database_status: 'healthy',
        api_response_time: 0.125,
        error_rate: 0.2,
        services: {
            'Authentication': 'healthy',
            'Order Processing': 'healthy',
            'Payment Gateway': 'warning',
            'Email Service': 'healthy',
            'SMS Service': 'healthy',
            'File Storage': 'healthy'
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'healthy':
                return <CheckCircle className="h-4 w-4 text-green-600" />;
            case 'warning':
                return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
            case 'error':
                return <XCircle className="h-4 w-4 text-red-600" />;
            default:
                return <Activity className="h-4 w-4 text-gray-600" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'healthy':
                return 'bg-green-500';
            case 'warning':
                return 'bg-yellow-500';
            case 'error':
                return 'bg-red-500';
            default:
                return 'bg-gray-500';
        }
    };

    return (
        <Card className={className}>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">System Health</CardTitle>
                    <Badge className={getStatusColor(healthData.overall_status)}>
                        {healthData.overall_status.toUpperCase()}
                    </Badge>
                </div>
                <CardDescription>
                    Real-time system status and performance metrics
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                            {healthData.uptime_percentage}%
                        </div>
                        <div className="text-sm text-muted-foreground">Uptime</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold">
                            {(healthData.api_response_time * 1000).toFixed(0)}ms
                        </div>
                        <div className="text-sm text-muted-foreground">Response Time</div>
                    </div>
                </div>

                {/* Error Rate */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Error Rate</span>
                        <span className="text-sm text-muted-foreground">
                            {healthData.error_rate}%
                        </span>
                    </div>
                    <Progress value={healthData.error_rate} className="h-2" />
                </div>

                {/* Services Status */}
                <div className="space-y-2">
                    <h4 className="text-sm font-medium">Services Status</h4>
                    <div className="space-y-1">
                        {Object.entries(healthData.services).map(([service, status]) => (
                            <div key={service} className="flex items-center justify-between">
                                <span className="text-sm">{service}</span>
                                <div className="flex items-center space-x-1">
                                    {getStatusIcon(status)}
                                    <span className="text-xs text-muted-foreground capitalize">
                                        {status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Database Status */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center space-x-2">
                        <Database className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Database</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        {getStatusIcon(healthData.database_status)}
                        <span className="text-xs text-muted-foreground capitalize">
                            {healthData.database_status}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}