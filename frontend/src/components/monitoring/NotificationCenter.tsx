import SuccessIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import NotificationsIcon from '@mui/icons-material/Notifications';
import WarningIcon from '@mui/icons-material/Warning';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import { formatDistanceToNow } from 'date-fns';
import React, { useEffect, useState } from 'react';

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
        return <ErrorIcon color="error" />;
      case 'high':
        return <WarningIcon color="warning" />;
      case 'medium':
        return <InfoIcon color="info" />;
      case 'low':
        return <SuccessIcon color="success" />;
      default:
        return <InfoIcon />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <>
      <IconButton color="inherit" onClick={() => setIsOpen(true)} sx={{ position: 'relative' }}>
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Drawer
        anchor="right"
        open={isOpen}
        onClose={() => setIsOpen(false)}
        PaperProps={{
          sx: { width: 400 },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Notifications</Typography>
          {unreadCount > 0 && (
            <Chip
              label={`${unreadCount} unread`}
              color="primary"
              size="small"
              onClick={handleMarkAllRead}
            />
          )}
        </Box>
        <Divider />
        <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
          {notifications.map((notification) => (
            <ListItem
              key={notification.id}
              alignItems="flex-start"
              sx={{
                borderLeft: 4,
                borderColor: `${getPriorityColor(notification.priority)}.main`,
                mb: 1,
              }}
            >
              <ListItemIcon>{getPriorityIcon(notification.priority)}</ListItemIcon>
              <ListItemText
                primary={
                  <Box
                    sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <Typography variant="subtitle1">{notification.title}</Typography>
                    <IconButton size="small" onClick={() => handleClose(notification.id)}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                }
                secondary={
                  <>
                    <Typography
                      component="span"
                      variant="body2"
                      color="text.primary"
                      sx={{ display: 'block', mb: 1 }}
                    >
                      {notification.message}
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                      {String(notification.metadata['source'] ?? 'system')}
                    </Typography>
                    <Typography component="span" variant="caption" color="text.secondary">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </Typography>
                    {Object.entries(notification.metadata).map(([key, value]) => (
                      <Typography
                        key={key}
                        component="span"
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block' }}
                      >
                        {key}: {String(value)}
                      </Typography>
                    ))}
                  </>
                }
              />
            </ListItem>
          ))}
          {notifications.length === 0 && (
            <ListItem>
              <ListItemText primary="No notifications" secondary="You're all caught up!" />
            </ListItem>
          )}
        </List>
      </Drawer>
    </>
  );
};

export default NotificationCenter;
