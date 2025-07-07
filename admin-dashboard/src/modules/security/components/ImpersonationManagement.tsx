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
        details: Record<string, any>;
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
        return `${minutes}m remaining`;
    };

    const handleTerminateSession = (sessionId: string) => {
        setSessions(prev => prev.map(session =>
            session.id === sessionId ? { ...session, status: 'terminated' } : session
        ));
    };

    const handleExtendSession = (sessionId: string) => {
        setSessions(prev => prev.map(session => {
            if (session.id === sessionId) {
                const newExpiresAt = new Date();
                newExpiresAt.setMinutes(newExpiresAt.getMinutes() + 30);
                return {
                    ...session,
                    expires_at: newExpiresAt.toISOString(),
                    status: 'active'
                };
            }
            return session;
        }));
    };

    const activeSessions = sessions.filter(s => s.status === 'active').length;
    const totalSessions = sessions.length;

    return (
        <div className={className}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 mb-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Impersonation Management</h2>
                    <p className="text-muted-foreground">
                        Monitor and manage active impersonation sessions for customer support
                    </p>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <Switch
                            checked={impersonationEnabled}
                            onCheckedChange={setImpersonationEnabled}
                        />
                        <span className="text-sm">Enable Impersonation</span>
                    </div>
                    <Button onClick={() => setShowCreateModal(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Start Session
                    </Button>
                </div>
            </div>

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
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mb-6">
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
                    <SelectTrigger className="w-full sm:w-[140px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                        <SelectItem value="terminated">Terminated</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Sessions List */}
            <div className="grid gap-4">
                {loading ? (
                    <div className="flex items-center justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : filteredSessions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <User className="h-8 w-8 mx-auto mb-2" />
                        <p>No impersonation sessions found</p>
                        <p className="text-sm">Start a session to provide customer support</p>
                    </div>
                ) : (
                    filteredSessions.map((session) => (
                        <Card key={session.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-3 h-3 rounded-full ${getStatusColor(session.status)}`} />
                                        <div>
                                            <h3 className="text-lg font-semibold">
                                                {session.admin_user.name} → {session.target_tenant.name}
                                            </h3>
                                            <p className="text-sm text-muted-foreground">
                                                {session.admin_user.email} • {session.target_tenant.subdomain}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {getStatusIcon(session.status)}
                                        <Badge variant="outline">
                                            {session.status}
                                        </Badge>
                                        {session.status === 'active' && (
                                            <Badge variant="outline" className="text-orange-600">
                                                {getTimeRemaining(session.expires_at)}
                                            </Badge>
                                        )}
                                        <Button variant="ghost" size="sm">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground mb-4">
                                    <strong>Reason:</strong> {session.reason}
                                </p>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold">{session.actions_performed.length}</div>
                                        <div className="text-xs text-muted-foreground">Actions</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-sm font-medium">{session.ip_address}</div>
                                        <div className="text-xs text-muted-foreground">IP Address</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-sm font-medium">
                                            {formatDate(session.started_at).split(',')[0]}
                                        </div>
                                        <div className="text-xs text-muted-foreground">Started</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-sm font-medium">
                                            {formatDate(session.last_activity).split(',')[0]}
                                        </div>
                                        <div className="text-xs text-muted-foreground">Last Activity</div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                    <div className="flex items-center space-x-4">
                                        <span>Role: {session.admin_user.role}</span>
                                        <span>Target: {session.target_tenant.admin_email}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Button variant="outline" size="sm" onClick={() => setSelectedSession(session)}>
                                            <Eye className="h-4 w-4 mr-1" />
                                            Details
                                        </Button>
                                        {session.status === 'active' && (
                                            <>
                                                <Button variant="outline" size="sm" onClick={() => handleExtendSession(session.id)}>
                                                    <Clock className="h-4 w-4 mr-1" />
                                                    Extend
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => handleTerminateSession(session.id)}>
                                                    <X className="h-4 w-4 mr-1" />
                                                    Terminate
                                                </Button>
                                            </>
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