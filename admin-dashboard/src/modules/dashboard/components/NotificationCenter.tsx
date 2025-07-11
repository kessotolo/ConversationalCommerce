'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Bell,
    AlertTriangle,
    Info,
    CheckCircle,
    X,
    Settings,
    Shield,
    Activity,
    TrendingUp,
    RefreshCw
} from 'lucide-react';

interface NotificationCenterProps {
    open: boolean;
    onClose: () => void;
}

interface Notification {
    id: string;
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    category: string;
    actionUrl?: string;
    metadata?: Record<string, unknown>;
}

export function NotificationCenter({ open, onClose }: NotificationCenterProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchNotifications = useCallback(async () => {
        try {
            setError(null);
            const response = await fetch('/api/admin/notifications');
            if (response.ok) {
                const data: Notification[] = await response.json();
                setNotifications(data);
            } else {
                throw new Error(`Failed to fetch notifications: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
            setError(error instanceof Error ? error.message : 'Failed to load notifications');

            // Fallback to mock data for development
            const mockNotifications: Notification[] = [
                {
                    id: '1',
                    type: 'error',
                    title: 'Security Alert',
                    message: 'Multiple failed login attempts detected from IP 192.168.1.100',
                    timestamp: '2 minutes ago',
                    read: false,
                    category: 'security',
                    actionUrl: '/admin/security/alerts',
                    metadata: { ip: '192.168.1.100', attempts: 5 }
                },
                {
                    id: '2',
                    type: 'warning',
                    title: 'System Performance',
                    message: 'API response time has increased by 15% in the last hour',
                    timestamp: '15 minutes ago',
                    read: false,
                    category: 'performance',
                    actionUrl: '/admin/system/performance'
                },
                {
                    id: '3',
                    type: 'info',
                    title: 'New Tenant Registration',
                    message: 'TechCorp has successfully registered as a new tenant',
                    timestamp: '1 hour ago',
                    read: true,
                    category: 'business',
                    actionUrl: '/admin/tenants/new'
                },
                {
                    id: '4',
                    type: 'success',
                    title: 'Backup Completed',
                    message: 'Daily database backup has been completed successfully',
                    timestamp: '3 hours ago',
                    read: true,
                    category: 'system'
                },
                {
                    id: '5',
                    type: 'warning',
                    title: 'Storage Usage',
                    message: 'File storage is at 85% capacity. Consider adding more storage.',
                    timestamp: '6 hours ago',
                    read: false,
                    category: 'system',
                    actionUrl: '/admin/system/storage'
                }
            ];
            setNotifications(mockNotifications);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (open) {
            fetchNotifications();
        }
    }, [open, fetchNotifications]);

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'error':
                return <AlertTriangle className="h-4 w-4 text-red-600" aria-hidden="true" />;
            case 'warning':
                return <AlertTriangle className="h-4 w-4 text-yellow-600" aria-hidden="true" />;
            case 'success':
                return <CheckCircle className="h-4 w-4 text-green-600" aria-hidden="true" />;
            default:
                return <Info className="h-4 w-4 text-blue-600" aria-hidden="true" />;
        }
    };

    const getNotificationColor = (type: string) => {
        switch (type) {
            case 'error':
                return 'border-red-200 bg-red-50';
            case 'warning':
                return 'border-yellow-200 bg-yellow-50';
            case 'success':
                return 'border-green-200 bg-green-50';
            default:
                return 'border-blue-200 bg-blue-50';
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'security':
                return <Shield className="h-3 w-3" aria-hidden="true" />;
            case 'business':
                return <TrendingUp className="h-3 w-3" aria-hidden="true" />;
            case 'performance':
                return <Activity className="h-3 w-3" aria-hidden="true" />;
            case 'system':
                return <Settings className="h-3 w-3" aria-hidden="true" />;
            default:
                return <Bell className="h-3 w-3" aria-hidden="true" />;
        }
    };

    const markAsRead = async (id: string) => {
        try {
            const response = await fetch(`/api/admin/notifications/${id}/read`, {
                method: 'PATCH'
            });

            if (response.ok) {
                setNotifications(prev =>
                    prev.map(notification =>
                        notification.id === id ? { ...notification, read: true } : notification
                    )
                );
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
            // Fallback to local state update
            setNotifications(prev =>
                prev.map(notification =>
                    notification.id === id ? { ...notification, read: true } : notification
                )
            );
        }
    };

    const markAllAsRead = async () => {
        try {
            const response = await fetch('/api/admin/notifications/read-all', {
                method: 'PATCH'
            });

            if (response.ok) {
                setNotifications(prev =>
                    prev.map(notification => ({ ...notification, read: true }))
                );
            }
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            // Fallback to local state update
            setNotifications(prev =>
                prev.map(notification => ({ ...notification, read: true }))
            );
        }
    };

    const deleteNotification = async (id: string) => {
        try {
            const response = await fetch(`/api/admin/notifications/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setNotifications(prev => prev.filter(notification => notification.id !== id));
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
            // Fallback to local state update
            setNotifications(prev => prev.filter(notification => notification.id !== id));
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchNotifications();
        setRefreshing(false);
    };

    const handleNotificationAction = (notification: Notification) => {
        if (notification.actionUrl) {
            window.open(notification.actionUrl, '_blank');
        }
        if (!notification.read) {
            markAsRead(notification.id);
        }
    };

    const filteredNotifications = notifications.filter(notification => {
        if (filter === 'all') return true;
        if (filter === 'unread') return !notification.read;
        return notification.category === filter;
    });

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle>
                            <div className="flex items-center space-x-2">
                                <Bell className="h-5 w-5" aria-hidden="true" />
                                <span>Notification Center</span>
                                {unreadCount > 0 && (
                                    <Badge variant="destructive" className="h-5 w-5 p-0 text-xs">
                                        {unreadCount}
                                    </Badge>
                                )}
                            </div>
                        </DialogTitle>
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRefresh}
                                disabled={refreshing}
                                aria-label="Refresh notifications"
                            >
                                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={markAllAsRead}
                                aria-label="Mark all as read"
                            >
                                Mark All Read
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                {/* Error Display */}
                {error && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <Tabs value={filter} onValueChange={setFilter} className="w-full">
                    <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="unread">Unread</TabsTrigger>
                        <TabsTrigger value="security">Security</TabsTrigger>
                        <TabsTrigger value="system">System</TabsTrigger>
                        <TabsTrigger value="business">Business</TabsTrigger>
                    </TabsList>

                    <TabsContent value={filter} className="mt-4">
                        {loading ? (
                            <div className="text-center py-8">
                                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" aria-hidden="true" />
                                <p className="text-sm text-muted-foreground">Loading notifications...</p>
                            </div>
                        ) : filteredNotifications.length === 0 ? (
                            <div className="text-center py-8">
                                <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" aria-hidden="true" />
                                <p className="text-sm text-muted-foreground">No notifications found</p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {filteredNotifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`flex items-start space-x-3 p-3 rounded-lg border ${getNotificationColor(notification.type)} ${!notification.read ? 'ring-2 ring-blue-200' : ''}`}
                                        role="article"
                                        aria-label={`Notification: ${notification.title}`}
                                    >
                                        <div className="flex-shrink-0">
                                            {getNotificationIcon(notification.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-sm font-medium text-gray-900 truncate">
                                                    {notification.title}
                                                </h4>
                                                <div className="flex items-center space-x-2">
                                                    <Badge variant="outline" className="text-xs">
                                                        {getCategoryIcon(notification.category)}
                                                        <span className="ml-1">{notification.category}</span>
                                                    </Badge>
                                                    <span className="text-xs text-muted-foreground">
                                                        {notification.timestamp}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                                {notification.message}
                                            </p>
                                            {notification.metadata && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {Object.entries(notification.metadata).slice(0, 3).map(([key, value]) => (
                                                        <Badge key={key} variant="outline" className="text-xs">
                                                            {key}: {String(value)}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col space-y-1">
                                            {notification.actionUrl && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleNotificationAction(notification)}
                                                    className="h-6 w-6 p-0"
                                                    aria-label="Take action"
                                                >
                                                    <Settings className="h-3 w-3" aria-hidden="true" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => deleteNotification(notification.id)}
                                                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                                aria-label="Delete notification"
                                            >
                                                <X className="h-3 w-3" aria-hidden="true" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

                {/* Notification Count */}
                {filteredNotifications.length > 0 && (
                    <div className="text-center text-sm text-muted-foreground mt-4">
                        Showing {filteredNotifications.length} of {notifications.length} notifications
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}