'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Bell,
    AlertTriangle,
    Info,
    CheckCircle,
    X,
    Clock,
    Settings,
    Shield,
    /* Users, */
    Activity,
    TrendingUp
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
    metadata?: Record<string, any>;
}

export function NotificationCenter({ open, onClose }: NotificationCenterProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);

    // Mock notifications data
    useEffect(() => {
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
        setLoading(false);
    }, []);

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'error':
                return <AlertTriangle className="h-4 w-4 text-red-600" />;
            case 'warning':
                return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
            case 'success':
                return <CheckCircle className="h-4 w-4 text-green-600" />;
            default:
                return <Info className="h-4 w-4 text-blue-600" />;
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
                return <Shield className="h-3 w-3" />;
            case 'business':
                return <TrendingUp className="h-3 w-3" />;
            case 'performance':
                return <Activity className="h-3 w-3" />;
            case 'system':
                return <Settings className="h-3 w-3" />;
            default:
                return <Bell className="h-3 w-3" />;
        }
    };

    const markAsRead = (id: string) => {
        setNotifications(prev =>
            prev.map(notification =>
                notification.id === id ? { ...notification, read: true } : notification
            )
        );
    };

    const markAllAsRead = () => {
        setNotifications(prev =>
            prev.map(notification => ({ ...notification, read: true }))
        );
    };

    const deleteNotification = (id: string) => {
        setNotifications(prev => prev.filter(notification => notification.id !== id));
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
                                <Bell className="h-5 w-5" />
                                <span>Notification Center</span>
                                {unreadCount > 0 && (
                                    <Badge variant="destructive" className="h-5 w-5 p-0 text-xs">
                                        {unreadCount}
                                    </Badge>
                                )}
                            </div>
                        </DialogTitle>
                        <Button variant="outline" size="sm" onClick={markAllAsRead}>
                            Mark All Read
                        </Button>
                    </div>
                </DialogHeader>

                <Tabs value={filter} onValueChange={setFilter} className="w-full">
                    <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="unread">Unread</TabsTrigger>
                        <TabsTrigger value="security">Security</TabsTrigger>
                        <TabsTrigger value="system">System</TabsTrigger>
                        <TabsTrigger value="business">Business</TabsTrigger>
                    </TabsList>

                    <TabsContent value={filter}>
                        <div className="space-y-2 max-h-96 overflow-auto">
                            {loading ? (
                                <div className="text-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                                    <p className="text-sm text-muted-foreground mt-2">Loading notifications...</p>
                                </div>
                            ) : filteredNotifications.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Bell className="h-8 w-8 mx-auto mb-2" />
                                    <p>No notifications found</p>
                                    <p className="text-sm">You're all caught up!</p>
                                </div>
                            ) : (
                                filteredNotifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`p-4 rounded-lg border transition-colors ${notification.read ? 'bg-muted/20' : getNotificationColor(notification.type)
                                            } ${!notification.read ? 'border-l-4' : ''}`}
                                    >
                                        <div className="flex items-start space-x-3">
                                            <div className="p-1 rounded-full bg-white">
                                                {getNotificationIcon(notification.type)}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-sm font-medium text-foreground">
                                                        {notification.title}
                                                    </h4>
                                                    <div className="flex items-center space-x-2">
                                                        <Badge variant="outline">
                                                            <span className="flex items-center text-xs">
                                                                {getCategoryIcon(notification.category)}
                                                                <span className="ml-1">{notification.category}</span>
                                                            </span>
                                                        </Badge>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => deleteNotification(notification.id)}
                                                            className="h-6 w-6 p-0"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {notification.message}
                                                </p>

                                                <div className="flex items-center justify-between mt-2">
                                                    <div className="flex items-center space-x-2">
                                                        <Clock className="h-3 w-3 text-muted-foreground" />
                                                        <span className="text-xs text-muted-foreground">
                                                            {notification.timestamp}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center space-x-2">
                                                        {!notification.read && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => markAsRead(notification.id)}
                                                                className="text-xs"
                                                            >
                                                                Mark as Read
                                                            </Button>
                                                        )}
                                                        {notification.actionUrl && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => window.open(notification.actionUrl, '_blank')}
                                                                className="text-xs"
                                                            >
                                                                View Details
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>

                                                {notification.metadata && (
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {Object.entries(notification.metadata).map(([key, value]) => (
                                                            <Badge key={key} variant="outline" className="text-xs">
                                                                {key}: {String(value)}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Notification Settings */}
                <div className="flex items-center justify-between pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                        Showing {filteredNotifications.length} of {notifications.length} notifications
                    </p>
                    <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4 mr-2" />
                        Notification Settings
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}