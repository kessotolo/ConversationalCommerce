'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    User,
    AlertTriangle,
    CheckCircle,
    X,
    Clock,
    Eye,
    RefreshCw,
    ArrowLeft,
    Save,
    Filter,
    Search,
    Users,
    Building2,
    Activity,
    TrendingUp,
    AlertCircle,
    History,
    Settings,
    Plus,
    Edit,
    ExternalLink
} from 'lucide-react';

interface Tenant {
    id: string;
    name: string;
    subdomain: string;
    custom_domain?: string;
    status: 'active' | 'inactive' | 'suspended';
    is_verified: boolean;
    admin_user_id: string;
    admin_user_name: string;
    admin_user_email: string;
    created_at: string;
    metrics: {
        total_users: number;
        total_orders: number;
        total_revenue: number;
        active_users: number;
        order_completion_rate: number;
        avg_order_value: number;
    };
}

interface ImpersonationSession {
    id: string;
    admin_user: {
        id: string;
        email: string;
        name: string;
        role: string;
    };
    target_tenant: Tenant;
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

interface TenantImpersonationProps {
    className?: string;
}

export function TenantImpersonation({ className }: TenantImpersonationProps) {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [sessions, setSessions] = useState<ImpersonationSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    const [showImpersonationModal, setShowImpersonationModal] = useState(false);
    const [impersonationReason, setImpersonationReason] = useState('');
    const [impersonationDuration, setImpersonationDuration] = useState('30');
    const [showTenantDetails, setShowTenantDetails] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    // Mock data - replace with API call
    useEffect(() => {
        const mockTenants: Tenant[] = [
            {
                id: '1',
                name: 'TechCorp Store',
                subdomain: 'techcorp',
                custom_domain: 'techcorp.com',
                status: 'active',
                is_verified: true,
                admin_user_id: 'user1',
                admin_user_name: 'John Smith',
                admin_user_email: 'admin@techcorp.com',
                created_at: '2024-01-15T10:30:00Z',
                metrics: {
                    total_users: 1250,
                    total_orders: 3420,
                    total_revenue: 125000,
                    active_users: 890,
                    order_completion_rate: 94.5,
                    avg_order_value: 36.5
                }
            },
            {
                id: '2',
                name: 'Fashion Boutique',
                subdomain: 'fashionboutique',
                custom_domain: 'fashionboutique.com',
                status: 'active',
                is_verified: true,
                admin_user_id: 'user2',
                admin_user_name: 'Sarah Johnson',
                admin_user_email: 'admin@fashionboutique.com',
                created_at: '2024-01-10T14:20:00Z',
                metrics: {
                    total_users: 890,
                    total_orders: 2150,
                    total_revenue: 89000,
                    active_users: 650,
                    order_completion_rate: 91.2,
                    avg_order_value: 41.3
                }
            },
            {
                id: '3',
                name: 'Local Market',
                subdomain: 'localmarket',
                status: 'active',
                is_verified: false,
                admin_user_id: 'user3',
                admin_user_name: 'Mike Wilson',
                admin_user_email: 'admin@localmarket.com',
                created_at: '2024-01-20T09:15:00Z',
                metrics: {
                    total_users: 450,
                    total_orders: 1200,
                    total_revenue: 45000,
                    active_users: 320,
                    order_completion_rate: 88.7,
                    avg_order_value: 37.5
                }
            }
        ];

        const mockSessions: ImpersonationSession[] = [
            {
                id: '1',
                admin_user: {
                    id: 'admin1',
                    email: 'admin@enwhe.com',
                    name: 'Super Admin',
                    role: 'super_admin'
                },
                target_tenant: mockTenants[0],
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
            }
        ];

        setTenants(mockTenants);
        setSessions(mockSessions);
        setLoading(false);
    }, []);

    const filteredTenants = tenants.filter(tenant => {
        const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tenant.subdomain.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tenant.admin_user_name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-500';
            case 'inactive':
                return 'bg-gray-500';
            case 'suspended':
                return 'bg-red-500';
            default:
                return 'bg-gray-500';
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    const handleStartImpersonation = (tenant: Tenant) => {
        setSelectedTenant(tenant);
        setShowImpersonationModal(true);
    };

    const handleConfirmImpersonation = () => {
        if (!selectedTenant || !impersonationReason) return;

        const newSession: ImpersonationSession = {
            id: Date.now().toString(),
            admin_user: {
                id: 'admin1',
                email: 'admin@enwhe.com',
                name: 'Super Admin',
                role: 'super_admin'
            },
            target_tenant: selectedTenant,
            status: 'active',
            started_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + parseInt(impersonationDuration) * 60 * 1000).toISOString(),
            last_activity: new Date().toISOString(),
            ip_address: '192.168.1.100',
            user_agent: navigator.userAgent,
            reason: impersonationReason,
            actions_performed: []
        };

        setSessions(prev => [newSession, ...prev]);
        setShowImpersonationModal(false);
        setImpersonationReason('');
        setSelectedTenant(null);

        // In a real implementation, this would redirect to the tenant's admin panel
        // with impersonation context
        window.open(`https://${selectedTenant.subdomain}.enwhe.com/admin?impersonation=true`, '_blank');
    };

    const handleTerminateSession = (sessionId: string) => {
        setSessions(prev => prev.map(session =>
            session.id === sessionId ? { ...session, status: 'terminated' } : session
        ));
    };

    const activeSessions = sessions.filter(s => s.status === 'active').length;

    const handleViewTenantDetails = (tenant: Tenant) => {
        setSelectedTenant(tenant);
        setShowTenantDetails(true);
    };

    const handleEditTenant = (tenant: Tenant) => {
        // Mock edit functionality
        alert(`Edit tenant: ${tenant.name}`);
    };

    const handleRefreshTenant = (tenant: Tenant) => {
        // Mock refresh functionality
        alert(`Refresh tenant: ${tenant.name}`);
    };

    const handleLockTenant = (tenant: Tenant) => {
        // Mock lock functionality
        alert(`Lock tenant: ${tenant.name}`);
    };

    const handleUnlockTenant = (tenant: Tenant) => {
        // Mock unlock functionality
        alert(`Unlock tenant: ${tenant.name}`);
    };

    const handleViewHistory = (tenant: Tenant) => {
        // Mock history functionality
        alert(`View history for: ${tenant.name}`);
    };

    const handleGoToTenant = (tenant: Tenant) => {
        window.open(`https://${tenant.subdomain}.enwhe.com`, '_blank');
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'active':
                return <CheckCircle className="h-4 w-4 text-green-600" />;
            case 'inactive':
                return <X className="h-4 w-4 text-red-600" />;
            case 'suspended':
                return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
            default:
                return <AlertCircle className="h-4 w-4 text-gray-600" />;
        }
    };

    return (
        <Card className={`max-w-6xl mx-auto mt-8 mb-12 shadow-lg border bg-background ${className || ''}`}>
            <CardHeader className="border-b pb-4 mb-4 bg-muted rounded-t-lg">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                        <CardTitle className="text-2xl font-bold flex items-center gap-2">
                            <User className="h-6 w-6 text-primary" />
                            <Building2 className="h-5 w-5 text-muted-foreground" />
                            Tenant Impersonation
                        </CardTitle>
                        <p className="text-muted-foreground text-sm mt-1">
                            Impersonate tenants for customer support and troubleshooting
                        </p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-orange-600">
                            {activeSessions} Active Sessions
                        </Badge>
                        <Button variant="outline" size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            New Session
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
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
                <div className="flex flex-col md:flex-row md:items-center gap-2 p-4 bg-muted/50 rounded-lg mb-6 border">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search tenants..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 bg-background border-muted"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full md:w-[140px]">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Divider */}
                <div className="border-b mb-6" />

                {/* Tenants List */}
                <div className="grid gap-6">
                    {loading ? (
                        <div className="flex items-center justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : filteredTenants.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Building2 className="h-8 w-8 mx-auto mb-2" />
                            <p>No tenants found</p>
                            <p className="text-sm">No tenants match your search criteria</p>
                        </div>
                    ) : (
                        filteredTenants.map((tenant) => (
                            <Card key={tenant.id} className="hover:shadow-md border border-muted transition-shadow bg-background/90">
                                <CardHeader className="pb-3 border-b bg-muted/40 rounded-t">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className={`w-3 h-3 rounded-full ${getStatusColor(tenant.status)}`} />
                                            <div>
                                                <h3 className="text-lg font-semibold">{tenant.name}</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    {tenant.subdomain}.enwhe.com
                                                    {tenant.custom_domain && ` • ${tenant.custom_domain}`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Badge variant={tenant.is_verified ? 'default' : 'secondary'}>
                                                {tenant.is_verified ? 'Verified' : 'Unverified'}
                                            </Badge>
                                            <div className="flex items-center space-x-1">
                                                {getStatusIcon(tenant.status)}
                                                <Badge variant="outline">
                                                    {tenant.status}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold">{tenant.metrics.total_users}</div>
                                            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                                                <Users className="h-3 w-3" />
                                                Total Users
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold">{tenant.metrics.total_orders}</div>
                                            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                                                <Activity className="h-3 w-3" />
                                                Total Orders
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold">${tenant.metrics.total_revenue.toLocaleString()}</div>
                                            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                                                <TrendingUp className="h-3 w-3" />
                                                Total Revenue
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold">{tenant.metrics.order_completion_rate}%</div>
                                            <div className="text-xs text-muted-foreground">Completion Rate</div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between text-sm text-muted-foreground gap-2">
                                        <div className="flex items-center space-x-4">
                                            <span>Admin: {tenant.admin_user_name}</span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                Created: {formatDate(tenant.created_at).split(',')[0]}
                                            </span>
                                        </div>
                                        <div className="flex items-center space-x-2 mt-2 md:mt-0">
                                            <Button variant="outline" size="sm" onClick={() => handleViewTenantDetails(tenant)}>
                                                <Eye className="h-4 w-4 mr-1" />
                                                View
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => handleEditTenant(tenant)}>
                                                <Edit className="h-4 w-4 mr-1" />
                                                Edit
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => handleRefreshTenant(tenant)}>
                                                <RefreshCw className="h-4 w-4 mr-1" />
                                                Refresh
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => handleViewHistory(tenant)}>
                                                <History className="h-4 w-4 mr-1" />
                                                History
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
                                                <Settings className="h-4 w-4 mr-1" />
                                                Settings
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => handleGoToTenant(tenant)}>
                                                <ExternalLink className="h-4 w-4 mr-1" />
                                                Visit
                                            </Button>
                                            {tenant.status === 'active' ? (
                                                <Button variant="outline" size="sm" onClick={() => handleLockTenant(tenant)}>
                                                    <AlertTriangle className="h-4 w-4 mr-1" />
                                                    Lock
                                                </Button>
                                            ) : (
                                                <Button variant="outline" size="sm" onClick={() => handleUnlockTenant(tenant)}>
                                                    <CheckCircle className="h-4 w-4 mr-1" />
                                                    Unlock
                                                </Button>
                                            )}
                                            <Button variant="outline" size="sm" onClick={() => handleStartImpersonation(tenant)}>
                                                <User className="h-4 w-4 mr-1" />
                                                Impersonate
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>

                {/* Active Sessions */}
                {sessions.filter(s => s.status === 'active').length > 0 && (
                    <>
                        <div className="border-b my-6" />
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold mb-4">Active Impersonation Sessions</h3>
                        </div>
                        <div className="grid gap-4">
                            {sessions.filter(s => s.status === 'active').map((session) => (
                                <Card key={session.id} className="border-orange-200 bg-orange-50">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-3 h-3 rounded-full bg-orange-500" />
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
                                                <Badge variant="outline" className="text-orange-600">
                                                    Active
                                                </Badge>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleTerminateSession(session.id)}
                                                >
                                                    <X className="h-4 w-4 mr-1" />
                                                    Terminate
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            <strong>Reason:</strong> {session.reason}
                                        </p>
                                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                                            <div className="flex items-center space-x-4">
                                                <span>Started: {formatDate(session.started_at)}</span>
                                                <span>Actions: {session.actions_performed.length}</span>
                                            </div>
                                            <Button variant="outline" size="sm">
                                                <ExternalLink className="h-4 w-4 mr-1" />
                                                Continue Session
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </>
                )}
            </CardContent>

            {/* Impersonation Modal */}
            <Dialog open={showImpersonationModal} onOpenChange={setShowImpersonationModal}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Start Impersonation Session</DialogTitle>
                    </DialogHeader>
                    {selectedTenant && (
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-muted-foreground mb-2">
                                    You are about to impersonate <strong>{selectedTenant.name}</strong>
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Reason for Impersonation</label>
                                <Textarea
                                    value={impersonationReason}
                                    onChange={(e) => setImpersonationReason(e.target.value)}
                                    placeholder="Describe why you need to impersonate this tenant..."
                                    rows={3}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Session Duration (minutes)</label>
                                <Select value={impersonationDuration} onValueChange={setImpersonationDuration}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="15">15 minutes</SelectItem>
                                        <SelectItem value="30">30 minutes</SelectItem>
                                        <SelectItem value="60">1 hour</SelectItem>
                                        <SelectItem value="120">2 hours</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex justify-end space-x-2">
                                <Button variant="outline" onClick={() => setShowImpersonationModal(false)}>
                                    <ArrowLeft className="h-4 w-4 mr-1" />
                                    Cancel
                                </Button>
                                <Button onClick={handleConfirmImpersonation}>
                                    <Save className="h-4 w-4 mr-1" />
                                    Start Session
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Tenant Details Modal */}
            <Dialog open={showTenantDetails} onOpenChange={setShowTenantDetails}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            <div className="flex items-center gap-2">
                                <Building2 className="h-5 w-5" />
                                Tenant Details
                            </div>
                        </DialogTitle>
                    </DialogHeader>
                    {selectedTenant && (
                        <div className="space-y-4">
                            <p>Detailed tenant information would be displayed here.</p>
                            <div className="flex justify-end space-x-2">
                                <Button variant="outline" onClick={() => setShowTenantDetails(false)}>
                                    <ArrowLeft className="h-4 w-4 mr-1" />
                                    Close
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Settings Modal */}
            <Dialog open={showSettings} onOpenChange={setShowSettings}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            <div className="flex items-center gap-2">
                                <Settings className="h-5 w-5" />
                                Tenant Settings
                            </div>
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p>Tenant configuration settings would be displayed here.</p>
                        <div className="flex justify-end space-x-2">
                            <Button variant="outline" onClick={() => setShowSettings(false)}>
                                <ArrowLeft className="h-4 w-4 mr-1" />
                                Close
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    );
}