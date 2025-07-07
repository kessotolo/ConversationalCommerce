'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Shield,
    FileText,
    Download,
    Search,
    Filter,
    Calendar,
    User,
    Activity,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Clock,
    RefreshCw,
    Settings,
    Database,
    Lock,
    Eye,
    EyeOff,
    TrendingUp,
    TrendingDown,
    BarChart3
} from 'lucide-react';
import api from '@/lib/api';

interface AuditLog {
    id: string;
    timestamp: string;
    user_id: string;
    user_email: string;
    action: string;
    resource_type: string;
    resource_id: string;
    ip_address: string;
    user_agent: string;
    success: boolean;
    details: Record<string, any>;
    tenant_id?: string;
}

interface ComplianceReport {
    id: string;
    report_type: 'security' | 'privacy' | 'data_retention' | 'access_control';
    generated_at: string;
    generated_by: string;
    status: 'pending' | 'completed' | 'failed';
    findings: ComplianceFinding[];
    summary: {
        total_checks: number;
        passed_checks: number;
        failed_checks: number;
        compliance_score: number;
    };
}

interface ComplianceFinding {
    id: string;
    category: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    recommendation: string;
    status: 'open' | 'resolved' | 'in_progress';
    created_at: string;
    resolved_at?: string;
}

interface RegulatoryRequirement {
    id: string;
    regulation: string;
    requirement: string;
    description: string;
    status: 'compliant' | 'non_compliant' | 'pending_review';
    last_assessment: string;
    next_assessment: string;
    responsible_party: string;
}

export function ComplianceDashboard() {
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [complianceReports, setComplianceReports] = useState<ComplianceReport[]>([]);
    const [regulatoryRequirements, setRegulatoryRequirements] = useState<RegulatoryRequirement[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [dateRange, setDateRange] = useState('7d');

    const fetchComplianceData = async () => {
        try {
            setRefreshing(true);
            const [logsResponse, reportsResponse, requirementsResponse] = await Promise.all([
                api.get('/api/admin/compliance/audit-logs'),
                api.get('/api/admin/compliance/reports'),
                api.get('/api/admin/compliance/regulatory-requirements')
            ]);

            setAuditLogs(logsResponse.data);
            setComplianceReports(reportsResponse.data);
            setRegulatoryRequirements(requirementsResponse.data);
        } catch (error) {
            console.error('Error fetching compliance data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchComplianceData();
        const interval = setInterval(fetchComplianceData, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, []);

    const generateComplianceReport = async (reportType: string) => {
        try {
            await api.post('/api/admin/compliance/reports/generate', {
                report_type: reportType
            });
            fetchComplianceData();
        } catch (error) {
            console.error('Error generating compliance report:', error);
        }
    };

    const downloadAuditLogs = async () => {
        try {
            const response = await api.get('/api/admin/compliance/audit-logs/export', {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error downloading audit logs:', error);
        }
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
            case 'compliant':
                return 'text-green-600';
            case 'non_compliant':
                return 'text-red-600';
            case 'pending_review':
                return 'text-yellow-600';
            default:
                return 'text-gray-600';
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    const filteredAuditLogs = auditLogs.filter(log => {
        const matchesSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.resource_type.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesFilter = filterType === 'all' ||
            (filterType === 'success' && log.success) ||
            (filterType === 'failed' && !log.success);

        return matchesSearch && matchesFilter;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Compliance Dashboard</h2>
                    <p className="text-muted-foreground">Audit logs, compliance reports, and regulatory monitoring</p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchComplianceData}
                    disabled={refreshing}
                >
                    <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Compliance Overview */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Audit Logs</CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{auditLogs.length.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            Last 30 days
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
                        <Shield className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {complianceReports.length > 0 ?
                                `${complianceReports[0].summary.compliance_score}%` : 'N/A'
                            }
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Overall compliance
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Regulatory Status</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {regulatoryRequirements.filter(r => r.status === 'compliant').length}/{regulatoryRequirements.length}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Compliant requirements
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Failed Checks</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {complianceReports.length > 0 ?
                                complianceReports[0].summary.failed_checks : 0
                            }
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Requires attention
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="audit" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="audit">Audit Logs</TabsTrigger>
                    <TabsTrigger value="reports">Compliance Reports</TabsTrigger>
                    <TabsTrigger value="regulatory">Regulatory Requirements</TabsTrigger>
                </TabsList>

                <TabsContent value="audit" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Audit Logs</CardTitle>
                            <CardDescription>System activity and user actions audit trail</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center space-x-2 mb-4">
                                <div className="flex-1">
                                    <Input
                                        placeholder="Search audit logs..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="max-w-sm"
                                    />
                                </div>
                                <Select value={filterType} onValueChange={setFilterType}>
                                    <SelectTrigger className="w-32">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All</SelectItem>
                                        <SelectItem value="success">Success</SelectItem>
                                        <SelectItem value="failed">Failed</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button variant="outline" size="sm" onClick={downloadAuditLogs}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Export
                                </Button>
                            </div>
                            <ScrollArea className="h-96">
                                <div className="space-y-2">
                                    {filteredAuditLogs.map((log) => (
                                        <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                                            <div className="flex items-center space-x-3">
                                                <div className={`w-2 h-2 rounded-full ${log.success ? 'bg-green-500' : 'bg-red-500'}`} />
                                                <div>
                                                    <div className="font-medium">{log.action}</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {log.user_email} • {log.resource_type} • {log.ip_address}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-medium">{formatDate(log.timestamp)}</div>
                                                <Badge variant={log.success ? 'default' : 'destructive'}>
                                                    {log.success ? 'Success' : 'Failed'}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="reports" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Compliance Reports</CardTitle>
                                    <CardDescription>Generated compliance and security reports</CardDescription>
                                </div>
                                <div className="flex space-x-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => generateComplianceReport('security')}
                                    >
                                        <FileText className="h-4 w-4 mr-2" />
                                        Security Report
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => generateComplianceReport('privacy')}
                                    >
                                        <Shield className="h-4 w-4 mr-2" />
                                        Privacy Report
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-96">
                                <div className="space-y-4">
                                    {complianceReports.map((report) => (
                                        <div key={report.id} className="border rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <div>
                                                    <h3 className="font-medium capitalize">{report.report_type} Report</h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        Generated by {report.generated_by} on {formatDate(report.generated_at)}
                                                    </p>
                                                </div>
                                                <Badge variant={report.status === 'completed' ? 'default' : 'secondary'}>
                                                    {report.status}
                                                </Badge>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4 text-sm">
                                                <div>
                                                    <span className="text-muted-foreground">Total Checks:</span>
                                                    <div className="font-medium">{report.summary.total_checks}</div>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground">Passed:</span>
                                                    <div className="font-medium text-green-600">{report.summary.passed_checks}</div>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground">Failed:</span>
                                                    <div className="font-medium text-red-600">{report.summary.failed_checks}</div>
                                                </div>
                                            </div>
                                            <div className="mt-2">
                                                <span className="text-muted-foreground">Compliance Score:</span>
                                                <div className="text-lg font-bold">{report.summary.compliance_score}%</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="regulatory" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Regulatory Requirements</CardTitle>
                            <CardDescription>Compliance with regulatory standards and requirements</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-96">
                                <div className="space-y-4">
                                    {regulatoryRequirements.map((requirement) => (
                                        <div key={requirement.id} className="border rounded-lg p-4">
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <h3 className="font-medium">{requirement.regulation}</h3>
                                                    <p className="text-sm text-muted-foreground">{requirement.requirement}</p>
                                                    <p className="text-sm mt-1">{requirement.description}</p>
                                                </div>
                                                <Badge className={getStatusColor(requirement.status)}>
                                                    {requirement.status.replace('_', ' ')}
                                                </Badge>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                                                <div>
                                                    <span className="text-muted-foreground">Responsible:</span>
                                                    <div className="font-medium">{requirement.responsible_party}</div>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground">Next Assessment:</span>
                                                    <div className="font-medium">{formatDate(requirement.next_assessment)}</div>
                                                </div>
                                            </div>
                                            <div className="mt-2 text-xs text-muted-foreground">
                                                Last assessed: {formatDate(requirement.last_assessment)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}