'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Bell,
    AlertTriangle,
    Settings,
    Plus,
    Edit,
    Trash2,
    CheckCircle,
    XCircle,
    Info,
    Zap,
    Shield,
    Activity
} from 'lucide-react';
import api from '@/lib/api';

interface AlertRule {
    id: string;
    name: string;
    description: string;
    metric: string;
    condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    threshold: number;
    duration: number; // minutes
    severity: 'low' | 'medium' | 'high' | 'critical';
    enabled: boolean;
    notifications: {
        email: boolean;
        slack: boolean;
        webhook: boolean;
        dashboard: boolean;
    };
    recipients: string[];
    created_at: string;
    updated_at: string;
}

interface AlertHistory {
    id: string;
    rule_id: string;
    rule_name: string;
    severity: string;
    message: string;
    metric_value: number;
    threshold: number;
    triggered_at: string;
    resolved_at?: string;
    status: 'active' | 'resolved' | 'acknowledged';
}

interface AlertConfigurationProps {
    onAlertTriggered?: (alert: AlertHistory) => void;
}

export function AlertConfiguration({ onAlertTriggered }: AlertConfigurationProps) {
    const [rules, setRules] = useState<AlertRule[]>([]);
    const [alertHistory, setAlertHistory] = useState<AlertHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
    const [newRule, setNewRule] = useState<Partial<AlertRule>>({
        name: '',
        description: '',
        metric: 'cpu_usage',
        condition: 'gt',
        threshold: 80,
        duration: 5,
        severity: 'medium',
        enabled: true,
        notifications: {
            email: true,
            slack: false,
            webhook: false,
            dashboard: true
        },
        recipients: []
    });

    const fetchAlertData = async () => {
        try {
            const [rulesResponse, historyResponse] = await Promise.all([
                api.get('/api/admin/monitoring/alerts/rules'),
                api.get('/api/admin/monitoring/alerts/history')
            ]);
            setRules(rulesResponse.data);
            setAlertHistory(historyResponse.data);
        } catch (error) {
            console.error('Error fetching alert data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlertData();
        const interval = setInterval(fetchAlertData, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, []);

    const handleCreateRule = async () => {
        try {
            if (editingRule) {
                await api.put(`/api/admin/monitoring/alerts/rules/${editingRule.id}`, newRule);
            } else {
                await api.post('/api/admin/monitoring/alerts/rules', newRule);
            }
            setRuleDialogOpen(false);
            setEditingRule(null);
            setNewRule({
                name: '',
                description: '',
                metric: 'cpu_usage',
                condition: 'gt',
                threshold: 80,
                duration: 5,
                severity: 'medium',
                enabled: true,
                notifications: {
                    email: true,
                    slack: false,
                    webhook: false,
                    dashboard: true
                },
                recipients: []
            });
            fetchAlertData();
        } catch (error) {
            console.error('Error creating/updating rule:', error);
        }
    };

    const handleDeleteRule = async (ruleId: string) => {
        try {
            await api.delete(`/api/admin/monitoring/alerts/rules/${ruleId}`);
            fetchAlertData();
        } catch (error) {
            console.error('Error deleting rule:', error);
        }
    };

    const handleToggleRule = async (ruleId: string, enabled: boolean) => {
        try {
            await api.patch(`/api/admin/monitoring/alerts/rules/${ruleId}`, { enabled });
            fetchAlertData();
        } catch (error) {
            console.error('Error toggling rule:', error);
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'low':
                return 'bg-blue-500';
            case 'medium':
                return 'bg-yellow-500';
            case 'high':
                return 'bg-orange-500';
            case 'critical':
                return 'bg-red-500';
            default:
                return 'bg-gray-500';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-red-500';
            case 'resolved':
                return 'bg-green-500';
            case 'acknowledged':
                return 'bg-yellow-500';
            default:
                return 'bg-gray-500';
        }
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
            <Tabs defaultValue="rules" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="rules">Alert Rules</TabsTrigger>
                    <TabsTrigger value="history">Alert History</TabsTrigger>
                    <TabsTrigger value="settings">Notification Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="rules" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-semibold">Alert Rules</h3>
                            <p className="text-sm text-muted-foreground">
                                Configure monitoring rules and notification preferences
                            </p>
                        </div>
                        <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
                            <DialogTrigger asChild>
                                <Button onClick={() => setEditingRule(null)}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Rule
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle>
                                        {editingRule ? 'Edit Alert Rule' : 'Create Alert Rule'}
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium">Rule Name</label>
                                        <Input
                                            value={newRule.name}
                                            onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                                            placeholder="High CPU Usage"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Description</label>
                                        <Input
                                            value={newRule.description}
                                            onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                                            placeholder="Alert when CPU usage is high"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium">Metric</label>
                                            <Select value={newRule.metric} onValueChange={(value) => setNewRule({ ...newRule, metric: value })}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="cpu_usage">CPU Usage</SelectItem>
                                                    <SelectItem value="memory_usage">Memory Usage</SelectItem>
                                                    <SelectItem value="disk_usage">Disk Usage</SelectItem>
                                                    <SelectItem value="error_rate">Error Rate</SelectItem>
                                                    <SelectItem value="response_time">Response Time</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">Condition</label>
                                            <Select value={newRule.condition} onValueChange={(value: any) => setNewRule({ ...newRule, condition: value })}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="gt">Greater Than</SelectItem>
                                                    <SelectItem value="lt">Less Than</SelectItem>
                                                    <SelectItem value="eq">Equals</SelectItem>
                                                    <SelectItem value="gte">Greater Than or Equal</SelectItem>
                                                    <SelectItem value="lte">Less Than or Equal</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium">Threshold</label>
                                            <Input
                                                type="number"
                                                value={newRule.threshold}
                                                onChange={(e) => setNewRule({ ...newRule, threshold: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">Duration (minutes)</label>
                                            <Input
                                                type="number"
                                                value={newRule.duration}
                                                onChange={(e) => setNewRule({ ...newRule, duration: parseInt(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Severity</label>
                                        <Select value={newRule.severity} onValueChange={(value: any) => setNewRule({ ...newRule, severity: value })}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="low">Low</SelectItem>
                                                <SelectItem value="medium">Medium</SelectItem>
                                                <SelectItem value="high">High</SelectItem>
                                                <SelectItem value="critical">Critical</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Notifications</label>
                                        <div className="space-y-2">
                                            <div className="flex items-center space-x-2">
                                                <Switch
                                                    checked={newRule.notifications?.dashboard}
                                                    onCheckedChange={(checked) => setNewRule({
                                                        ...newRule,
                                                        notifications: { ...newRule.notifications!, dashboard: checked }
                                                    })}
                                                />
                                                <label className="text-sm">Dashboard</label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Switch
                                                    checked={newRule.notifications?.email}
                                                    onCheckedChange={(checked) => setNewRule({
                                                        ...newRule,
                                                        notifications: { ...newRule.notifications!, email: checked }
                                                    })}
                                                />
                                                <label className="text-sm">Email</label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Switch
                                                    checked={newRule.notifications?.slack}
                                                    onCheckedChange={(checked) => setNewRule({
                                                        ...newRule,
                                                        notifications: { ...newRule.notifications!, slack: checked }
                                                    })}
                                                />
                                                <label className="text-sm">Slack</label>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-end space-x-2">
                                        <Button variant="outline" onClick={() => setRuleDialogOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button onClick={handleCreateRule}>
                                            {editingRule ? 'Update' : 'Create'} Rule
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="grid gap-4">
                        {rules.map((rule) => (
                            <Card key={rule.id}>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <Bell className="h-5 w-5" />
                                            <div>
                                                <CardTitle className="text-lg">{rule.name}</CardTitle>
                                                <CardDescription>{rule.description}</CardDescription>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Badge className={getSeverityColor(rule.severity)}>
                                                {rule.severity}
                                            </Badge>
                                            <Switch
                                                checked={rule.enabled}
                                                onCheckedChange={(checked) => handleToggleRule(rule.id, checked)}
                                            />
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div>
                                            <span className="text-muted-foreground">Metric:</span>
                                            <p className="font-medium">{rule.metric}</p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Condition:</span>
                                            <p className="font-medium">{rule.condition} {rule.threshold}</p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Duration:</span>
                                            <p className="font-medium">{rule.duration} minutes</p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Notifications:</span>
                                            <div className="flex space-x-1 mt-1">
                                                {rule.notifications.dashboard && <Badge variant="outline" className="text-xs">Dashboard</Badge>}
                                                {rule.notifications.email && <Badge variant="outline" className="text-xs">Email</Badge>}
                                                {rule.notifications.slack && <Badge variant="outline" className="text-xs">Slack</Badge>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-end space-x-2 mt-4">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setEditingRule(rule);
                                                setNewRule(rule);
                                                setRuleDialogOpen(true);
                                            }}
                                        >
                                            <Edit className="h-4 w-4 mr-2" />
                                            Edit
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDeleteRule(rule.id)}
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                    <div>
                        <h3 className="text-lg font-semibold">Alert History</h3>
                        <p className="text-sm text-muted-foreground">
                            Recent alerts and their status
                        </p>
                    </div>
                    <ScrollArea className="h-96">
                        <div className="space-y-2">
                            {alertHistory.map((alert) => (
                                <Card key={alert.id}>
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <Badge className={getSeverityColor(alert.severity)}>
                                                    {alert.severity}
                                                </Badge>
                                                <Badge className={getStatusColor(alert.status)}>
                                                    {alert.status}
                                                </Badge>
                                                <div>
                                                    <p className="font-medium">{alert.rule_name}</p>
                                                    <p className="text-sm text-muted-foreground">{alert.message}</p>
                                                </div>
                                            </div>
                                            <div className="text-right text-sm text-muted-foreground">
                                                <p>{new Date(alert.triggered_at).toLocaleString()}</p>
                                                <p>Value: {alert.metric_value} (Threshold: {alert.threshold})</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </ScrollArea>
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Notification Settings</CardTitle>
                            <CardDescription>
                                Configure global notification preferences
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium">Email Notifications</p>
                                        <p className="text-sm text-muted-foreground">Send alerts via email</p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium">Slack Integration</p>
                                        <p className="text-sm text-muted-foreground">Send alerts to Slack channels</p>
                                    </div>
                                    <Switch />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium">Webhook Notifications</p>
                                        <p className="text-sm text-muted-foreground">Send alerts to external webhooks</p>
                                    </div>
                                    <Switch />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium">Dashboard Notifications</p>
                                        <p className="text-sm text-muted-foreground">Show alerts in dashboard</p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}