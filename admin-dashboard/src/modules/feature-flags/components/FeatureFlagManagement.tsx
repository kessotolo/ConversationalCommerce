'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Flag,
    Search,
    TrendingUp,
    Activity,
    Target
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface FeatureFlag {
    id: string;
    name: string;
    key: string;
    description: string;
    enabled: boolean;
    type: 'boolean' | 'string' | 'number' | 'json';
    default_value: string | number | boolean | Record<string, unknown>;
    targeting: {
        enabled: boolean;
        rules: Array<{
            id: string;
            type: 'tenant' | 'user' | 'percentage' | 'custom';
            condition: string;
            value: string | number | boolean | Record<string, unknown> | string[];
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
        details: Record<string, unknown>;
    }>;
    created_at: string;
    updated_at: string;
}

interface FeatureFlagManagementProps {
    className?: string;
}

export function FeatureFlagManagement({ className }: FeatureFlagManagementProps) {
    const [flags, setFlags] = useState<FeatureFlag[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [environmentFilter, setEnvironmentFilter] = useState('all');
    // Modal and selection state
    const [selectedFlag, setSelectedFlag] = useState<FeatureFlag | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAuditModal, setShowAuditModal] = useState(false);
    // Form state for create/edit
    const [flagForm, setFlagForm] = useState<Partial<FeatureFlag>>({});

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

    const handleToggleFlag = (flagId: string) => {
        setFlags(prev => prev.map(flag =>
            flag.id === flagId ? { ...flag, enabled: !flag.enabled } : flag
        ));
    };

    // Handlers for modals
    const openCreateModal = () => {
        setFlagForm({});
        setShowCreateModal(true);
    };
    const openEditModal = (flag: FeatureFlag) => {
        setSelectedFlag(flag);
        setFlagForm(flag);
        setShowEditModal(true);
    };
    const openAuditModal = (flag: FeatureFlag) => {
        setSelectedFlag(flag);
        setShowAuditModal(true);
    };
    const closeModals = () => {
        setShowCreateModal(false);
        setShowEditModal(false);
        setShowAuditModal(false);
        setSelectedFlag(null);
    };

    // Form submit handlers (mocked)
    const handleCreateFlag = () => {
        if (!flagForm.name || !flagForm.key) return;
        setFlags(prev => [
            {
                ...flagForm,
                id: (Math.random() * 100000).toFixed(0),
                enabled: !!flagForm.enabled,
                type: flagForm.type || 'boolean',
                targeting: { enabled: false, rules: [] },
                deployment: { environment: 'development', status: 'draft' },
                metrics: { total_requests: 0, enabled_requests: 0, usage_percentage: 0, last_accessed: 'Never' },
                audit_log: [],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            } as FeatureFlag,
            ...prev
        ]);
        closeModals();
    };
    const handleEditFlag = () => {
        if (!selectedFlag) return;
        setFlags(prev => prev.map(f => f.id === selectedFlag.id ? { ...selectedFlag, ...flagForm, updated_at: new Date().toISOString() } : f));
        closeModals();
    };

    return (
        <Card className={`max-w-5xl mx-auto mt-8 mb-12 shadow-lg border bg-background ${className || ''}`}>
            <CardHeader className="border-b pb-4 mb-4 bg-muted rounded-t-lg flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Feature Flags</CardTitle>
                    <CardDescription>Manage feature flags for tenants and environments</CardDescription>
                </div>
                <Button onClick={openCreateModal} variant="default">+ New Flag</Button>
            </CardHeader>
            <CardContent>
                {/* Filters */}
                <div className="flex flex-col md:flex-row md:items-center gap-2 p-4 bg-muted/50 rounded-lg mb-6 border">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search flags..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 bg-background border-muted"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full md:w-[140px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="enabled">Enabled</SelectItem>
                            <SelectItem value="disabled">Disabled</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={environmentFilter} onValueChange={setEnvironmentFilter}>
                        <SelectTrigger className="w-full md:w-[140px]">
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

                {/* Divider */}
                <div className="border-b mb-6" />

                {/* Feature Flags List */}
                <div className="overflow-x-auto mt-4">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr>
                                <th className="text-left p-2">Name</th>
                                <th className="text-left p-2">Key</th>
                                <th className="text-left p-2">Status</th>
                                <th className="text-left p-2">Environment</th>
                                <th className="text-left p-2">Enabled</th>
                                <th className="text-left p-2">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredFlags.map(flag => (
                                <tr key={flag.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => setSelectedFlag(flag)}>
                                    <td className="p-2 font-medium">{flag.name}</td>
                                    <td className="p-2">{flag.key}</td>
                                    <td className="p-2">
                                        <Badge className={getStatusColor(flag.deployment.status)}>{flag.deployment.status}</Badge>
                                    </td>
                                    <td className="p-2">
                                        <span className={getEnvironmentColor(flag.deployment.environment)}>{flag.deployment.environment}</span>
                                    </td>
                                    <td className="p-2">
                                        <Switch checked={flag.enabled} onCheckedChange={() => handleToggleFlag(flag.id)} />
                                    </td>
                                    <td className="p-2 flex gap-2">
                                        <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); openEditModal(flag); }}>Edit</Button>
                                        <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); openAuditModal(flag); }}>Audit</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
                    <Card className="bg-muted/60">
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
                    <Card className="bg-muted/60">
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
                    <Card className="bg-muted/60">
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
                    <Card className="bg-muted/60">
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
            </CardContent>

            {/* Create Modal */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Feature Flag</DialogTitle>
                        <p className="text-muted-foreground text-sm">Define a new feature flag for your platform.</p>
                    </DialogHeader>
                    <form className="space-y-4" onSubmit={e => { e.preventDefault(); handleCreateFlag(); }}>
                        <Input placeholder="Name" value={flagForm.name || ''} onChange={e => setFlagForm(f => ({ ...f, name: e.target.value }))} required />
                        <Input placeholder="Key" value={flagForm.key || ''} onChange={e => setFlagForm(f => ({ ...f, key: e.target.value }))} required />
                        <Input placeholder="Description" value={flagForm.description || ''} onChange={e => setFlagForm(f => ({ ...f, description: e.target.value }))} />
                        <Select value={flagForm.type || 'boolean'} onValueChange={value => setFlagForm(f => ({ ...f, type: value as FeatureFlag['type'] }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="boolean">Boolean</SelectItem>
                                <SelectItem value="string">String</SelectItem>
                                <SelectItem value="number">Number</SelectItem>
                                <SelectItem value="json">JSON</SelectItem>
                            </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2">
                            <Switch checked={!!flagForm.enabled} onCheckedChange={checked => setFlagForm(f => ({ ...f, enabled: checked }))} />
                            <span>Enabled</span>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={closeModals}>Cancel</Button>
                            <Button type="submit" variant="default">Create</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Feature Flag</DialogTitle>
                        <p className="text-muted-foreground text-sm">Edit the details of your feature flag.</p>
                    </DialogHeader>
                    <form className="space-y-4" onSubmit={e => { e.preventDefault(); handleEditFlag(); }}>
                        <Input placeholder="Name" value={flagForm.name || ''} onChange={e => setFlagForm(f => ({ ...f, name: e.target.value }))} required />
                        <Input placeholder="Key" value={flagForm.key || ''} onChange={e => setFlagForm(f => ({ ...f, key: e.target.value }))} required />
                        <Input placeholder="Description" value={flagForm.description || ''} onChange={e => setFlagForm(f => ({ ...f, description: e.target.value }))} />
                        <Select value={flagForm.type || 'boolean'} onValueChange={value => setFlagForm(f => ({ ...f, type: value as FeatureFlag['type'] }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="boolean">Boolean</SelectItem>
                                <SelectItem value="string">String</SelectItem>
                                <SelectItem value="number">Number</SelectItem>
                                <SelectItem value="json">JSON</SelectItem>
                            </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2">
                            <Switch checked={!!flagForm.enabled} onCheckedChange={checked => setFlagForm(f => ({ ...f, enabled: checked }))} />
                            <span>Enabled</span>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={closeModals}>Cancel</Button>
                            <Button type="submit" variant="default">Save</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Audit Modal */}
            <Dialog open={showAuditModal} onOpenChange={setShowAuditModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Audit Log</DialogTitle>
                        <p className="text-muted-foreground text-sm">View the audit log for this feature flag.</p>
                    </DialogHeader>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {selectedFlag?.audit_log?.length ? (
                            selectedFlag.audit_log.map(log => (
                                <div key={log.id} className="border rounded p-2">
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>{log.action}</span>
                                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                                    </div>
                                    <div className="text-sm font-medium">{log.user}</div>
                                    <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">{JSON.stringify(log.details, null, 2)}</pre>
                                </div>
                            ))
                        ) : (
                            <div className="text-muted-foreground text-sm">No audit log entries.</div>
                        )}
                    </div>
                    <div className="flex justify-end mt-4">
                        <Button variant="outline" onClick={closeModals}>Close</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    );
}