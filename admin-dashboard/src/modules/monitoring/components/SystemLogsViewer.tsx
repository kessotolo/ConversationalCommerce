'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    FileText,
    Search,
    Download,
    Eye,
    AlertTriangle,
    Info,
    Activity
} from 'lucide-react';
import api from '@/lib/api';

interface LogEntry {
    id: string;
    timestamp: string;
    level: 'debug' | 'info' | 'warning' | 'error' | 'critical';
    service: string;
    message: string;
    details: Record<string, unknown>;
    user_id?: string;
    ip_address?: string;
    request_id?: string;
}

interface SystemLogsViewerProps {
    timeRange?: '1h' | '6h' | '24h' | '7d';
}

export function SystemLogsViewer({ timeRange = '24h' }: SystemLogsViewerProps) {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [levelFilter, setLevelFilter] = useState('all');
    const [serviceFilter, setServiceFilter] = useState('all');
    const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
    const [logDialogOpen, setLogDialogOpen] = useState(false);

    const fetchLogs = useCallback(async () => {
        try {
            const response = await api.get('/api/admin/monitoring/logs', {
                params: {
                    time_range: timeRange,
                    level: levelFilter !== 'all' ? levelFilter : undefined,
                    service: serviceFilter !== 'all' ? serviceFilter : undefined,
                    search: searchTerm || undefined
                }
            });
            setLogs(response.data);
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    }, [timeRange, levelFilter, serviceFilter, searchTerm]);

    useEffect(() => {
        fetchLogs();
        const interval = setInterval(fetchLogs, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, [fetchLogs]);

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

    const getLevelIcon = (level: string) => {
        switch (level) {
            case 'debug':
                return <Activity className="h-4 w-4" />;
            case 'info':
                return <Info className="h-4 w-4" />;
            case 'warning':
                return <AlertTriangle className="h-4 w-4" />;
            case 'error':
            case 'critical':
                return <AlertTriangle className="h-4 w-4" />;
            default:
                return <Activity className="h-4 w-4" />;
        }
    };

    const downloadLogs = async () => {
        try {
            const response = await api.get('/api/admin/monitoring/logs/export', {
                responseType: 'blob',
                params: {
                    time_range: timeRange,
                    level: levelFilter !== 'all' ? levelFilter : undefined,
                    service: serviceFilter !== 'all' ? serviceFilter : undefined
                }
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `system-logs-${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error downloading logs:', error);
        }
    };

    const filteredLogs = logs.filter(log => {
        const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.service.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
        const matchesService = serviceFilter === 'all' || log.service === serviceFilter;
        return matchesSearch && matchesLevel && matchesService;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Controls */}
            <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search logs..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <Select value={levelFilter} onValueChange={setLevelFilter}>
                        <SelectTrigger className="w-32">
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
                    <Select value={serviceFilter} onValueChange={setServiceFilter}>
                        <SelectTrigger className="w-40">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Services</SelectItem>
                            <SelectItem value="api">API</SelectItem>
                            <SelectItem value="database">Database</SelectItem>
                            <SelectItem value="auth">Authentication</SelectItem>
                            <SelectItem value="payment">Payment</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={downloadLogs}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Logs */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <FileText className="h-5 w-5 mr-2" />
                        System Logs
                    </CardTitle>
                    <CardDescription>
                        Real-time system logs and events
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-96">
                        <div className="space-y-2">
                            {filteredLogs.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <FileText className="h-8 w-8 mx-auto mb-2" />
                                    <p>No logs found for the selected criteria</p>
                                </div>
                            ) : (
                                filteredLogs.map((log) => (
                                    <div key={log.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                                        <div className="flex items-center space-x-2">
                                            {getLevelIcon(log.level)}
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-2">
                                                    <Badge className={getLevelColor(log.level)}>
                                                        {log.level}
                                                    </Badge>
                                                    <span className="text-sm font-medium">{log.service}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {new Date(log.timestamp).toLocaleString()}
                                                    </span>
                                                </div>
                                                <p className="text-sm mt-1">{log.message}</p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedLog(log);
                                                    setLogDialogOpen(true);
                                                }}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Log Details Dialog */}
            <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Log Details</DialogTitle>
                    </DialogHeader>
                    {selectedLog && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium">Level</label>
                                    <Badge className={getLevelColor(selectedLog.level)}>
                                        {selectedLog.level}
                                    </Badge>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Service</label>
                                    <p className="text-sm">{selectedLog.service}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Timestamp</label>
                                    <p className="text-sm">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Request ID</label>
                                    <p className="text-sm">{selectedLog.request_id || 'N/A'}</p>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium">Message</label>
                                <p className="text-sm mt-1">{selectedLog.message}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium">Details</label>
                                <pre className="text-sm bg-muted p-3 rounded mt-1 overflow-auto">
                                    {JSON.stringify(selectedLog.details, null, 2)}
                                </pre>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}