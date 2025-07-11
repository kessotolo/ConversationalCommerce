'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
    Lock,
    Eye,
    Users,
    Key,
    Shield,
    AlertTriangle,
    RefreshCw,
    Activity,
    TrendingUp,
    TrendingDown
} from 'lucide-react';

interface SecurityData {
    threat_level: string;
    failed_logins: number;
    security_violations: number;
    active_sessions: number;
    ip_allowlist_entries: number;
    two_factor_users: number;
    security_score: number;
    recent_alerts: Array<{
        id: number;
        type: string;
        description: string;
        severity: 'info' | 'warning' | 'critical';
        timestamp: string;
    }>;
    threat_trend: 'increasing' | 'decreasing' | 'stable';
    last_updated: string;
}

export function SecurityOverview() {
    const [securityData, setSecurityData] = useState<SecurityData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchSecurityData = useCallback(async () => {
        try {
            setError(null);
            const response = await fetch('/api/admin/security/overview');
            if (response.ok) {
                const data = await response.json();
                setSecurityData(data);
            } else {
                throw new Error(`Failed to fetch security data: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error fetching security data:', error);
            setError(error instanceof Error ? error.message : 'Failed to load security data');

            // Fallback to mock data for development
            const mockData: SecurityData = {
                threat_level: 'medium',
                failed_logins: 23,
                security_violations: 5,
                active_sessions: 1247,
                ip_allowlist_entries: 15,
                two_factor_users: 89,
                security_score: 78,
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
                ],
                threat_trend: 'increasing',
                last_updated: new Date().toISOString()
            };
            setSecurityData(mockData);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSecurityData();
    }, [fetchSecurityData]);

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

    const getThreatTrendIcon = (trend: string) => {
        switch (trend) {
            case 'increasing':
                return <TrendingUp className="h-4 w-4 text-red-600" aria-hidden="true" />;
            case 'decreasing':
                return <TrendingDown className="h-4 w-4 text-green-600" aria-hidden="true" />;
            default:
                return <Activity className="h-4 w-4 text-gray-600" aria-hidden="true" />;
        }
    };

    const handleSecurityAction = async (action: string) => {
        try {
            const response = await fetch('/api/admin/security/actions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ action })
            });

            if (response.ok) {
                // Refresh data after action
                await fetchSecurityData();
            }
        } catch (error) {
            console.error('Error performing security action:', error);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchSecurityData();
        setRefreshing(false);
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                            </CardHeader>
                            <CardContent>
                                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-2" />
                                <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (!securityData) {
        return (
            <div className="space-y-4">
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        {error || 'Failed to load security data'}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Error Display */}
            {error && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Security Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Threat Level</CardTitle>
                        <div className="flex items-center space-x-1">
                            <Shield className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                            {getThreatTrendIcon(securityData.threat_trend)}
                        </div>
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
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
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
                        <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
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
                        <Key className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{securityData.two_factor_users}%</div>
                        <p className="text-xs text-muted-foreground">
                            User adoption rate
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Security Score */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Security Score</CardTitle>
                            <CardDescription>
                                Overall platform security assessment
                            </CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={refreshing}
                            aria-label="Refresh security data"
                        >
                            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Overall Score</span>
                            <span className="text-2xl font-bold">{securityData.security_score}%</span>
                        </div>
                        <Progress value={securityData.security_score} className="h-2" />
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Security Violations</span>
                                <span className="font-medium">{securityData.security_violations}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">IP Allowlist</span>
                                <span className="font-medium">{securityData.ip_allowlist_entries}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

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
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSecurityAction('view_all_alerts')}
                            aria-label="View all security alerts"
                        >
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
                                        <AlertTriangle className="h-4 w-4 text-yellow-600" aria-hidden="true" />
                                    ) : (
                                        <Shield className="h-4 w-4 text-blue-600" aria-hidden="true" />
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
                        <Button
                            variant="outline"
                            className="h-auto p-4 flex flex-col items-center space-y-2"
                            onClick={() => handleSecurityAction('security_scan')}
                            aria-label="Run security scan"
                        >
                            <Shield className="h-5 w-5" aria-hidden="true" />
                            <div className="text-center">
                                <div className="text-sm font-medium">Security Scan</div>
                                <div className="text-xs text-muted-foreground">
                                    Run vulnerability scan
                                </div>
                            </div>
                        </Button>

                        <Button
                            variant="outline"
                            className="h-auto p-4 flex flex-col items-center space-y-2"
                            onClick={() => handleSecurityAction('session_audit')}
                            aria-label="Audit active sessions"
                        >
                            <Eye className="h-5 w-5" aria-hidden="true" />
                            <div className="text-center">
                                <div className="text-sm font-medium">Session Audit</div>
                                <div className="text-xs text-muted-foreground">
                                    Review active sessions
                                </div>
                            </div>
                        </Button>

                        <Button
                            variant="outline"
                            className="h-auto p-4 flex flex-col items-center space-y-2"
                            onClick={() => handleSecurityAction('ip_management')}
                            aria-label="Manage IP allowlist"
                        >
                            <Lock className="h-5 w-5" aria-hidden="true" />
                            <div className="text-center">
                                <div className="text-sm font-medium">IP Management</div>
                                <div className="text-xs text-muted-foreground">
                                    Manage allowlist
                                </div>
                            </div>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Last Updated */}
            <div className="text-center text-sm text-muted-foreground">
                Last updated: {new Date(securityData.last_updated).toLocaleString()}
            </div>
        </div>
    );
}