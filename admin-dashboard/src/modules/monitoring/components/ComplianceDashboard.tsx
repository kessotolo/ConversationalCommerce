'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Shield,
    CheckCircle,
    XCircle,
    AlertTriangle,
    FileText,
    Calendar
} from 'lucide-react';
import api from '@/lib/api';

interface ComplianceStatus {
    overall_score: number;
    data_protection: number;
    security_standards: number;
    audit_requirements: number;
    privacy_compliance: number;
    last_audit_date: string;
    next_audit_date: string;
    violations_count: number;
    resolved_violations: number;
}

interface ComplianceViolation {
    id: string;
    category: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    detected_at: string;
    resolved_at?: string;
    status: 'open' | 'resolved' | 'acknowledged';
    assigned_to?: string;
    notes?: string;
}

type ComplianceDashboardProps = Record<string, never>;

export function ComplianceDashboard({ }: ComplianceDashboardProps) {
    const [status, setStatus] = useState<ComplianceStatus | null>(null);
    const [violations, setViolations] = useState<ComplianceViolation[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchComplianceData = async () => {
        try {
            const [statusResponse, violationsResponse] = await Promise.all([
                api.get('/api/admin/compliance/status'),
                api.get('/api/admin/compliance/violations')
            ]);
            setStatus(statusResponse.data);
            setViolations(violationsResponse.data);
        } catch (error) {
            console.error('Error fetching compliance data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchComplianceData();
        const interval = setInterval(fetchComplianceData, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, []);

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-green-600';
        if (score >= 70) return 'text-yellow-600';
        if (score >= 50) return 'text-orange-600';
        return 'text-red-600';
    };

    const getScoreIcon = (score: number) => {
        if (score >= 90) return <CheckCircle className="h-4 w-4 text-green-600" />;
        if (score >= 70) return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
        if (score >= 50) return <AlertTriangle className="h-4 w-4 text-orange-600" />;
        return <XCircle className="h-4 w-4 text-red-600" />;
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'low':
                return 'bg-blue-500';
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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'resolved':
                return 'bg-green-500';
            case 'acknowledged':
                return 'bg-yellow-500';
            case 'open':
                return 'bg-red-500';
            default:
                return 'bg-gray-500';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Compliance Overview */}
            {status && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Overall Score</CardTitle>
                            {getScoreIcon(status.overall_score)}
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${getScoreColor(status.overall_score)}`}>
                                {status.overall_score}%
                            </div>
                            <Progress value={status.overall_score} className="mt-2" />
                            <p className="text-xs text-muted-foreground mt-2">
                                Compliance score
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Active Violations</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">
                                {status.violations_count}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {status.resolved_violations} resolved
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Last Audit</CardTitle>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {new Date(status.last_audit_date).toLocaleDateString()}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Audit completed
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Next Audit</CardTitle>
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {new Date(status.next_audit_date).toLocaleDateString()}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Scheduled audit
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Compliance Overview</TabsTrigger>
                    <TabsTrigger value="violations">Violations</TabsTrigger>
                    <TabsTrigger value="standards">Standards</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    {status && (
                        <div className="grid gap-4 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Compliance Categories</CardTitle>
                                    <CardDescription>
                                        Detailed compliance scores by category
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium">Data Protection</span>
                                                <span className="text-sm">{status.data_protection}%</span>
                                            </div>
                                            <Progress value={status.data_protection} className="h-2" />
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium">Security Standards</span>
                                                <span className="text-sm">{status.security_standards}%</span>
                                            </div>
                                            <Progress value={status.security_standards} className="h-2" />
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium">Audit Requirements</span>
                                                <span className="text-sm">{status.audit_requirements}%</span>
                                            </div>
                                            <Progress value={status.audit_requirements} className="h-2" />
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium">Privacy Compliance</span>
                                                <span className="text-sm">{status.privacy_compliance}%</span>
                                            </div>
                                            <Progress value={status.privacy_compliance} className="h-2" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Recent Activity</CardTitle>
                                    <CardDescription>
                                        Latest compliance activities and updates
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex items-center space-x-3">
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                            <div>
                                                <p className="text-sm font-medium">Security audit completed</p>
                                                <p className="text-xs text-muted-foreground">2 hours ago</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                            <div>
                                                <p className="text-sm font-medium">Data retention policy updated</p>
                                                <p className="text-xs text-muted-foreground">1 day ago</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                            <div>
                                                <p className="text-sm font-medium">Privacy compliance verified</p>
                                                <p className="text-xs text-muted-foreground">3 days ago</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="violations" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Compliance Violations</CardTitle>
                            <CardDescription>
                                Active and resolved compliance violations
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-96">
                                <div className="space-y-4">
                                    {violations.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                                            <p>No compliance violations found</p>
                                        </div>
                                    ) : (
                                        violations.map((violation) => (
                                            <div key={violation.id} className="flex items-start space-x-3 p-4 border rounded-lg">
                                                <div className="flex items-center space-x-2">
                                                    <Badge className={getSeverityColor(violation.severity)}>
                                                        {violation.severity}
                                                    </Badge>
                                                    <Badge className={getStatusColor(violation.status)}>
                                                        {violation.status}
                                                    </Badge>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <div className="font-medium">{violation.category}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {new Date(violation.detected_at).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        {violation.description}
                                                    </p>
                                                    {violation.assigned_to && (
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            Assigned to: {violation.assigned_to}
                                                        </p>
                                                    )}
                                                    {violation.notes && (
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            {violation.notes}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="standards" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Shield className="h-5 w-5 mr-2" />
                                    Security Standards
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm">ISO 27001</span>
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm">SOC 2 Type II</span>
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm">GDPR</span>
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Shield className="h-5 w-5 mr-2" />
                                    Data Protection
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm">Encryption at Rest</span>
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm">Encryption in Transit</span>
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm">Access Controls</span>
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Shield className="h-5 w-5 mr-2" />
                                    Privacy Compliance
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm">Data Minimization</span>
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm">Consent Management</span>
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm">Right to Erasure</span>
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}