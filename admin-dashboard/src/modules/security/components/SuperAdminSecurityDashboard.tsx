'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Key, Globe, AlertTriangle, Activity, } from 'lucide-react';
import { superAdminSecurityService } from '../services/superAdminSecurityService';
import type {
    SuperAdminTOTPStatus,
    SuperAdminTOTPSetup,
    SuperAdminIPAllowlistEntry,
    SuperAdminEmergencyLockout,
    SuperAdminAuditLog
} from '../models/superAdminSecurity';

export function SuperAdminSecurityDashboard() {
    // 2FA State
    const [totpStatus, setTotpStatus] = useState<SuperAdminTOTPStatus | null>(null);
    const [totpSetup, setTotpSetup] = useState<SuperAdminTOTPSetup | null>(null);
    const [showSetup2FA, setShowSetup2FA] = useState(false);
    const [totpCode, setTotpCode] = useState('');
    const [backupCodes, setBackupCodes] = useState<string[]>([]);

    // IP Allowlist State
    const [ipAllowlist, setIpAllowlist] = useState<SuperAdminIPAllowlistEntry[]>([]);
    const [showAddIP, setShowAddIP] = useState(false);
    const [newIPEntry, setNewIPEntry] = useState({
        ip_range: '',
        description: '',
        expires_at: ''
    });

    // Emergency Controls State
    const [emergencyLockouts, setEmergencyLockouts] = useState<SuperAdminEmergencyLockout[]>([]);
    const [showCreateLockout, setShowCreateLockout] = useState(false);
    const [newLockout, setNewLockout] = useState({
        reason: '',
        message: '',
        duration_hours: '',
        allow_read_only: false
    });

    // Audit Logs State
    const [auditLogs, setAuditLogs] = useState<SuperAdminAuditLog[]>([]);
    const [auditFilter, setAuditFilter] = useState('');

    // General State
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);

        try {
            // Fetch all data in parallel
            const [statusResult, ipResult, lockoutsResult, logsResult] = await Promise.all([
                superAdminSecurityService.get2FAStatus(),
                superAdminSecurityService.getIPAllowlist(),
                superAdminSecurityService.getEmergencyLockouts(),
                superAdminSecurityService.getAuditLogs()
            ]);

            if (statusResult.success) setTotpStatus(statusResult.data);
            if (ipResult.success) setIpAllowlist(ipResult.data.entries);
            if (lockoutsResult.success) setEmergencyLockouts(lockoutsResult.data.lockouts);
            if (logsResult.success) setAuditLogs(logsResult.data.logs);

        } catch (err: any) {
            setError(err.message || 'Failed to load security data');
        }

        setLoading(false);
    };

    const setup2FA = async () => {
        try {
            const result = await superAdminSecurityService.setup2FA();
            if (result.success) {
                setTotpSetup(result.data);
                setShowSetup2FA(true);
                setSuccess('2FA setup initiated. Please scan the QR code with your authenticator app.');
            } else {
                setError(result.error?.message || 'Failed to setup 2FA');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to setup 2FA');
        }
    };

    const verify2FA = async () => {
        if (!totpCode || totpCode.length !== 6) {
            setError('Please enter a valid 6-digit code');
            return;
        }

        try {
            const result = await superAdminSecurityService.verify2FA(totpCode);
            if (result.success) {
                setSuccess('2FA enabled successfully!');
                setShowSetup2FA(false);
                setTotpCode('');
                await fetchData();
            } else {
                setError(result.error?.message || 'Invalid verification code');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to verify 2FA');
        }
    };

    const generateBackupCodes = async () => {
        try {
            const result = await superAdminSecurityService.generateBackupCodes();
            if (result.success) {
                setBackupCodes(result.data.backup_codes);
                setSuccess('New backup codes generated successfully');
            } else {
                setError(result.error?.message || 'Failed to generate backup codes');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to generate backup codes');
        }
    };

    const addIPEntry = async () => {
        if (!newIPEntry.ip_range || !newIPEntry.description) {
            setError('IP range and description are required');
            return;
        }

        try {
            const result = await superAdminSecurityService.addIPAllowlistEntry(newIPEntry);
            if (result.success) {
                setSuccess('IP allowlist entry added successfully');
                setNewIPEntry({ ip_range: '', description: '', expires_at: '' });
                setShowAddIP(false);
                await fetchData();
            } else {
                setError(result.error?.message || 'Failed to add IP entry');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to add IP entry');
        }
    };

    const removeIPEntry = async (entryId: string) => {
        try {
            const result = await superAdminSecurityService.removeIPAllowlistEntry(entryId);
            if (result.success) {
                setSuccess('IP allowlist entry removed successfully');
                await fetchData();
            } else {
                setError(result.error?.message || 'Failed to remove IP entry');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to remove IP entry');
        }
    };

    const createEmergencyLockout = async () => {
        if (!newLockout.reason || !newLockout.message) {
            setError('Reason and message are required');
            return;
        }

        try {
            const lockoutData = {
                ...newLockout,
                duration_hours: newLockout.duration_hours ? parseInt(newLockout.duration_hours) : undefined
            };

            const result = await superAdminSecurityService.createEmergencyLockout(lockoutData);
            if (result.success) {
                setSuccess('Emergency lockout created successfully');
                setNewLockout({ reason: '', message: '', duration_hours: '', allow_read_only: false });
                setShowCreateLockout(false);
                await fetchData();
            } else {
                setError(result.error?.message || 'Failed to create emergency lockout');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to create emergency lockout');
        }
    };

    const deactivateLockout = async (lockoutId: string) => {
        try {
            const result = await superAdminSecurityService.deactivateEmergencyLockout(lockoutId);
            if (result.success) {
                setSuccess('Emergency lockout deactivated successfully');
                await fetchData();
            } else {
                setError(result.error?.message || 'Failed to deactivate lockout');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to deactivate lockout');
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Super Admin Security</h1>
                    <p className="text-gray-600 mt-2">Comprehensive security management for Super Admin accounts</p>
                </div>
                <Shield className="h-8 w-8 text-blue-600" />
            </div>

            {error && (
                <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
            )}

            {success && (
                <Alert className="border-green-200 bg-green-50">
                    <AlertDescription className="text-green-800">{success}</AlertDescription>
                </Alert>
            )}

            <Tabs defaultValue="2fa" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="2fa" className="flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        Two-Factor Auth
                    </TabsTrigger>
                    <TabsTrigger value="ip-allowlist" className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        IP Allowlist
                    </TabsTrigger>
                    <TabsTrigger value="emergency" className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Emergency Controls
                    </TabsTrigger>
                    <TabsTrigger value="audit" className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Audit Logs
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="2fa" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Key className="h-5 w-5" />
                                Two-Factor Authentication
                            </CardTitle>
                            <CardDescription>
                                Secure your Super Admin account with TOTP-based two-factor authentication
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {totpStatus && (
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <p className="font-medium">2FA Status</p>
                                        <p className="text-sm text-gray-600">
                                            {totpStatus.is_enabled ? 'Enabled and active' : 'Not enabled'}
                                        </p>
                                    </div>
                                    <Badge variant={totpStatus.is_enabled ? 'default' : 'secondary'}>
                                        {totpStatus.is_enabled ? 'Enabled' : 'Disabled'}
                                    </Badge>
                                </div>
                            )}

                            {!totpStatus?.is_enabled && (
                                <Button onClick={setup2FA} className="w-full">
                                    Set Up Two-Factor Authentication
                                </Button>
                            )}

                            {totpStatus?.is_enabled && (
                                <div className="space-y-4">
                                    <Button onClick={generateBackupCodes} variant="outline">
                                        Generate New Backup Codes
                                    </Button>

                                    {backupCodes.length > 0 && (
                                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                            <h4 className="font-medium text-yellow-800 mb-2">Backup Codes</h4>
                                            <p className="text-sm text-yellow-700 mb-3">
                                                Save these codes in a secure location. Each can only be used once.
                                            </p>
                                            <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                                                {backupCodes.map((code, index) => (
                                                    <div key={index} className="p-2 bg-white border rounded">
                                                        {code}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* 2FA Setup Dialog */}
                    <Dialog open={showSetup2FA} onOpenChange={setShowSetup2FA}>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
                            </DialogHeader>
                            {totpSetup && (
                                <div className="space-y-4">
                                    <div className="text-center">
                                        <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(totpSetup.qr_code_uri)}`}
                                            alt="QR Code for 2FA setup"
                                            className="mx-auto border rounded"
                                        />
                                        <p className="text-sm text-gray-600 mt-2">
                                            Scan this QR code with your authenticator app
                                        </p>
                                    </div>

                                    <div>
                                        <Label htmlFor="totp-code">Verification Code</Label>
                                        <Input
                                            id="totp-code"
                                            type="text"
                                            placeholder="Enter 6-digit code"
                                            value={totpCode}
                                            onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            maxLength={6}
                                        />
                                    </div>

                                    <div className="flex gap-2">
                                        <Button onClick={() => setShowSetup2FA(false)} variant="outline" className="flex-1">
                                            Cancel
                                        </Button>
                                        <Button onClick={verify2FA} className="flex-1">
                                            Verify & Enable
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>
                </TabsContent>

                <TabsContent value="ip-allowlist" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Globe className="h-5 w-5" />
                                IP Allowlist Management
                            </CardTitle>
                            <CardDescription>
                                Control which IP addresses can access Super Admin functions
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-medium">Allowed IP Addresses</h3>
                                <Button onClick={() => setShowAddIP(true)}>Add IP Address</Button>
                            </div>

                            <div className="space-y-4">
                                {ipAllowlist.map((entry) => (
                                    <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg">
                                        <div>
                                            <p className="font-mono font-medium">{entry.ip_range}</p>
                                            <p className="text-sm text-gray-600">{entry.description}</p>
                                            <p className="text-xs text-gray-500">
                                                Added: {new Date(entry.created_at).toLocaleDateString()}
                                                {entry.expires_at && ` • Expires: ${new Date(entry.expires_at).toLocaleDateString()}`}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={entry.is_active ? 'default' : 'secondary'}>
                                                {entry.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => removeIPEntry(entry.id)}
                                            >
                                                Remove
                                            </Button>
                                        </div>
                                    </div>
                                ))}

                                {ipAllowlist.length === 0 && (
                                    <div className="text-center py-8 text-gray-500">
                                        No IP addresses configured. Add one to get started.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Add IP Dialog */}
                    <Dialog open={showAddIP} onOpenChange={setShowAddIP}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add IP Address</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="ip_range">IP Address or CIDR Range</Label>
                                    <Input
                                        id="ip_range"
                                        placeholder="192.168.1.100 or 192.168.1.0/24"
                                        value={newIPEntry.ip_range}
                                        onChange={(e) => setNewIPEntry({ ...newIPEntry, ip_range: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="description">Description</Label>
                                    <Input
                                        id="description"
                                        placeholder="Office network, VPN, etc."
                                        value={newIPEntry.description}
                                        onChange={(e) => setNewIPEntry({ ...newIPEntry, description: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="expires_at">Expiration Date (Optional)</Label>
                                    <Input
                                        id="expires_at"
                                        type="datetime-local"
                                        value={newIPEntry.expires_at}
                                        onChange={(e) => setNewIPEntry({ ...newIPEntry, expires_at: e.target.value })}
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button variant="outline" onClick={() => setShowAddIP(false)}>
                                        Cancel
                                    </Button>
                                    <Button onClick={addIPEntry}>
                                        Add Entry
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </TabsContent>

                <TabsContent value="emergency" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5" />
                                Emergency Controls
                            </CardTitle>
                            <CardDescription>
                                Platform-wide emergency lockout controls for critical situations
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-medium">Active Lockouts</h3>
                                <Button
                                    onClick={() => setShowCreateLockout(true)}
                                    variant="destructive"
                                >
                                    Create Emergency Lockout
                                </Button>
                            </div>

                            <div className="space-y-4">
                                {emergencyLockouts.map((lockout) => (
                                    <div key={lockout.id} className="p-4 border border-red-200 bg-red-50 rounded-lg">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h4 className="font-medium text-red-800">{lockout.reason}</h4>
                                                <p className="text-sm text-red-700 mt-1">{lockout.message}</p>
                                                <div className="flex items-center gap-4 mt-2 text-xs text-red-600">
                                                    <span>Created: {new Date(lockout.created_at).toLocaleString()}</span>
                                                    {lockout.expires_at && (
                                                        <span>Expires: {new Date(lockout.expires_at).toLocaleString()}</span>
                                                    )}
                                                    <Badge variant={lockout.allow_read_only ? 'secondary' : 'destructive'}>
                                                        {lockout.allow_read_only ? 'Read-Only' : 'Full Lockout'}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => deactivateLockout(lockout.id)}
                                            >
                                                Deactivate
                                            </Button>
                                        </div>
                                    </div>
                                ))}

                                {emergencyLockouts.length === 0 && (
                                    <div className="text-center py-8 text-gray-500">
                                        No active emergency lockouts.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Create Lockout Dialog */}
                    <Dialog open={showCreateLockout} onOpenChange={setShowCreateLockout}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create Emergency Lockout</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="reason">Reason</Label>
                                    <Input
                                        id="reason"
                                        placeholder="Security incident, maintenance, etc."
                                        value={newLockout.reason}
                                        onChange={(e) => setNewLockout({ ...newLockout, reason: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="message">User Message</Label>
                                    <Textarea
                                        id="message"
                                        placeholder="Message shown to users during lockout"
                                        value={newLockout.message}
                                        onChange={(e) => setNewLockout({ ...newLockout, message: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="duration">Duration (hours, optional)</Label>
                                    <Input
                                        id="duration"
                                        type="number"
                                        placeholder="Leave empty for manual deactivation"
                                        value={newLockout.duration_hours}
                                        onChange={(e) => setNewLockout({ ...newLockout, duration_hours: e.target.value })}
                                    />
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="read_only"
                                        checked={newLockout.allow_read_only}
                                        onCheckedChange={(checked) => setNewLockout({ ...newLockout, allow_read_only: checked })}
                                    />
                                    <Label htmlFor="read_only">Allow read-only access</Label>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button variant="outline" onClick={() => setShowCreateLockout(false)}>
                                        Cancel
                                    </Button>
                                    <Button variant="destructive" onClick={createEmergencyLockout}>
                                        Create Lockout
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </TabsContent>

                <TabsContent value="audit" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="h-5 w-5" />
                                Security Audit Logs
                            </CardTitle>
                            <CardDescription>
                                Monitor all Super Admin security-related activities
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-6">
                                <Label htmlFor="audit-filter">Filter by Action</Label>
                                <Input
                                    id="audit-filter"
                                    placeholder="Search actions..."
                                    value={auditFilter}
                                    onChange={(e) => setAuditFilter(e.target.value)}
                                />
                            </div>

                            <div className="space-y-3">
                                {auditLogs
                                    .filter(log => !auditFilter || log.action.toLowerCase().includes(auditFilter.toLowerCase()))
                                    .map((log) => (
                                        <div key={log.id} className="p-4 border rounded-lg">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                                                            {log.action}
                                                        </Badge>
                                                        <span className="text-sm text-gray-500">
                                                            {new Date(log.timestamp).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-600">
                                                        Resource: {log.resource_type}/{log.resource_id}
                                                    </p>
                                                    {log.ip_address && (
                                                        <p className="text-xs text-gray-500">IP: {log.ip_address}</p>
                                                    )}
                                                </div>
                                                <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                                                    {log.status}
                                                </Badge>
                                            </div>
                                            {log.details && Object.keys(log.details).length > 0 && (
                                                <details className="mt-2">
                                                    <summary className="text-sm cursor-pointer text-blue-600">
                                                        View Details
                                                    </summary>
                                                    <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto">
                                                        {JSON.stringify(log.details, null, 2)}
                                                    </pre>
                                                </details>
                                            )}
                                        </div>
                                    ))}

                                {auditLogs.length === 0 && (
                                    <div className="text-center py-8 text-gray-500">
                                        No audit logs found.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}