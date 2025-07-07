'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
    Flag,
    Settings,
    Users,
    Building2,
    Activity,
    TrendingUp,
    AlertTriangle,
    CheckCircle,
    X,
    Plus,
    Edit,
    Trash2,
    Eye,
    Clock,
    RefreshCw,
    ArrowLeft,
    Save,
    Undo,
    Target,
    Filter,
    Search
} from 'lucide-react';

interface FeatureFlag {
    id: string;
    name: string;
    key: string;
    description: string;
    enabled: boolean;
    type: 'boolean' | 'string' | 'number' | 'json';
    default_value: any;
    targeting: {
        enabled: boolean;
        rules: Array<{
            id: string;
            type: 'tenant' | 'user' | 'percentage' | 'custom';
            condition: string;
            value: any;
        }>;
    };
    deployment: {
        environment: 'development' | 'staging' | 'production';
        status: 'draft' | 'deployed' | 'rolled_back';
        deployed_at?: string;
        deployed_by?: string;
    };
    metrics: {
        total_requests: number;
        enabled_requests: number;
        usage_percentage: number;
        last_accessed: string;
    };
    audit_log: Array<{
        id: string;
        action: string;
        user: string;
        timestamp: string;
        details: Record<string, any>;
    }>;
    created_at: string;
    updated_at: string;
}

interface FeatureFlagManagementProps {
    className?: string;
}

export function FeatureFlagManagement({ className }: FeatureFlagManagementProps) {
    const [flags, setFlags] = useState<FeatureFlag[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [environmentFilter, setEnvironmentFilter] = useState('all');
    const [selectedFlag, setSelectedFlag] = useState<FeatureFlag | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAuditModal, setShowAuditModal] = useState(false);

    // Mock data - replace with API call
    useEffect(() => {
        const mockFlags: FeatureFlag[] = [
            {
                id: '1',
                name: 'New Checkout Flow',
                key: 'new_checkout_flow',
                description: 'Enable the new streamlined checkout experience',
                enabled: true,
                type: 'boolean',
                default_value: false,
                targeting: {
                    enabled: true,
                    rules: [
                        {
                            id: 'rule1',
                            type: 'tenant',
                            condition: 'tenant_id',
                            value: ['tenant1', 'tenant2']
                        },
                        {
                            id: 'rule2',
                            type: 'percentage',
                            condition: 'percentage',
                            value: 25
                        }
                    ]
                },
                deployment: {
                    environment: 'production',
                    status: 'deployed',
                    deployed_at: '2024-01-15T10:30:00Z',
                    deployed_by: 'admin@enwhe.com'
                },
                metrics: {
                    total_requests: 15420,
                    enabled_requests: 3855,
                    usage_percentage: 25.0,
                    last_accessed: '2024-01-20T14:30:00Z'
                },
                audit_log: [
                    {
                        id: 'log1',
                        action: 'created',
                        user: 'admin@enwhe.com',
                        timestamp: '2024-01-10T09:00:00Z',
                        details: { enabled: false, default_value: false }
                    },
                    {
                        id: 'log2',
                        action: 'deployed',
                        user: 'admin@enwhe.com',
                        timestamp: '2024-01-15T10:30:00Z',
                        details: { environment: 'production', targeting_rules: 2 }
                    }
                ],
                created_at: '2024-01-10T09:00:00Z',
                updated_at: '2024-01-15T10:30:00Z'
            },
            {
                id: '2',
                name: 'Advanced Analytics',
                key: 'advanced_analytics',
                description: 'Enable enhanced analytics dashboard for premium tenants',
                enabled: false,
                type: 'boolean',
                default_value: false,
                targeting: {
                    enabled: true,
                    rules: [
                        {
                            id: 'rule3',
                            type: 'tenant',
                            condition: 'tenant_tier',
                            value: 'premium'
                        }
                    ]
                },
                deployment: {
                    environment: 'staging',
                    status: 'draft',
                },
                metrics: {
                    total_requests: 0,
                    enabled_requests: 0,
                    usage_percentage: 0,
                    last_accessed: 'Never'
                },
                audit_log: [
                    {
                        id: 'log3',
                        action: 'created',
                        user: 'admin@enwhe.com',
                        timestamp: '2024-01-18T14:00:00Z',
                        details: { enabled: false, default_value: false }
                    }
                ],
                created_at: '2024-01-18T14:00:00Z',
                updated_at: '2024-01-18T14:00:00Z'
            }
        ];

        setFlags(mockFlags);
        setLoading(false);
    }, []);

    const filteredFlags = flags.filter(flag => {
        const matchesSearch = flag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            flag.key.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'enabled' && flag.enabled) ||
            (statusFilter === 'disabled' && !flag.enabled);
        const matchesEnvironment = environmentFilter === 'all' ||
            flag.deployment.environment === environmentFilter;
        return matchesSearch && matchesStatus && matchesEnvironment;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'deployed':
                return 'bg-green-500';
            case 'draft':
                return 'bg-yellow-500';
            case 'rolled_back':
                return 'bg-red-500';
            default:
                return 'bg-gray-500';
        }
    };

    const getEnvironmentColor = (environment: string) => {
        switch (environment) {
            case 'production':
                return 'text-red-600';
            case 'staging':
                return 'text-yellow-600';
            case 'development':
                return 'text-blue-600';
            default:
                return 'text-gray-600';
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    const handleToggleFlag = (flagId: string) => {
        setFlags(prev => prev.map(flag =>
            flag.id === flagId ? { ...flag, enabled: !flag.enabled } : flag
        ));
    };

    const handleDeployFlag = (flagId: string) => {
        setFlags(prev => prev.map(flag =>
            flag.id === flagId ? {
                ...flag,
                deployment: {
                    ...flag.deployment,
                    status: 'deployed',
                    deployed_at: new Date().toISOString(),
                    deployed_by: 'admin@enwhe.com'
                }
            } : flag
        ));
    };

    const handleRollbackFlag = (flagId: string) => {
        setFlags(prev => prev.map(flag =>
            flag.id === flagId ? {
                ...flag,
                deployment: {
                    ...flag.deployment,
                    status: 'rolled_back'
                }
            } : flag
        ));
    };

    return (
        <div className={className}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 mb-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Feature Flag Management</h2>
                    <p className="text-muted-foreground">
                        Manage feature flags, targeting rules, and deployment across environments
                    </p>
                </div>
                <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Flag
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search flags..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[140px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="enabled">Enabled</SelectItem>
                        <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={environmentFilter} onValueChange={setEnvironmentFilter}>
                    <SelectTrigger className="w-full sm:w-[140px]">
                        <SelectValue placeholder="Environment" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Environments</SelectItem>
                        <SelectItem value="development">Development</SelectItem>
                        <SelectItem value="staging">Staging</SelectItem>
                        <SelectItem value="production">Production</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Feature Flags List */}
            <div className="grid gap-4">
                {loading ? (
                    <div className="flex items-center justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : filteredFlags.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <Flag className="h-8 w-8 mx-auto mb-2" />
                        <p>No feature flags found</p>
                        <p className="text-sm">Create your first feature flag to get started</p>
                    </div>
                ) : (
                    filteredFlags.map((flag) => (
                        <Card key={flag.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-3 h-3 rounded-full ${getStatusColor(flag.deployment.status)}`} />
                                        <div>
                                            <h3 className="text-lg font-semibold">{flag.name}</h3>
                                            <p className="text-sm text-muted-foreground">
                                                {flag.key} • {flag.type}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            checked={flag.enabled}
                                            onCheckedChange={() => handleToggleFlag(flag.id)}
                                        />
                                        <Badge variant="outline">
                                            {flag.deployment.status}
                                        </Badge>
                                        <Badge variant="outline" className={getEnvironmentColor(flag.deployment.environment)}>
                                            {flag.deployment.environment}
                                        </Badge>
                                        <Button variant="ghost" size="sm">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground mb-4">
                                    {flag.description}
                                </p>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold">{flag.metrics.total_requests}</div>
                                        <div className="text-xs text-muted-foreground">Total Requests</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold">{flag.metrics.enabled_requests}</div>
                                        <div className="text-xs text-muted-foreground">Enabled Requests</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold">{flag.metrics.usage_percentage}%</div>
                                        <div className="text-xs text-muted-foreground">Usage</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold">{flag.targeting.rules.length}</div>
                                        <div className="text-xs text-muted-foreground">Targeting Rules</div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                    <div className="flex items-center space-x-4">
                                        <span>Default: {String(flag.default_value)}</span>
                                        <span>Updated: {formatDate(flag.updated_at)}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Button variant="outline" size="sm" onClick={() => setSelectedFlag(flag)}>
                                            <Eye className="h-4 w-4 mr-1" />
                                            View
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)}>
                                            <Edit className="h-4 w-4 mr-1" />
                                            Edit
                                        </Button>
                                        {flag.deployment.status === 'draft' && (
                                            <Button variant="outline" size="sm" onClick={() => handleDeployFlag(flag.id)}>
                                                <TrendingUp className="h-4 w-4 mr-1" />
                                                Deploy
                                            </Button>
                                        )}
                                        {flag.deployment.status === 'deployed' && (
                                            <Button variant="outline" size="sm" onClick={() => handleRollbackFlag(flag.id)}>
                                                <Undo className="h-4 w-4 mr-1" />
                                                Rollback
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Flags</CardTitle>
                        <Flag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{flags.length}</div>
                        <p className="text-xs text-muted-foreground">
                            {flags.filter(f => f.enabled).length} enabled
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Deployed</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {flags.filter(f => f.deployment.status === 'deployed').length}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            In production
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {flags.reduce((sum, f) => sum + f.metrics.total_requests, 0).toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Today
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Targeting Rules</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {flags.reduce((sum, f) => sum + f.targeting.rules.length, 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Active rules
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}