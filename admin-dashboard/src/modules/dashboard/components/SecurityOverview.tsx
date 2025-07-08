'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Lock,
    Eye,
    Users,
    Key,
    Shield,
    AlertTriangle
} from 'lucide-react';

export function SecurityOverview() {
    // Mock security data
    const securityData = {
        threat_level: 'medium',
        failed_logins: 23,
        security_violations: 5,
        active_sessions: 1247,
        ip_allowlist_entries: 15,
        two_factor_users: 89,
        recent_alerts: [
            {
                id: 1,
                type: 'Failed Login Attempts',
                description: 'Multiple failed login attempts from IP 192.168.1.100',
                severity: 'warning',
                timestamp: '2 mins ago'
            },
            {
                id: 2,
                type: 'Security Scan',
                description: 'Automated security scan completed successfully',
                severity: 'info',
                timestamp: '15 mins ago'
            },
            {
                id: 3,
                type: 'IP Allowlist Update',
                description: 'New IP address added to allowlist',
                severity: 'info',
                timestamp: '1 hour ago'
            }
        ]
    };

    const getThreatLevelColor = (level: string) => {
        switch (level) {
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

    const getSeverityVariant = (severity: string) => {
        switch (severity) {
            case 'critical':
                return 'destructive';
            case 'warning':
                return 'secondary';
            default:
                return 'outline';
        }
    };

    return (
        <div className="space-y-4">
            {/* Security Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Threat Level</CardTitle>
                        <Shield className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center space-x-2">
                            <Badge className={getThreatLevelColor(securityData.threat_level)}>
                                {securityData.threat_level.toUpperCase()}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Current security threat assessment
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Failed Logins</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{securityData.failed_logins}</div>
                        <p className="text-xs text-muted-foreground">
                            Last 24 hours
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{securityData.active_sessions}</div>
                        <p className="text-xs text-muted-foreground">
                            Currently logged in
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">2FA Enabled</CardTitle>
                        <Key className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{securityData.two_factor_users}%</div>
                        <p className="text-xs text-muted-foreground">
                            User adoption rate
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Security Alerts */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Recent Security Alerts</CardTitle>
                            <CardDescription>
                                Latest security events and notifications
                            </CardDescription>
                        </div>
                        <Button variant="outline" size="sm">
                            View All
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {securityData.recent_alerts.map((alert) => (
                            <div key={alert.id} className="flex items-start space-x-3 p-3 rounded-lg border">
                                <div className="p-2 rounded-full bg-muted">
                                    {alert.severity === 'warning' ? (
                                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                    ) : (
                                        <Shield className="h-4 w-4 text-blue-600" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-medium">{alert.type}</h4>
                                        <div className="flex items-center space-x-2">
                                            <Badge variant={getSeverityVariant(alert.severity)}>
                                                {alert.severity}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                {alert.timestamp}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {alert.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Security Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Security Actions</CardTitle>
                    <CardDescription>
                        Quick security management tools
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                            <Shield className="h-5 w-5" />
                            <div className="text-center">
                                <div className="text-sm font-medium">Security Scan</div>
                                <div className="text-xs text-muted-foreground">
                                    Run vulnerability scan
                                </div>
                            </div>
                        </Button>

                        <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                            <Lock className="h-5 w-5" />
                            <div className="text-center">
                                <div className="text-sm font-medium">IP Allowlist</div>
                                <div className="text-xs text-muted-foreground">
                                    Manage IP restrictions
                                </div>
                            </div>
                        </Button>

                        <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                            <Eye className="h-5 w-5" />
                            <div className="text-center">
                                <div className="text-sm font-medium">Audit Logs</div>
                                <div className="text-xs text-muted-foreground">
                                    View security logs
                                </div>
                            </div>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}