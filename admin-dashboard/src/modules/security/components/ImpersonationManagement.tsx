'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    User,
    Shield,
    AlertTriangle,
    CheckCircle,
    X,
    Clock,
    Eye,
    Trash2,
    RefreshCw,
    ArrowLeft,
    Save,
    Undo,
    Target,
    Filter,
    Search,
    Users,
    Building2,
    Activity,
    TrendingUp,
    AlertCircle,
    Lock,
    Unlock,
    History,
    Settings,
    Plus,
    Edit,
    MoreHorizontal
} from 'lucide-react';
import { Menu } from '@headlessui/react';

interface ImpersonationSession {
    id: string;
    admin_user: {
        id: string;
        email: string;
        name: string;
        role: string;
    };
    target_tenant: {
        id: string;
        name: string;
        subdomain: string;
        admin_email: string;
    };
    status: 'active' | 'expired' | 'terminated';
    started_at: string;
    expires_at: string;
    last_activity: string;
    ip_address: string;
    user_agent: string;
    reason: string;
    actions_performed: Array<{
        id: string;
        action: string;
        timestamp: string;
        details: Record<string, unknown>;
    }>;
}

interface ImpersonationManagementProps {
    className?: string;
}

export function ImpersonationManagement({ className }: ImpersonationManagementProps) {
    const [sessions, setSessions] = useState<ImpersonationSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedSession, setSelectedSession] = useState<ImpersonationSession | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showAuditModal, setShowAuditModal] = useState(false);
    const [impersonationEnabled, setImpersonationEnabled] = useState(true);

    // Mock data - replace with API call
    useEffect(() => {
        const mockSessions: ImpersonationSession[] = [
            {
                id: '1',
                admin_user: {
                    id: 'admin1',
                    email: 'admin@enwhe.com',
                    name: 'Super Admin',
                    role: 'super_admin'
                },
                target_tenant: {
                    id: 'tenant1',
                    name: 'TechCorp Store',
                    subdomain: 'techcorp',
                    admin_email: 'admin@techcorp.com'
                },
                status: 'active',
                started_at: '2024-01-20T10:00:00Z',
                expires_at: '2024-01-20T10:30:00Z',
                last_activity: '2024-01-20T10:25:00Z',
                ip_address: '192.168.1.100',
                user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
                reason: 'Customer support - order processing issue',
                actions_performed: [
                    {
                        id: 'action1',
                        action: 'viewed_orders',
                        timestamp: '2024-01-20T10:05:00Z',
                        details: { order_count: 15 }
                    },
                    {
                        id: 'action2',
                        action: 'updated_order_status',
                        timestamp: '2024-01-20T10:15:00Z',
                        details: { order_id: 'order123', new_status: 'processing' }
                    }
                ]
            },
            {
                id: '2',
                admin_user: {
                    id: 'admin2',
                    email: 'support@enwhe.com',
                    name: 'Support Agent',
                    role: 'support_admin'
                },
                target_tenant: {
                    id: 'tenant2',
                    name: 'Fashion Boutique',
                    subdomain: 'fashionboutique',
                    admin_email: 'admin@fashionboutique.com'
                },
                status: 'expired',
                started_at: '2024-01-19T14:00:00Z',
                expires_at: '2024-01-19T14:30:00Z',
                last_activity: '2024-01-19T14:28:00Z',
                ip_address: '192.168.1.101',
                user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                reason: 'Technical troubleshooting - payment integration',
                actions_performed: [
                    {
                        id: 'action3',
                        action: 'viewed_payment_settings',
                        timestamp: '2024-01-19T14:10:00Z',
                        details: { settings_accessed: true }
                    }
                ]
            }
        ];

        setSessions(mockSessions);
        setLoading(false);
    }, []);

    const filteredSessions = sessions.filter(session => {
        const matchesSearch = session.admin_user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            session.target_tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            session.reason.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-500';
            case 'expired':
                return 'bg-yellow-500';
            case 'terminated':
                return 'bg-red-500';
            default:
                return 'bg-gray-500';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'active':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'expired':
                return <Clock className="h-4 w-4 text-yellow-500" />;
            case 'terminated':
                return <X className="h-4 w-4 text-red-500" />;
            default:
                return <AlertCircle className="h-4 w-4 text-gray-500" />;
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    const getTimeRemaining = (expiresAt: string) => {
        const now = new Date();
        const expires = new Date(expiresAt);
        const diff = expires.getTime() - now.getTime();

        if (diff <= 0) return 'Expired';

        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(minutes / 60);

        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        return `${minutes}m`;
    };

    const fetchData = async () => {
        // Mock data refresh - in real implementation, this would call the API
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
        }, 1000);
    };

    const handleTerminateSession = (sessionId: string) => {
        if (window.confirm('Are you sure you want to terminate this session?')) {
            setSessions(prev => prev.map(session =>
                session.id === sessionId
                    ? { ...session, status: 'terminated' as const }
                    : session
            ));
        }
    };

    const handleExtendSession = (sessionId: string) => {
        const session = sessions.find(s => s.id === sessionId);
        if (session && session.status === 'active') {
            const newExpiresAt = new Date();
            newExpiresAt.setMinutes(newExpiresAt.getMinutes() + 30);

            setSessions(prev => prev.map(s =>
                s.id === sessionId
                    ? { ...s, expires_at: newExpiresAt.toISOString() }
                    : s
            ));
        }
    };

    // Add placeholder handlers
    const handleEditSession = (sessionId: string) => {
        alert('Edit session ' + sessionId);
    };
    const handleLockSession = (sessionId: string) => {
        setSessions(prev => prev.map(s =>
            s.id === sessionId ? { ...s, status: 'terminated' as const } : s
        ));
    };
    const handleUnlockSession = (sessionId: string) => {
        setSessions(prev => prev.map(s =>
            s.id === sessionId ? { ...s, status: 'active' as const } : s
        ));
    };
    const handleSessionSettings = (sessionId: string) => {
        alert('Open settings for session ' + sessionId);
    };
    const handleGoToTenant = (tenantId: string) => {
        alert('Go to tenant ' + tenantId);
    };
    const handleShowTenantInfo = (tenantId: string) => {
        alert('Show info for tenant ' + tenantId);
    };

    const activeSessions = sessions.filter(s => s.status === 'active').length;
    const totalSessions = sessions.length;

    return (
        <div className={className}>
            {/* Header and Create Button */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Impersonation Management</h2>
                    <div className="flex items-center space-x-4 mt-2">
                        <div className="flex items-center space-x-2">
                            <Switch
                                checked={impersonationEnabled}
                                onCheckedChange={setImpersonationEnabled}
                            />
                            <span className="text-sm">Enable Impersonation</span>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => fetchData()}>
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Refresh
                        </Button>
                    </div>
                </div>
                <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Session
                </Button>
            </div>

            {/* Create Impersonation Session Modal */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Create Impersonation Session</DialogTitle>
                    </DialogHeader>
                    <form
                        onSubmit={e => {
                            e.preventDefault();
                            // Mock create session
                            setShowCreateModal(false);
                        }}
                        className="space-y-4"
                    >
                        <div>
                            <label className="block text-sm font-medium mb-1">Target Tenant</label>
                            <Input placeholder="Enter tenant name or subdomain" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Reason</label>
                            <Textarea placeholder="Describe the reason for impersonation" required />
                        </div>
                        <div className="flex justify-end space-x-2">
                            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                                <Undo className="h-4 w-4 mr-1" /> Cancel
                            </Button>
                            <Button type="submit">
                                <Save className="h-4 w-4 mr-1" /> Create
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Security Alert */}
            {activeSessions > 0 && (
                <Alert className="mb-6">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        <strong>{activeSessions} active impersonation session(s)</strong> -
                        Monitor these sessions closely and terminate if suspicious activity is detected.
                    </AlertDescription>
                </Alert>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search sessions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Sessions</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                        <SelectItem value="terminated">Terminated</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Sessions List */}
            <div className="mt-6">
                {loading ? (
                    <div className="col-span-full text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="text-sm text-muted-foreground mt-2">Loading sessions...</p>
                    </div>
                ) : filteredSessions.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                        <Shield className="h-8 w-8 mx-auto mb-2" />
                        <p>No impersonation sessions found</p>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredSessions.map(session => (
                            <Card key={session.id} className="relative">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg flex items-center space-x-2">
                                            <span className={`w-3 h-3 rounded-full ${getStatusColor(session.status)}`}></span>
                                            <User className="h-5 w-5 text-muted-foreground" />
                                            <span>{session.admin_user.name}</span>
                                            <Badge variant="secondary" className="text-xs">
                                                {session.admin_user.role}
                                            </Badge>
                                        </CardTitle>
                                        <div className="flex items-center space-x-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedSession(session);
                                                    setShowDetailsModal(true);
                                                }}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            {session.status === 'active' && (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleExtendSession(session.id)}
                                                    >
                                                        <Clock className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleTerminateSession(session.id)}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            )}
                                            <Menu as="div" className="relative inline-block text-left">
                                                <Menu.Button as={Button} variant="ghost" size="sm">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Menu.Button>
                                                <Menu.Items className="z-10 bg-white border rounded shadow-lg">
                                                    <Menu.Item>
                                                        {({ active }: { active: boolean }) => (
                                                            <button
                                                                className={`flex items-center w-full px-2 py-1 ${active ? 'bg-gray-100' : ''}`}
                                                                onClick={() => handleEditSession(session.id)}
                                                            >
                                                                <Edit className="h-4 w-4 mr-2" /> Edit Session
                                                            </button>
                                                        )}
                                                    </Menu.Item>
                                                    <Menu.Item>
                                                        {({ active }: { active: boolean }) => (
                                                            <button
                                                                className={`flex items-center w-full px-2 py-1 ${active ? 'bg-gray-100' : ''}`}
                                                                onClick={() => session.status === 'active' ? handleLockSession(session.id) : handleUnlockSession(session.id)}
                                                            >
                                                                {session.status === 'active' ? (
                                                                    <Lock className="h-4 w-4 mr-2" />
                                                                ) : (
                                                                    <Unlock className="h-4 w-4 mr-2" />
                                                                )}
                                                                {session.status === 'active' ? 'Lock Session' : 'Unlock Session'}
                                                            </button>
                                                        )}
                                                    </Menu.Item>
                                                    <Menu.Item>
                                                        {({ active }: { active: boolean }) => (
                                                            <button
                                                                className={`flex items-center w-full px-2 py-1 ${active ? 'bg-gray-100' : ''}`}
                                                                onClick={() => handleSessionSettings(session.id)}
                                                            >
                                                                <Settings className="h-4 w-4 mr-2" /> Settings
                                                            </button>
                                                        )}
                                                    </Menu.Item>
                                                    <Menu.Item>
                                                        {({ active }: { active: boolean }) => (
                                                            <button
                                                                className={`flex items-center w-full px-2 py-1 ${active ? 'bg-gray-100' : ''}`}
                                                                onClick={() => handleGoToTenant(session.target_tenant.id)}
                                                            >
                                                                <Target className="h-4 w-4 mr-2" /> Go to Tenant
                                                            </button>
                                                        )}
                                                    </Menu.Item>
                                                    <Menu.Item>
                                                        {({ active }: { active: boolean }) => (
                                                            <button
                                                                className={`flex items-center w-full px-2 py-1 ${active ? 'bg-gray-100' : ''}`}
                                                                onClick={() => handleShowTenantInfo(session.target_tenant.id)}
                                                            >
                                                                <Building2 className="h-4 w-4 mr-2" /> Tenant Info
                                                            </button>
                                                        )}
                                                    </Menu.Item>
                                                </Menu.Items>
                                            </Menu>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2 mt-2">
                                        {getStatusIcon(session.status)}
                                        <span className="text-sm text-muted-foreground">
                                            {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                                            {session.status === 'active' && (
                                                <span className="ml-2">{getTimeRemaining(session.expires_at)}</span>
                                            )}
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <div className="text-sm">
                                        <span className="font-medium">Tenant:</span> {session.target_tenant.name}
                                    </div>
                                    <div className="text-sm">
                                        <span className="font-medium">Reason:</span> {session.reason}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        Started: {formatDate(session.started_at)}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Session Details Modal */}
            <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <div className="flex flex-row items-center justify-between">
                            <Button variant="ghost" size="icon" onClick={() => setShowDetailsModal(false)}>
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <DialogTitle>Session Details</DialogTitle>
                            <div />
                        </div>
                    </DialogHeader>
                    {selectedSession && (
                        <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                                {getStatusIcon(selectedSession.status)}
                                <span className="font-medium text-lg">
                                    {selectedSession.admin_user.name} impersonating {selectedSession.target_tenant.name}
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                    {selectedSession.status}
                                </Badge>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <div className="text-sm"><span className="font-medium">Admin Email:</span> {selectedSession.admin_user.email}</div>
                                    <div className="text-sm"><span className="font-medium">Role:</span> {selectedSession.admin_user.role}</div>
                                    <div className="text-sm"><span className="font-medium">Tenant Subdomain:</span> {selectedSession.target_tenant.subdomain}</div>
                                    <div className="text-sm"><span className="font-medium">Tenant Admin:</span> {selectedSession.target_tenant.admin_email}</div>
                                </div>
                                <div>
                                    <div className="text-sm"><span className="font-medium">Started:</span> {formatDate(selectedSession.started_at)}</div>
                                    <div className="text-sm"><span className="font-medium">Expires:</span> {formatDate(selectedSession.expires_at)}</div>
                                    <div className="text-sm"><span className="font-medium">Last Activity:</span> {formatDate(selectedSession.last_activity)}</div>
                                    <div className="text-sm"><span className="font-medium">IP Address:</span> {selectedSession.ip_address}</div>
                                </div>
                            </div>
                            <div>
                                <div className="font-medium mb-1">Reason</div>
                                <div className="bg-muted rounded p-2 text-sm">{selectedSession.reason}</div>
                            </div>
                            <div>
                                <div className="font-medium mb-1">Actions Performed</div>
                                <ul className="list-disc pl-5 text-sm">
                                    {selectedSession.actions_performed.map(action => (
                                        <li key={action.id}>
                                            <span className="font-medium">{action.action}</span> at {formatDate(action.timestamp)}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="flex justify-end space-x-2">
                                <Button
                                    variant="destructive"
                                    onClick={() => {
                                        // Mock terminate
                                        setShowDetailsModal(false);
                                    }}
                                >
                                    <Trash2 className="h-4 w-4 mr-1" /> Terminate Session
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setShowAuditModal(true);
                                    }}
                                >
                                    <History className="h-4 w-4 mr-1" /> View Audit
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Audit Modal */}
            <Dialog open={showAuditModal} onOpenChange={setShowAuditModal}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <div className="flex flex-row items-center justify-between">
                            <Button variant="ghost" size="icon" onClick={() => setShowAuditModal(false)}>
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <div className="flex items-center space-x-2">
                                <History className="h-5 w-5 text-muted-foreground" />
                                <DialogTitle>Session Audit Log</DialogTitle>
                            </div>
                            <div />
                        </div>
                    </DialogHeader>
                    {selectedSession ? (
                        <div className="space-y-4">
                            <div className="text-sm text-muted-foreground">
                                Actions performed by <span className="font-medium">{selectedSession.admin_user.name}</span> during impersonation of <span className="font-medium">{selectedSession.target_tenant.name}</span>.
                            </div>
                            <ul className="divide-y divide-muted">
                                {selectedSession.actions_performed.map(action => (
                                    <li key={action.id} className="py-3">
                                        <div className="flex items-center space-x-2">
                                            <span className="font-medium">{action.action}</span>
                                            <span className="text-xs text-muted-foreground">{formatDate(action.timestamp)}</span>
                                        </div>
                                        <pre className="bg-muted rounded p-2 text-xs mt-1 overflow-x-auto">{JSON.stringify(action.details, null, 2)}</pre>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground py-8">
                            No session selected.
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalSessions}</div>
                        <p className="text-xs text-muted-foreground">
                            {activeSessions} active
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeSessions}</div>
                        <p className="text-xs text-muted-foreground">
                            Currently active
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {sessions.reduce((sum, s) => sum + s.actions_performed.length, 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Performed today
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Security Status</CardTitle>
                        <Shield className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {impersonationEnabled ? 'Enabled' : 'Disabled'}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Impersonation system
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}