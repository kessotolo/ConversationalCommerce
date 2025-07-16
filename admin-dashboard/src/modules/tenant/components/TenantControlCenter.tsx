'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminApiService } from '@/lib/adminApiService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Building2,
    Users,
    ShoppingCart,
    TrendingUp,
    CheckCircle,
    Eye,
    Edit,
    Trash2,
    Pause,
    Play,
    Plus,
    Search,
    Filter,
    Activity,
    Shield,
    DollarSign,
    MoreHorizontal
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface Tenant {
    id: string;
    name: string;
    subdomain: string;
    custom_domain?: string;
    status: 'active' | 'suspended' | 'pending' | 'deleted';
    is_verified: boolean;
    created_at: string;
    admin_user_id: string;
    admin_user_name: string;
    metrics: {
        total_users: number;
        total_orders: number;
        total_revenue: number;
        active_users: number;
        order_completion_rate: number;
        avg_order_value: number;
    };
    health: {
        status: 'healthy' | 'warning' | 'critical';
        uptime_percentage: number;
        last_activity: string;
        error_rate: number;
    };
}

interface TenantControlCenterProps {
    className?: string;
}

export function TenantControlCenter({ className }: TenantControlCenterProps) {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'status' | 'total_users'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // Fetch tenants from real API
    useEffect(() => {
        const fetchTenants = async () => {
            try {
                setLoading(true);
                const data = await adminApiService.getTenants({
                    status: statusFilter !== 'all' ? statusFilter : undefined,
                    search: searchTerm || undefined,
                    limit: 100
                });
                setTenants(data);
            } catch (error) {
                console.error('Error fetching tenants:', error);
                // Keep existing mock data as fallback for development
                const mockTenants: Tenant[] = [
                    {
                        id: '1',
                        name: 'TechCorp',
                        subdomain: 'techcorp',
                        custom_domain: 'techcorp.com',
                        status: 'active',
                        is_verified: true,
                        created_at: '2024-01-15T10:30:00Z',
                        admin_user_id: 'user1',
                        admin_user_name: 'John Smith',
                        metrics: {
                            total_users: 1250,
                            total_orders: 3420,
                            total_revenue: 125000,
                            active_users: 890,
                            order_completion_rate: 94.5,
                            avg_order_value: 36.5
                        },
                        health: {
                            status: 'healthy',
                            uptime_percentage: 99.8,
                            last_activity: '2024-01-20T14:30:00Z',
                            error_rate: 0.2
                        }
                    },
                    {
                        id: '2',
                        name: 'FashionStore',
                        subdomain: 'fashionstore',
                        status: 'active',
                        is_verified: true,
                        created_at: '2024-01-10T09:15:00Z',
                        admin_user_id: 'user2',
                        admin_user_name: 'Sarah Johnson',
                        metrics: {
                            total_users: 890,
                            total_orders: 1560,
                            total_revenue: 89000,
                            active_users: 450,
                            order_completion_rate: 91.2,
                            avg_order_value: 57.1
                        },
                        health: {
                            status: 'warning',
                            uptime_percentage: 98.5,
                            last_activity: '2024-01-20T12:45:00Z',
                            error_rate: 1.5
                        }
                    },
                    {
                        id: '3',
                        name: 'FoodMart',
                        subdomain: 'foodmart',
                        status: 'suspended',
                        is_verified: false,
                        created_at: '2024-01-05T16:20:00Z',
                        admin_user_id: 'user3',
                        admin_user_name: 'Mike Wilson',
                        metrics: {
                            total_users: 320,
                            total_orders: 450,
                            total_revenue: 18000,
                            active_users: 120,
                            order_completion_rate: 88.9,
                            avg_order_value: 40.0
                        },
                        health: {
                            status: 'critical',
                            uptime_percentage: 95.2,
                            last_activity: '2024-01-19T08:15:00Z',
                            error_rate: 4.8
                        }
                    }
                ];

                setTenants(mockTenants);
            } finally {
                setLoading(false);
            }
        };

        fetchTenants();
    }, [statusFilter, searchTerm]);

    const filteredTenants = tenants.filter(tenant => {
        const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tenant.subdomain.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tenant.admin_user_name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const sortedTenants = [...filteredTenants].sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (sortBy) {
            case 'name':
                aValue = a.name;
                bValue = b.name;
                break;
            case 'created_at':
                aValue = new Date(a.created_at).getTime();
                bValue = new Date(b.created_at).getTime();
                break;
            case 'status':
                aValue = a.status;
                bValue = b.status;
                break;
            case 'total_users':
                aValue = a.metrics.total_users;
                bValue = b.metrics.total_users;
                break;
            default:
                aValue = a.name;
                bValue = b.name;
        }

        if (sortOrder === 'asc') {
            return aValue > bValue ? 1 : -1;
        } else {
            return aValue < bValue ? 1 : -1;
        }
    });

    const handleCreateTenant = (tenantData: Partial<Tenant>) => {
        // Mock create tenant
        const newTenant: Tenant = {
            id: Date.now().toString(),
            name: tenantData.name || '',
            subdomain: tenantData.subdomain || '',
            status: 'pending',
            is_verified: false,
            created_at: new Date().toISOString(),
            admin_user_id: '',
            admin_user_name: '',
            metrics: {
                total_users: 0,
                total_orders: 0,
                total_revenue: 0,
                active_users: 0,
                order_completion_rate: 0,
                avg_order_value: 0
            },
            health: {
                status: 'healthy',
                uptime_percentage: 100,
                last_activity: new Date().toISOString(),
                error_rate: 0
            }
        };
        setTenants(prev => [...prev, newTenant]);
        setShowCreateModal(false);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-500';
            case 'suspended':
                return 'bg-yellow-500';
            case 'pending':
                return 'bg-blue-500';
            case 'deleted':
                return 'bg-red-500';
            default:
                return 'bg-gray-500';
        }
    };

    const getHealthColor = (status: string) => {
        switch (status) {
            case 'healthy':
                return 'text-green-600';
            case 'warning':
                return 'text-yellow-600';
            case 'critical':
                return 'text-red-600';
            default:
                return 'text-gray-600';
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    // Use setSortBy to avoid unused variable warning
    const updateSortBy = (newSortBy: 'name' | 'created_at' | 'status' | 'total_users') => {
        setSortBy(newSortBy);
    };

    return (
        <div className={className}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Tenant Control Center</h2>
                    <p className="text-muted-foreground">
                        Manage and monitor all tenant accounts
                    </p>
                </div>
                <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Tenant
                </Button>
            </div>

            {/* Create Tenant Modal */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Create New Tenant</DialogTitle>
                    </DialogHeader>
                    <form
                        onSubmit={e => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            handleCreateTenant({
                                name: formData.get('name') as string,
                                subdomain: formData.get('subdomain') as string
                            });
                        }}
                        className="space-y-4"
                    >
                        <div>
                            <Label htmlFor="name">Tenant Name</Label>
                            <Input id="name" name="name" required />
                        </div>
                        <div>
                            <Label htmlFor="subdomain">Subdomain</Label>
                            <Input id="subdomain" name="subdomain" required />
                        </div>
                        <div className="flex justify-end space-x-2">
                            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                                Cancel
                            </Button>
                            <Button type="submit">
                                <Plus className="h-4 w-4 mr-1" /> Create
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Tabbed Interface */}
            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview" className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Overview
                    </TabsTrigger>
                    <TabsTrigger value="analytics" className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Analytics
                    </TabsTrigger>
                    <TabsTrigger value="health" className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Health
                    </TabsTrigger>
                    <TabsTrigger value="actions" className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Actions
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    {/* Filters and Search */}
                    <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search tenants..."
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
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="suspended">Suspended</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Sort Controls */}
                    <div className="flex items-center gap-2 mb-4">
                        <Select value={sortBy} onValueChange={(value) => updateSortBy(value as 'name' | 'created_at' | 'status' | 'total_users')}>
                            <SelectTrigger className="w-32">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="name">Name</SelectItem>
                                <SelectItem value="created_at">Created</SelectItem>
                                <SelectItem value="status">Status</SelectItem>
                                <SelectItem value="total_users">Users</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
                            {sortOrder === 'asc' ? '↑' : '↓'} {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                        </Button>
                    </div>

                    {/* Tenant Cards */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {loading ? (
                            <div className="col-span-full text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                                <p className="text-sm text-muted-foreground mt-2">Loading tenants...</p>
                            </div>
                        ) : sortedTenants.length === 0 ? (
                            <div className="col-span-full text-center py-8 text-muted-foreground">
                                <Building2 className="h-8 w-8 mx-auto mb-2" />
                                <p>No tenants found</p>
                            </div>
                        ) : (
                            sortedTenants.map((tenant) => (
                                <Card key={tenant.id} className="relative">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                <CardTitle className="text-lg">{tenant.name}</CardTitle>
                                                <Badge variant={tenant.is_verified ? 'default' : 'secondary'}>
                                                    {tenant.is_verified ? 'Verified' : 'Unverified'}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <Button variant="outline" size="sm" onClick={() => { }}>
                                                    <Eye className="h-4 w-4 mr-1" />
                                                    View
                                                </Button>
                                                <Button variant="ghost" size="sm">
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className={`w-3 h-3 rounded-full ${getStatusColor(tenant.status)}`}></span>
                                            <span className="text-sm text-muted-foreground">
                                                {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
                                            </span>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="text-sm">
                                            <span className="font-medium">Subdomain:</span> {tenant.subdomain}
                                            {tenant.custom_domain && (
                                                <div className="text-xs text-muted-foreground">
                                                    Custom: {tenant.custom_domain}
                                                </div>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <div className="font-medium">{tenant.metrics.total_users}</div>
                                                <div className="text-xs text-muted-foreground">Users</div>
                                            </div>
                                            <div>
                                                <div className="font-medium">{formatCurrency(tenant.metrics.total_revenue)}</div>
                                                <div className="text-xs text-muted-foreground">Revenue</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>Created {formatDate(tenant.created_at)}</span>
                                            <span>Admin: {tenant.admin_user_name}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="analytics" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5" />
                                Analytics Overview
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="text-center p-4 border rounded">
                                    <DollarSign className="h-8 w-8 mx-auto mb-2 text-green-600" />
                                    <div className="text-2xl font-bold">{formatCurrency(tenants.reduce((sum, t) => sum + t.metrics.total_revenue, 0))}</div>
                                    <div className="text-sm text-muted-foreground">Total Revenue</div>
                                </div>
                                <div className="text-center p-4 border rounded">
                                    <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                                    <div className="text-2xl font-bold">{tenants.reduce((sum, t) => sum + t.metrics.total_users, 0)}</div>
                                    <div className="text-sm text-muted-foreground">Total Users</div>
                                </div>
                                <div className="text-center p-4 border rounded">
                                    <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                                    <div className="text-2xl font-bold">{tenants.reduce((sum, t) => sum + t.metrics.total_orders, 0)}</div>
                                    <div className="text-sm text-muted-foreground">Total Orders</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="health" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                System Health
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {tenants.map(tenant => (
                                    <div key={tenant.id} className="flex items-center justify-between p-3 border rounded">
                                        <div className="flex items-center space-x-3">
                                            <span className={`w-3 h-3 rounded-full ${getHealthColor(tenant.health.status)}`}></span>
                                            <span className="font-medium">{tenant.name}</span>
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {tenant.health.uptime_percentage}% uptime
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="actions" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="h-5 w-5" />
                                Bulk Actions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Button variant="outline" className="flex flex-col items-center p-4 h-auto">
                                    <Play className="h-6 w-6 mb-2" />
                                    <span className="text-sm">Activate All</span>
                                </Button>
                                <Button variant="outline" className="flex flex-col items-center p-4 h-auto">
                                    <Pause className="h-6 w-6 mb-2" />
                                    <span className="text-sm">Suspend All</span>
                                </Button>
                                <Button variant="outline" className="flex flex-col items-center p-4 h-auto">
                                    <CheckCircle className="h-6 w-6 mb-2" />
                                    <span className="text-sm">Verify All</span>
                                </Button>
                                <Button variant="outline" className="flex flex-col items-center p-4 h-auto">
                                    <Trash2 className="h-6 w-6 mb-2" />
                                    <span className="text-sm">Delete All</span>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}