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
    MoreHorizontal,
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
        details: Record<string, any>;
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

    return (
        <Card className={`max-w-6xl mx-auto mt-8 mb-12 shadow-lg border bg-background ${className || ''}`}>
            <CardHeader className="border-b pb-4 mb-4 bg-muted rounded-t-lg">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                        <CardTitle className="text-2xl font-bold flex items-center gap-2">
                            <User className="h-6 w-6 text-primary" /> Tenant Impersonation
                        </CardTitle>
                        <p className="text-muted-foreground text-sm mt-1">
                            Impersonate tenants for customer support and troubleshooting
                        </p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-orange-600">
                            {activeSessions} Active Sessions
                        </Badge>
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
                                            <Badge variant="outline">
                                                {tenant.status}
                                            </Badge>
                                            <Button variant="ghost" size="sm">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold">{tenant.metrics.total_users}</div>
                                            <div className="text-xs text-muted-foreground">Total Users</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold">{tenant.metrics.total_orders}</div>
                                            <div className="text-xs text-muted-foreground">Total Orders</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold">${tenant.metrics.total_revenue.toLocaleString()}</div>
                                            <div className="text-xs text-muted-foreground">Total Revenue</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold">{tenant.metrics.order_completion_rate}%</div>
                                            <div className="text-xs text-muted-foreground">Completion Rate</div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between text-sm text-muted-foreground gap-2">
                                        <div className="flex items-center space-x-4">
                                            <span>Admin: {tenant.admin_user_name}</span>
                                            <span>Created: {formatDate(tenant.created_at).split(',')[0]}</span>
                                        </div>
                                        <div className="flex items-center space-x-2 mt-2 md:mt-0">
                                            <Button variant="outline" size="sm">
                                                <Eye className="h-4 w-4 mr-1" />
                                                View Details
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleStartImpersonation(tenant)}
                                            >
                                                <User className="h-4 w-4 mr-1" />
                                                Impersonate
                                            </Button>
                                            <Button variant="outline" size="sm">
                                                <ExternalLink className="h-4 w-4 mr-1" />
                                                Visit Store
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
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Start Impersonation Session</DialogTitle>
                    </DialogHeader>
                    {selectedTenant && (
                        <div className="space-y-4">
                            <div className="p-4 bg-muted rounded-lg">
                                <h4 className="font-semibold">{selectedTenant.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                    {selectedTenant.subdomain}.enwhe.com
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Admin: {selectedTenant.admin_user_name}
                                </p>
                            </div>

                            <div>
                                <label className="text-sm font-medium">Reason for impersonation</label>
                                <Textarea
                                    placeholder="Enter the reason for impersonating this tenant..."
                                    value={impersonationReason}
                                    onChange={(e) => setImpersonationReason(e.target.value)}
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium">Session duration (minutes)</label>
                                <Select value={impersonationDuration} onValueChange={setImpersonationDuration}>
                                    <SelectTrigger className="mt-1">
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

                            <div className="flex space-x-2 pt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowImpersonationModal(false)}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleConfirmImpersonation}
                                    disabled={!impersonationReason}
                                    className="flex-1"
                                >
                                    Start Session
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </Card>
    );
}