import React from 'react';
import { Box, AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { Menu as MenuIcon, Dashboard, ShoppingCart, People, Settings } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import NotificationCenter from '../monitoring/NotificationCenter';

interface MainLayoutProps {
    children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const [drawerOpen, setDrawerOpen] = React.useState(false);
    const router = useRouter();

    const menuItems = [
        { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
        { text: 'Products', icon: <ShoppingCart />, path: '/products' },
        { text: 'Customers', icon: <People />, path: '/customers' },
        { text: 'Settings', icon: <Settings />, path: '/settings' },
    ];

    return (
        <Box sx={{ display: 'flex' }}>
            <AppBar position="fixed">
                <Toolbar>
                    <IconButton
                        color="inherit"
                        edge="start"
                        onClick={() => setDrawerOpen(true)}
                        sx={{ mr: 2 }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        Conversational Commerce
                    </Typography>
                    <NotificationCenter />
                </Toolbar>
            </AppBar>
            <Drawer
                anchor="left"
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
            >
                <Box
                    sx={{ width: 250 }}
                    role="presentation"
                    onClick={() => setDrawerOpen(false)}
                >
                    <List>
                        {menuItems.map((item) => (
                            <ListItem
                                button
                                key={item.text}
                                onClick={() => router.push(item.path)}
                            >
                                <ListItemIcon>{item.icon}</ListItemIcon>
                                <ListItemText primary={item.text} />
                            </ListItem>
                        ))}
                    </List>
                </Box>
            </Drawer>
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    mt: 8,
                    backgroundColor: 'background.default',
                    minHeight: '100vh',
                }}
            >
                {children}
            </Box>
        </Box>
    );
};

export default MainLayout;