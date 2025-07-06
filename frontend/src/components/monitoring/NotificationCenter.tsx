import React, { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import {
  Bell,
  X,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  Clock
} from 'lucide-react';

import { useWebSocket } from '@/hooks/useWebSocket';

type NotificationPayload = {
  id: string;
  message: string;
  severity: string;
  timestamp: string;
  [key: string]: unknown;
};

function isNotification(payload: unknown): payload is NotificationPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'id' in payload &&
    'message' in payload &&
    'severity' in payload &&
    'timestamp' in payload
  );
}

interface Notification {
  id: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  timestamp: string;
  read: boolean;
  metadata: Record<string, unknown>;
}

const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const [tenantId, setTenantId] = useState<string>('');

  // Get tenant ID from localStorage (client-side only)
  useEffect(() => {
    setTenantId(localStorage.getItem('tenant_id') ?? '');
  }, []);

  // WebSocket connection - only establish when tenantId is available
  const { lastMessage } = useWebSocket(
    tenantId
      ? `${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8080'}/ws/monitoring/${tenantId}`
      : '',
  );

  useEffect(() => {
    if (lastMessage && isNotification(lastMessage.payload)) {
      const { payload } = lastMessage;
      const newNotification: Notification = {
        id: payload.id,
        title: `New alert: ${payload.message}`,
        message: payload.message,
        priority: mapSeverityToPriority(payload.severity),
        created_at: payload.timestamp,
        timestamp: payload.timestamp,
        read: false,
        metadata: { source: 'websocket' },
      };
      setNotifications((prev) => [newNotification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    }
  }, [lastMessage]);

  // Helper function to map severity to priority
  const mapSeverityToPriority = (
    severity: NotificationPayload['severity'],
  ): Notification['priority'] => {
    switch (severity) {
      case 'error':
        return 'urgent';
      case 'warning':
        return 'high';
      case 'info':
        return 'medium';
      case 'success':
        return 'low';
      default:
        return 'medium';
    }
  };

  const handleClose = (notificationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  };

  const handleMarkAllRead = () => {
    setUnreadCount(0);
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'low':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityBorderColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500';
      case 'high':
        return 'border-l-orange-500';
      case 'medium':
        return 'border-l-blue-500';
      case 'low':
        return 'border-l-green-500';
      default:
        return 'border-l-gray-500';
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="relative p-2"
      >
        <div className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </div>
      </Button>

      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerContent className="h-[80vh] max-w-md mx-auto">
          <DrawerHeader className="flex items-center justify-between">
            <DrawerTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Notifications</span>
            </DrawerTitle>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllRead}
                className="text-xs"
              >
                Mark all read ({unreadCount})
              </Button>
            )}
          </DrawerHeader>

          <Separator />

          <div className="flex-1 overflow-y-auto p-4">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                <Bell className="h-12 w-12 text-gray-300" />
                <div>
                  <h3 className="font-medium text-gray-900">No notifications</h3>
                  <p className="text-sm text-gray-500">You're all caught up!</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border border-gray-200 rounded-lg border-l-4 ${getPriorityBorderColor(notification.priority)} bg-white shadow-sm`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        {getPriorityIcon(notification.priority)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {notification.title}
                            </h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleClose(notification.id)}
                              className="p-1 h-6 w-6"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>

                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>

                          <div className="flex items-center justify-between mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {String(notification.metadata['source'] ?? 'system')}
                            </Badge>

                            <div className="flex items-center space-x-1 text-xs text-gray-500">
                              <Clock className="h-3 w-3" />
                              <span>
                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                              </span>
                            </div>
                          </div>

                          {/* Additional metadata */}
                          {Object.entries(notification.metadata).length > 1 && (
                            <div className="mt-2 space-y-1">
                              {Object.entries(notification.metadata)
                                .filter(([key]) => key !== 'source')
                                .map(([key, value]) => (
                                  <div key={key} className="text-xs text-gray-500">
                                    <span className="font-medium">{key}:</span> {String(value)}
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default NotificationCenter;
