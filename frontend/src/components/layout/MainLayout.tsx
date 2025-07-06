import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import {
  Menu,
  LayoutDashboard,
  ShoppingCart,
  Users,
  Settings,
  X
} from 'lucide-react';

import NotificationCenter from '@/components/monitoring/NotificationCenter';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const router = useRouter();

  const menuItems = [
    { text: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" />, path: '/dashboard' },
    { text: 'Products', icon: <ShoppingCart className="h-5 w-5" />, path: '/products' },
    { text: 'Customers', icon: <Users className="h-5 w-5" />, path: '/customers' },
    { text: 'Settings', icon: <Settings className="h-5 w-5" />, path: '/settings' },
  ];

  const handleMenuItemClick = (path: string) => {
    router.push(path);
    setDrawerOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDrawerOpen(true)}
              className="p-2"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold text-gray-900">
              Conversational Commerce
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            <NotificationCenter />
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="w-80">
          <DrawerHeader className="flex items-center justify-between">
            <DrawerTitle>Navigation</DrawerTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDrawerOpen(false)}
              className="p-1"
            >
              <X className="h-4 w-4" />
            </Button>
          </DrawerHeader>
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {menuItems.map((item) => (
                <li key={item.text}>
                  <Button
                    variant="ghost"
                    onClick={() => handleMenuItemClick(item.path)}
                    className="w-full justify-start space-x-3 p-3 h-auto"
                  >
                    {item.icon}
                    <span>{item.text}</span>
                  </Button>
                </li>
              ))}
            </ul>
          </nav>
        </DrawerContent>
      </Drawer>

      {/* Main Content */}
      <main className="pt-16 px-4 py-6">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
