import React, { useEffect, useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    IconButton,
    Badge,
    Drawer,
    Divider,
    Chip,
} from '@mui/material';
import {
    Notifications as NotificationsIcon,
    Close as CloseIcon,
    Warning as WarningIcon,
    Error as ErrorIcon,
    Info as InfoIcon,
    CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import { useWebSocket } from '../../hooks/useWebSocket';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
    id: string;
    title: string;
    message: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    created_at: string;
    metadata: Record<string, any>;
}

const NotificationCenter: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // WebSocket connection
    const { lastMessage } = useWebSocket(
        `${process.env.REACT_APP_WS_URL}/ws/monitoring/${localStorage.getItem('tenant_id')}`
    );

    useEffect(() => {
        if (lastMessage) {
            const data = JSON.parse(lastMessage.data);
            if (data.type === 'notification') {
                setNotifications(prev => [data.data, ...prev]);
                setUnreadCount(prev => prev + 1);
            }
        }
    }, [lastMessage]);

    const handleClose = (notificationId: string) => {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
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
            <IconButton
                color="inherit"
                onClick={() => setIsOpen(true)}
                sx={{ position: 'relative' }}
            >
                <Badge badgeContent={unreadCount} color="error">
                    <NotificationsIcon />
                </Badge>
            </IconButton>

            <Drawer
                anchor="right"
                open={isOpen}
                onClose={() => setIsOpen(false)}
                PaperProps={{
                    sx: { width: 400 }
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
                                mb: 1
                            }}
                        >
                            <ListItemIcon>
                                {getPriorityIcon(notification.priority)}
                            </ListItemIcon>
                            <ListItemText
                                primary={
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="subtitle1">
                                            {notification.title}
                                        </Typography>
                                        <IconButton
                                            size="small"
                                            onClick={() => handleClose(notification.id)}
                                        >
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
                                        <Typography
                                            component="span"
                                            variant="caption"
                                            color="text.secondary"
                                        >
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
                                                {key}: {value}
                                            </Typography>
                                        ))}
                                    </>
                                }
                            />
                        </ListItem>
                    ))}
                    {notifications.length === 0 && (
                        <ListItem>
                            <ListItemText
                                primary="No notifications"
                                secondary="You're all caught up!"
                            />
                        </ListItem>
                    )}
                </List>
            </Drawer>
        </>
    );
};

export default NotificationCenter;