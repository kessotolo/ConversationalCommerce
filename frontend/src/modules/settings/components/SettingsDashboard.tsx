import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import type { Route } from 'next';
import { Home, Menu, CreditCard, Truck, Bell, Link2, ShoppingBag } from 'lucide-react';
import { SettingsService } from '../services/SettingsService';
import { SettingsDomain } from '../models/settings';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface NavItemProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  path: string;
  isActive: boolean;
  onClose?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon: Icon, title, path, isActive, onClose }) => {
  const navigate = useRouter();

  const handleClick = () => {
    navigate.push(path as Route);
    if (onClose) onClose();
  };

  return (
    <div
      className={cn(
        "flex items-center px-4 py-3 cursor-pointer font-semibold transition-all duration-150 rounded-md group",
        isActive
          ? "text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900"
          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
      )}
      onClick={handleClick}
    >
      <Icon
        className={cn(
          "mr-3 h-4 w-4 transition-colors",
          isActive
            ? "text-blue-600 dark:text-blue-300"
            : "text-gray-500 dark:text-gray-400 group-hover:text-blue-600"
        )}
      />
      <span>{title}</span>
    </div>
  );
};

// Map domain names to icons
const getDomainIcon = (domainName: string): React.ComponentType<{ className?: string }> => {
  switch (domainName.toLowerCase()) {
    case 'store':
      return ShoppingBag;
    case 'payment':
      return CreditCard;
    case 'shipping':
      return Truck;
    case 'notifications':
      return Bell;
    case 'integrations':
      return Link2;
    default:
      return Home;
  }
};

const SettingsDashboard: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = usePathname();
  const navigate = useRouter();
  const [domains, setDomains] = useState<SettingsDomain[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const settingsService = new SettingsService();

  // Get the current domain from the URL
  const currentPath = location;
  const pathParts = currentPath.split('/');
  const currentDomain = pathParts[pathParts.length - 1];

  // Load settings domains
  useEffect(() => {
    const fetchDomains = async () => {
      try {
        setIsLoading(true);
        const domainsData = await settingsService.getDomains();
        setDomains(domainsData);

        // Redirect to first domain if no specific domain in URL
        if (domainsData.length > 0 && !currentDomain) {
          navigate.push(`/settings/${domainsData[0]?.name}` as Route);
        }
      } catch (error) {
        console.error('Failed to fetch domains:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDomains();
  }, [navigate, currentDomain]);

  // Get current domain name for breadcrumb
  const currentDomainName = domains.find(domain =>
    domain.name === currentDomain
  )?.description || 'Settings';

  const Sidebar = (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold mb-2 mt-4 px-4">
        Settings
      </h3>
      <Separator />
      {domains.map((domain) => (
        <NavItem
          key={domain.id}
          icon={getDomainIcon(domain.name)}
          title={domain.description || domain.name}
          path={`/settings/${domain.name}`}
          isActive={currentDomain === domain.name}
          onClose={() => setIsOpen(false)}
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800">
      {/* Mobile Header */}
      <div className="block md:hidden p-4">
        <div className="flex items-center">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsOpen(true)}
            className="mr-2"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">Settings</h1>
        </div>
      </div>

      {/* Mobile Drawer */}
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerContent className="h-[80vh]">
          <DrawerHeader>
            <DrawerTitle>Settings</DrawerTitle>
            <DrawerClose />
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-y-auto">
            {Sidebar}
          </div>
        </DrawerContent>
      </Drawer>

      <div className="flex">
        {/* Desktop Sidebar */}
        <div className="hidden md:block w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 h-screen fixed overflow-y-auto">
          {Sidebar}
        </div>

        {/* Main Content */}
        <div className="md:ml-64 flex-1 min-h-screen">
          <div className="p-4 md:p-8">
            <div className="max-w-7xl mx-auto p-2 md:p-4">
              {/* Breadcrumb */}
              <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-6">
                <Link
                  href={"/settings" as Route}
                  className="hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Settings
                </Link>
                <span>/</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {currentDomainName}
                </span>
              </nav>

              {/* Outlet for nested routes */}
              {/* This component is now managed by Next.js routing */}
              {/* The Outlet component is no longer needed here */}
              {/* The actual content of the nested route will be rendered here */}
              {/* For now, we'll just show a placeholder or a simple message */}
              <p>Settings for {currentDomainName} will be displayed here.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsDashboard;
