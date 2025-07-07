'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Search,
    Filter,
    Download,
    Eye,
    AlertTriangle,
    Info,
    XCircle,
    CheckCircle,
    RefreshCw,
    Calendar,
    Clock
} from 'lucide-react';
import api from '@/lib/api';

interface LogEntry {
    id: string;
    timestamp: string;
    level: 'debug' | 'info' | 'warning' | 'error' | 'critical';
    service: string;
    message: string;
    details: Record<string, any>;
    user_id?: string;
    tenant_id?: string;
    ip_address?: string;
    user_agent?: string;
    duration_ms?: number;
    status_code?: number;
    endpoint?: string;
}

interface LogFilters {
    level: string;
    service: string;
    search: string;
    dateFrom: string;
    dateTo: string;
    user_id?: string;
    tenant_id?: string;
}

interface SystemLogsViewerProps {
    maxEntries?: number;
}

export function SystemLogsViewer({ maxEntries = 1000 }: SystemLogsViewerProps) {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filters, setFilters] = useState<LogFilters>({
        level: 'all',
        service: 'all',
        search: '',
        dateFrom: '',
        dateTo: ''
    });
    const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
    const [logDetailOpen, setLogDetailOpen] = useState(false);

    const fetchLogs = async () => {
        try {
            setRefreshing(true);
            const response = await api.get('/api/admin/monitoring/logs', {
                params: {
                    limit: maxEntries,
                    level: filters.level !== 'all' ? filters.level : undefined,
                    service: filters.service !== 'all' ? filters.service : undefined,
                    search: filters.search || undefined,
                    date_from: filters.dateFrom || undefined,
                    date_to: filters.dateTo || undefined
                }
            });
            setLogs(response.data);
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchLogs();
        const interval = setInterval(fetchLogs, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, [filters]);

    useEffect(() => {
        // Apply filters to logs
        let filtered = logs;

        if (filters.level !== 'all') {
            filtered = filtered.filter(log => log.level === filters.level);
        }

        if (filters.service !== 'all') {
            filtered = filtered.filter(log => log.service === filters.service);
        }

        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(log =>
                log.message.toLowerCase().includes(searchLower) ||
                log.service.toLowerCase().includes(searchLower) ||
                (log.user_id && log.user_id.toLowerCase().includes(searchLower)) ||
                (log.tenant_id && log.tenant_id.toLowerCase().includes(searchLower))
            );
        }

        if (filters.dateFrom) {
            filtered = filtered.filter(log => new Date(log.timestamp) >= new Date(filters.dateFrom));
        }

        if (filters.dateTo) {
            filtered = filtered.filter(log => new Date(log.timestamp) <= new Date(filters.dateTo));
        }

        setFilteredLogs(filtered);
    }, [logs, filters]);

    const getLevelIcon = (level: string) => {
        switch (level) {
            case 'debug':
                return Info;
            case 'info':
                return Info;
            case 'warning':
                return AlertTriangle;
            case 'error':
                return XCircle;
            case 'critical':
                return AlertTriangle;
            default:
                return Info;
        }
    };

    const getLevelColor = (level: string) => {
        switch (level) {
            case 'debug':
                return 'bg-gray-500';
            case 'info':
                return 'bg-blue-500';
            case 'warning':
                return 'bg-yellow-500';
            case 'error':
                return 'bg-red-500';
            case 'critical':
                return 'bg-red-600';
            default:
                return 'bg-gray-500';
        }
    };

    const exportLogs = async () => {
        try {
            const response = await api.get('/api/admin/monitoring/logs/export', {
                params: {
                    level: filters.level !== 'all' ? filters.level : undefined,
                    service: filters.service !== 'all' ? filters.service : undefined,
                    search: filters.search || undefined,
                    date_from: filters.dateFrom || undefined,
                    date_to: filters.dateTo || undefined
                },
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `system-logs-${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error exporting logs:', error);
        }
    };

    const formatTimestamp = (timestamp: string) => {
        return new Date(timestamp).toLocaleString();
    };

    const truncateMessage = (message: string, maxLength: number = 100) => {
        return message.length > maxLength ? message.substring(0, maxLength) + '...' : message;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Filter className="h-5 w-5 mr-2" />
                        Log Filters
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
                        <div>
                            <label className="text-sm font-medium">Level</label>
                            <Select value={filters.level} onValueChange={(value) => setFilters({ ...filters, level: value })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Levels</SelectItem>
                                    <SelectItem value="debug">Debug</SelectItem>
                                    <SelectItem value="info">Info</SelectItem>
                                    <SelectItem value="warning">Warning</SelectItem>
                                    <SelectItem value="error">Error</SelectItem>
                                    <SelectItem value="critical">Critical</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-sm font-medium">Service</label>
                            <Select value={filters.service} onValueChange={(value) => setFilters({ ...filters, service: value })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Services</SelectItem>
                                    <SelectItem value="api">API</SelectItem>
                                    <SelectItem value="database">Database</SelectItem>
                                    <SelectItem value="auth">Authentication</SelectItem>
                                    <SelectItem value="payment">Payment</SelectItem>
                                    <SelectItem value="notification">Notification</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-sm font-medium">Search</label>
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search logs..."
                                    value={filters.search}
                                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                    className="pl-8"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium">From Date</label>
                            <Input
                                type="datetime-local"
                                value={filters.dateFrom}
                                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium">To Date</label>
                            <Input
                                type="datetime-local"
                                value={filters.dateTo}
                                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                            />
                        </div>

                        <div className="flex items-end space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={fetchLogs}
                                disabled={refreshing}
                            >
                                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={exportLogs}
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Export
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Logs Display */}
            <Card>
                <CardHeader>
                    <CardTitle>System Logs</CardTitle>
                    <CardDescription>
                        Showing {filteredLogs.length} of {logs.length} logs
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-96">
                        <div className="space-y-2">
                            {filteredLogs.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Info className="h-8 w-8 mx-auto mb-2" />
                                    <p>No logs found matching the current filters</p>
                                </div>
                            ) : (
                                filteredLogs.map((log) => {
                                    const LevelIcon = getLevelIcon(log.level);
                                    return (
                                        <div
                                            key={log.id}
                                            className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                                            onClick={() => {
                                                setSelectedLog(log);
                                                setLogDetailOpen(true);
                                            }}
                                        >
                                            <Badge className={getLevelColor(log.level)}>
                                                <LevelIcon className="h-3 w-3 mr-1" />
                                                {log.level}
                                            </Badge>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center space-x-2 mb-1">
                                                    <span className="text-sm font-medium">{log.service}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {formatTimestamp(log.timestamp)}
                                                    </span>
                                                </div>
                                                <p className="text-sm">{truncateMessage(log.message)}</p>
                                                {log.duration_ms && (
                                                    <span className="text-xs text-muted-foreground">
                                                        Duration: {log.duration_ms}ms
                                                    </span>
                                                )}
                                            </div>
                                            <Eye className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Log Detail Dialog */}
            <Dialog open={logDetailOpen} onOpenChange={setLogDetailOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Log Details</DialogTitle>
                    </DialogHeader>
                    {selectedLog && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium">Level</label>
                                    <div className="flex items-center space-x-2">
                                        <Badge className={getLevelColor(selectedLog.level)}>
                                            {selectedLog.level}
                                        </Badge>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Service</label>
                                    <p className="text-sm">{selectedLog.service}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Timestamp</label>
                                    <p className="text-sm">{formatTimestamp(selectedLog.timestamp)}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">User ID</label>
                                    <p className="text-sm">{selectedLog.user_id || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Tenant ID</label>
                                    <p className="text-sm">{selectedLog.tenant_id || 'N/A'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">IP Address</label>
                                    <p className="text-sm">{selectedLog.ip_address || 'N/A'}</p>
                                </div>
                                {selectedLog.status_code && (
                                    <div>
                                        <label className="text-sm font-medium">Status Code</label>
                                        <p className="text-sm">{selectedLog.status_code}</p>
                                    </div>
                                )}
                                {selectedLog.duration_ms && (
                                    <div>
                                        <label className="text-sm font-medium">Duration</label>
                                        <p className="text-sm">{selectedLog.duration_ms}ms</p>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="text-sm font-medium">Message</label>
                                <p className="text-sm bg-muted p-2 rounded">{selectedLog.message}</p>
                            </div>
                            {Object.keys(selectedLog.details).length > 0 && (
                                <div>
                                    <label className="text-sm font-medium">Details</label>
                                    <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                                        {JSON.stringify(selectedLog.details, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}