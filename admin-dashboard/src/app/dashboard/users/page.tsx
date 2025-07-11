'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Search,
    Plus,
    Eye,
    Edit,
    Trash2,
    UserCheck,
    UserX,
    Activity,
    Calendar,
    Building2
} from 'lucide-react';
import api from '@/lib/api';

interface User {
    id: string;
    email: string;
    name: string;
    phone?: string;
    status: 'active' | 'inactive' | 'suspended';
    role: string;
    tenant_id?: string;
    tenant_name?: string;
    created_at: string;
    last_login?: string;
    metrics: {
        total_orders: number;
        total_spent: number;
        avg_order_value: number;
        last_order_date?: string;
    };
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [roleFilter, setRoleFilter] = useState('all');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/admin/users');
            setUsers(response.data);
        } catch (error) {
            console.error('Error fetching users:', error);
            // Fallback to mock data for development
            setUsers([
                {
                    id: '1',
                    email: 'john.doe@techcorp.com',
                    name: 'John Doe',
                    phone: '+254700123456',
                    status: 'active',
                    role: 'admin',
                    tenant_id: '1',
                    tenant_name: 'TechCorp Store',
                    created_at: '2024-01-15T10:30:00Z',
                    last_login: '2024-01-20T14:30:00Z',
                    metrics: {
                        total_orders: 45,
                        total_spent: 1800,
                        avg_order_value: 40,
                        last_order_date: '2024-01-19T16:45:00Z'
                    }
                },
                {
                    id: '2',
                    email: 'sarah.johnson@fashionboutique.com',
                    name: 'Sarah Johnson',
                    phone: '+254700789012',
                    status: 'active',
                    role: 'admin',
                    tenant_id: '2',
                    tenant_name: 'Fashion Boutique',
                    created_at: '2024-01-10T14:20:00Z',
                    last_login: '2024-01-20T12:15:00Z',
                    metrics: {
                        total_orders: 32,
                        total_spent: 1250,
                        avg_order_value: 39,
                        last_order_date: '2024-01-18T11:20:00Z'
                    }
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

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

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'admin':
                return 'bg-purple-500';
            case 'user':
                return 'bg-blue-500';
            case 'moderator':
                return 'bg-orange-500';
            default:
                return 'bg-gray-500';
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.phone && user.phone.includes(searchTerm));
        const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        return matchesSearch && matchesStatus && matchesRole;
    });

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid gap-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Card key={i}>
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-2">
                                        <Skeleton className="h-6 w-48" />
                                        <Skeleton className="h-4 w-32" />
                                    </div>
                                    <Skeleton className="h-8 w-24" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                    <p className="text-gray-600">Manage all platform users and their activity</p>
                </div>
                <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add User
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">User Filters</CardTitle>
                    <CardDescription>Search and filter users by various criteria</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    placeholder="Search users by name, email, or phone..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All Status</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="suspended">Suspended</option>
                            </select>
                            <select
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">All Roles</option>
                                <option value="admin">Admin</option>
                                <option value="user">User</option>
                                <option value="moderator">Moderator</option>
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Users List */}
            <div className="space-y-4">
                {filteredUsers.map((user) => (
                    <Card key={user.id} className="hover:shadow-md transition-shadow duration-200">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-2">
                                        <UserCheck className="w-5 h-5 text-blue-600" />
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
                                            <p className="text-sm text-gray-500">{user.email}</p>
                                        </div>
                                        <Badge className={getStatusColor(user.status)}>
                                            {user.status}
                                        </Badge>
                                        <Badge className={getRoleColor(user.role)}>
                                            {user.role}
                                        </Badge>
                                        {user.status === 'suspended' && (
                                            <UserX className="w-4 h-4 text-red-600" aria-label="Suspended" />
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                        <div className="flex items-center space-x-2">
                                            <Calendar className="w-4 h-4 text-gray-400" />
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {user.metrics.total_orders}
                                                </div>
                                                <div className="text-xs text-gray-500">Total Orders</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Activity className="w-4 h-4 text-gray-400" />
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {formatCurrency(user.metrics.total_spent)}
                                                </div>
                                                <div className="text-xs text-gray-500">Total Spent</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <UserCheck className="w-4 h-4 text-gray-400" />
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                                                </div>
                                                <div className="text-xs text-gray-500">Last Login</div>
                                            </div>
                                        </div>
                                        {user.tenant_name && (
                                            <div className="flex items-center space-x-2">
                                                <Building2 className="w-4 h-4 text-gray-400" />
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {user.tenant_name}
                                                    </div>
                                                    <div className="text-xs text-gray-500">Tenant</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2 ml-4">
                                    <Button variant="outline" size="sm">
                                        <Eye className="w-4 h-4" />
                                    </Button>
                                    <Button variant="outline" size="sm">
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Empty State */}
            {filteredUsers.length === 0 && (
                <Card>
                    <CardContent className="p-12 text-center">
                        <UserCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                        <p className="text-gray-500 mb-4">
                            {searchTerm || statusFilter !== 'all' || roleFilter !== 'all'
                                ? 'Try adjusting your search or filter criteria'
                                : 'Get started by adding your first user'
                            }
                        </p>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Add User
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}