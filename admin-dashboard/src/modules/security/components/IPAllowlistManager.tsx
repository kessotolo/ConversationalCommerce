'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { securityService } from '../services/securityService';
import type { IPAllowlistEntry } from '../models/security';

export function IPAllowlistManager() {
    const [entries, setEntries] = useState<IPAllowlistEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [newEntry, setNewEntry] = useState({
        ip_address: '',
        description: '',
        is_active: true
    });

    const fetchEntries = async () => {
        setLoading(true);
        setError(null);

        const result = await securityService.getIPAllowlist();

        if (result.success) {
            setEntries(result.data);
        } else {
            setError(result.error.message);
        }

        setLoading(false);
    };

    const handleAddEntry = async () => {
        if (!newEntry.ip_address || !newEntry.description) {
            setError('IP address and description are required');
            return;
        }

        const result = await securityService.addIPAllowlistEntry({
            ...newEntry,
            created_by: 'current-user-id' // This should come from auth context
        });

        if (result.success) {
            setEntries([...entries, result.data]);
            setNewEntry({ ip_address: '', description: '', is_active: true });
            setIsAddDialogOpen(false);
            setError(null);
        } else {
            setError(result.error.message);
        }
    };

    const handleRemoveEntry = async (id: string) => {
        const result = await securityService.removeIPAllowlistEntry(id);

        if (result.success) {
            setEntries(entries.filter(entry => entry.id !== id));
        } else {
            setError(result.error.message);
        }
    };

    useEffect(() => {
        fetchEntries();
    }, []);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>IP Allowlist</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>IP Allowlist Management</CardTitle>
                <CardDescription>
                    Manage IP addresses allowed to access the admin dashboard
                </CardDescription>
            </CardHeader>
            <CardContent>
                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-red-800">{error}</p>
                    </div>
                )}

                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-medium">Allowed IP Addresses</h3>
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>Add IP Address</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add IP Address</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="ip_address">IP Address</Label>
                                    <Input
                                        id="ip_address"
                                        type="text"
                                        placeholder="192.168.1.100 or 192.168.1.0/24"
                                        value={newEntry.ip_address}
                                        onChange={(e) => setNewEntry({ ...newEntry, ip_address: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="description">Description</Label>
                                    <Input
                                        id="description"
                                        type="text"
                                        placeholder="Office network, VPN, etc."
                                        value={newEntry.description}
                                        onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                                    />
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="is_active"
                                        checked={newEntry.is_active}
                                        onCheckedChange={(checked) => setNewEntry({ ...newEntry, is_active: checked })}
                                    />
                                    <Label htmlFor="is_active">Active</Label>
                                </div>
                                <div className="flex justify-end space-x-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsAddDialogOpen(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button onClick={handleAddEntry}>
                                        Add Entry
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="border rounded-md">
                    <Table>
                        <thead>
                            <tr className="border-b">
                                <th className="text-left p-4">IP Address</th>
                                <th className="text-left p-4">Description</th>
                                <th className="text-left p-4">Status</th>
                                <th className="text-left p-4">Created</th>
                                <th className="text-left p-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((entry) => (
                                <tr key={entry.id} className="border-b">
                                    <td className="p-4 font-mono">{entry.ip_address}</td>
                                    <td className="p-4">{entry.description}</td>
                                    <td className="p-4">
                                        <Badge variant={entry.is_active ? 'default' : 'secondary'}>
                                            {entry.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </td>
                                    <td className="p-4">
                                        {new Date(entry.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="p-4">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleRemoveEntry(entry.id)}
                                        >
                                            Remove
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </div>

                {entries.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        No IP addresses configured. Add one to get started.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}