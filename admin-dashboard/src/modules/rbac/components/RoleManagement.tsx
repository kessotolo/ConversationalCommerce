'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
    Shield,
    Plus,
    Edit3,
    Trash2,
    Users,
    GitBranch,
    Search
} from 'lucide-react';

interface Role {
    id: string;
    name: string;
    description: string;
    permissions: string[];
    users_count: number;
    created_at: string;
    updated_at: string;
    is_system: boolean;
    parent_role?: string;
    inheritance_chain?: string[];
}

interface Permission {
    id: string;
    name: string;
    description: string;
    category: string;
    scope: string;
    is_system: boolean;
}

export function RoleManagement() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [loading, setLoading] = useState(true);

    // Mock data
    useEffect(() => {
        const mockRoles: Role[] = [
            {
                id: '1',
                name: 'Super Admin',
                description: 'Full system access with all permissions',
                permissions: ['*'],
                users_count: 3,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
                is_system: true,
                inheritance_chain: []
            },
            {
                id: '2',
                name: 'Admin',
                description: 'Administrative access with limited system permissions',
                permissions: ['tenant:read', 'tenant:write', 'user:read', 'user:write', 'order:read'],
                users_count: 12,
                created_at: '2024-01-02T00:00:00Z',
                updated_at: '2024-01-15T00:00:00Z',
                is_system: false,
                parent_role: '1',
                inheritance_chain: ['1']
            },
            {
                id: '3',
                name: 'Manager',
                description: 'Management access to specific tenant operations',
                permissions: ['tenant:read', 'user:read', 'order:read', 'order:write'],
                users_count: 25,
                created_at: '2024-01-03T00:00:00Z',
                updated_at: '2024-01-10T00:00:00Z',
                is_system: false,
                parent_role: '2',
                inheritance_chain: ['1', '2']
            },
            {
                id: '4',
                name: 'Support',
                description: 'Customer support access with read-only permissions',
                permissions: ['tenant:read', 'user:read', 'order:read'],
                users_count: 8,
                created_at: '2024-01-04T00:00:00Z',
                updated_at: '2024-01-20T00:00:00Z',
                is_system: false,
                parent_role: '3',
                inheritance_chain: ['1', '2', '3']
            }
        ];

        const mockPermissions: Permission[] = [
            {
                id: '1',
                name: 'tenant:read',
                description: 'Read tenant information',
                category: 'tenant',
                scope: 'global',
                is_system: true
            },
            {
                id: '2',
                name: 'tenant:write',
                description: 'Create and modify tenant information',
                category: 'tenant',
                scope: 'global',
                is_system: true
            },
            {
                id: '3',
                name: 'user:read',
                description: 'Read user information',
                category: 'user',
                scope: 'tenant',
                is_system: true
            },
            {
                id: '4',
                name: 'user:write',
                description: 'Create and modify user information',
                category: 'user',
                scope: 'tenant',
                is_system: true
            },
            {
                id: '5',
                name: 'order:read',
                description: 'Read order information',
                category: 'order',
                scope: 'tenant',
                is_system: true
            },
            {
                id: '6',
                name: 'order:write',
                description: 'Create and modify orders',
                category: 'order',
                scope: 'tenant',
                is_system: true
            },
            {
                id: '7',
                name: 'system:admin',
                description: 'System administration access',
                category: 'system',
                scope: 'global',
                is_system: true
            }
        ];

        setRoles(mockRoles);
        setPermissions(mockPermissions);
        setLoading(false);
    }, []);

    const filteredRoles = roles.filter(role => {
        const matchesSearch = role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            role.description.toLowerCase().includes(searchTerm.toLowerCase());

        if (filterType === 'all') return matchesSearch;
        if (filterType === 'system') return matchesSearch && role.is_system;
        if (filterType === 'custom') return matchesSearch && !role.is_system;

        return matchesSearch;
    });

    const handleCreateRole = (roleData: Partial<Role>) => {
        const newRole: Role = {
            id: Date.now().toString(),
            name: roleData.name || '',
            description: roleData.description || '',
            permissions: roleData.permissions || [],
            users_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            is_system: false,
            parent_role: roleData.parent_role,
            inheritance_chain: roleData.inheritance_chain || []
        };

        setRoles(prev => [...prev, newRole]);
        setIsCreateDialogOpen(false);
    };

    const handleEditRole = (roleData: Partial<Role>) => {
        if (!selectedRole) return;

        const updatedRole: Role = {
            ...selectedRole,
            ...roleData,
            updated_at: new Date().toISOString()
        };

        setRoles(prev => prev.map(role =>
            role.id === selectedRole.id ? updatedRole : role
        ));
        setIsEditDialogOpen(false);
        setSelectedRole(null);
    };

    const handleDeleteRole = (roleId: string) => {
        if (window.confirm('Are you sure you want to delete this role?')) {
            setRoles(prev => prev.filter(role => role.id !== roleId));
        }
    };

    const getRoleHierarchy = (role: Role): string => {
        if (!role.inheritance_chain || role.inheritance_chain.length === 0) {
            return role.name;
        }

        const parentNames = role.inheritance_chain.map(parentId => {
            const parent = roles.find(r => r.id === parentId);
            return parent ? parent.name : 'Unknown';
        });

        return `${parentNames.join(' > ')} > ${role.name}`;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Role Management</h2>
                    <p className="text-muted-foreground">
                        Manage roles and permissions for your organization
                    </p>
                </div>

                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Role
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Create New Role</DialogTitle>
                        </DialogHeader>
                        <RoleForm
                            permissions={permissions}
                            roles={roles}
                            onSubmit={handleCreateRole}
                            onCancel={() => setIsCreateDialogOpen(false)}
                        />
                    </DialogContent>
                </Dialog>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search roles..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="system">System Roles</SelectItem>
                        <SelectItem value="custom">Custom Roles</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Roles List */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {loading ? (
                    <div className="col-span-full text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="text-sm text-muted-foreground mt-2">Loading roles...</p>
                    </div>
                ) : filteredRoles.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                        <Shield className="h-8 w-8 mx-auto mb-2" />
                        <p>No roles found</p>
                        <p className="text-sm">Try adjusting your search or filters</p>
                    </div>
                ) : (
                    filteredRoles.map((role) => (
                        <Card key={role.id} className="relative">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <CardTitle className="text-lg">{role.name}</CardTitle>
                                        {role.is_system && (
                                            <Badge variant="secondary" className="text-xs">
                                                System
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setSelectedRole(role);
                                                setIsEditDialogOpen(true);
                                            }}
                                        >
                                            <Edit3 className="h-4 w-4" />
                                        </Button>
                                        {!role.is_system && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteRole(role.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                <CardDescription>{role.description}</CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                {/* Role Hierarchy */}
                                {role.inheritance_chain && role.inheritance_chain.length > 0 && (
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Inheritance Chain</Label>
                                        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                                            <GitBranch className="h-3 w-3" />
                                            <span>{getRoleHierarchy(role)}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Permissions */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Permissions</Label>
                                    <div className="flex flex-wrap gap-1">
                                        {role.permissions.includes('*') ? (
                                            <Badge variant="destructive" className="text-xs">
                                                All Permissions
                                            </Badge>
                                        ) : (
                                            role.permissions.slice(0, 3).map((permission) => (
                                                <Badge key={permission} variant="outline" className="text-xs">
                                                    {permission}
                                                </Badge>
                                            ))
                                        )}
                                        {role.permissions.length > 3 && !role.permissions.includes('*') && (
                                            <Badge variant="outline" className="text-xs">
                                                +{role.permissions.length - 3} more
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                {/* Users Count */}
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center space-x-2">
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-muted-foreground">
                                            {role.users_count} users
                                        </span>
                                    </div>
                                    <span className="text-muted-foreground">
                                        Updated {new Date(role.updated_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Edit Role Dialog */}
            {selectedRole && (
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Edit Role: {selectedRole.name}</DialogTitle>
                        </DialogHeader>
                        <RoleForm
                            role={selectedRole}
                            permissions={permissions}
                            roles={roles}
                            onSubmit={handleEditRole}
                            onCancel={() => {
                                setIsEditDialogOpen(false);
                                setSelectedRole(null);
                            }}
                        />
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

// Role Form Component
interface RoleFormProps {
    role?: Role;
    permissions: Permission[];
    roles: Role[];
    onSubmit: (data: Partial<Role>) => void;
    onCancel: () => void;
}

function RoleForm({ role, permissions, roles, onSubmit, onCancel }: RoleFormProps) {
    const [formData, setFormData] = useState({
        name: role?.name || '',
        description: role?.description || '',
        permissions: role?.permissions || [],
        parent_role: role?.parent_role || ''
    });

    const permissionsByCategory = permissions.reduce((acc, permission) => {
        if (!acc[permission.category]) {
            acc[permission.category] = [];
        }
        acc[permission.category].push(permission);
        return acc;
    }, {} as Record<string, Permission[]>);

    const handlePermissionChange = (permissionId: string, checked: boolean) => {
        setFormData(prev => ({
            ...prev,
            permissions: checked
                ? [...prev.permissions, permissionId]
                : prev.permissions.filter(id => id !== permissionId)
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Role Name</Label>
                    <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="parent_role">Parent Role</Label>
                    <Select value={formData.parent_role} onValueChange={(value) =>
                        setFormData(prev => ({ ...prev, parent_role: value }))
                    }>
                        <SelectTrigger>
                            <SelectValue placeholder="Select parent role" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">No parent</SelectItem>
                            {roles.filter(r => r.id !== role?.id).map((r) => (
                                <SelectItem key={r.id} value={r.id}>
                                    {r.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                />
            </div>

            <div className="space-y-4">
                <Label>Permissions</Label>
                <Tabs defaultValue={Object.keys(permissionsByCategory)[0]} className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        {Object.keys(permissionsByCategory).map((category) => (
                            <TabsTrigger key={category} value={category} className="capitalize">
                                {category}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
                        <TabsContent key={category} value={category} className="space-y-3">
                            {categoryPermissions.map((permission) => (
                                <div key={permission.id} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={permission.id}
                                        checked={formData.permissions.includes(permission.name)}
                                        onCheckedChange={(checked) =>
                                            handlePermissionChange(permission.name, checked as boolean)
                                        }
                                    />
                                    <Label htmlFor={permission.id} className="flex-1">
                                        <div className="flex items-center space-x-2">
                                            <span className="font-medium">{permission.name}</span>
                                            <Badge variant="outline" className="text-xs">
                                                {permission.scope}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {permission.description}
                                        </p>
                                    </Label>
                                </div>
                            ))}
                        </TabsContent>
                    ))}
                </Tabs>
            </div>

            <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit">
                    {role ? 'Update Role' : 'Create Role'}
                </Button>
            </div>
        </form>
    );
}