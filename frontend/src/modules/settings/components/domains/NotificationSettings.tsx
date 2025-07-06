import React, { useState, useEffect } from 'react';
import { SettingsService } from '../../services/SettingsService';
import SettingsForm from '../SettingsForm';
import { Setting } from '../../models/settings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// NotificationType interface
interface NotificationType {
  id: string;
  name: string;
  description: string;
  channels: {
    email: boolean;
    sms: boolean;
    push: boolean;
    inApp: boolean;
  };
  category: 'orders' | 'customers' | 'products' | 'system' | 'marketing';
}

const NotificationSettings: React.FC = () => {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notificationTypes, setNotificationTypes] = useState<NotificationType[]>([]);

  // Group settings by category for better organization
  const generalSettings = settings.filter(s => s.key.startsWith('notifications.general'));
  const emailSettings = settings.filter(s => s.key.startsWith('notifications.channels.email'));
  const smsSettings = settings.filter(s => s.key.startsWith('notifications.channels.sms'));
  const pushSettings = settings.filter(s => s.key.startsWith('notifications.channels.push'));
  const templateSettings = settings.filter(s => s.key.startsWith('notifications.templates'));

  // Load notification settings
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const notificationSettingsDomain = await new SettingsService().getDomainByNameWithSettings('notifications');
        setSettings(notificationSettingsDomain.settings);

        // In a real implementation, you would load notification types from the API
        // For this example, we'll use dummy data
        setNotificationTypes([
          {
            id: '1',
            name: 'Order Placed',
            description: 'Send notification when a new order is placed',
            channels: { email: true, sms: true, push: true, inApp: true },
            category: 'orders'
          },
          {
            id: '2',
            name: 'Order Shipped',
            description: 'Send notification when order is shipped',
            channels: { email: true, sms: true, push: true, inApp: true },
            category: 'orders'
          },
          {
            id: '3',
            name: 'Order Delivered',
            description: 'Send notification when order is delivered',
            channels: { email: true, sms: false, push: true, inApp: true },
            category: 'orders'
          },
          {
            id: '4',
            name: 'Customer Registration',
            description: 'Send notification when a new customer registers',
            channels: { email: true, sms: false, push: false, inApp: false },
            category: 'customers'
          },
          {
            id: '5',
            name: 'Product Low Stock',
            description: 'Send notification when product stock is low',
            channels: { email: true, sms: false, push: true, inApp: true },
            category: 'products'
          },
          {
            id: '6',
            name: 'System Backup',
            description: 'Send notification when system backup completes',
            channels: { email: true, sms: false, push: false, inApp: false },
            category: 'system'
          },
          {
            id: '7',
            name: 'Marketing Campaign',
            description: 'Send notification when marketing campaign is completed',
            channels: { email: true, sms: false, push: true, inApp: true },
            category: 'marketing'
          },
        ]);
      } catch (err) {
        console.error('Failed to load notification settings:', err);
        setError('Failed to load notification settings. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Toggle notification channel
  const toggleNotificationChannel = (notificationId: string, channel: keyof NotificationType['channels']) => {
    setNotificationTypes(types =>
      types.map(type =>
        type.id === notificationId
          ? {
            ...type,
            channels: {
              ...type.channels,
              [channel]: !type.channels[channel]
            }
          }
          : type
      )
    );
  };

  // Filter notification types by category
  const getNotificationsByCategory = (category: NotificationType['category']) => {
    return notificationTypes.filter(type => type.category === category);
  };

  // Render notification type controls
  const renderNotificationTypeCard = (notificationType: NotificationType) => {
    const getCategoryBadgeColor = (category: string) => {
      switch (category) {
        case 'orders':
          return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'customers':
          return 'bg-green-100 text-green-800 border-green-200';
        case 'products':
          return 'bg-purple-100 text-purple-800 border-purple-200';
        case 'system':
          return 'bg-red-100 text-red-800 border-red-200';
        case 'marketing':
          return 'bg-orange-100 text-orange-800 border-orange-200';
        default:
          return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    };

    return (
      <Card key={notificationType.id} className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{notificationType.name}</CardTitle>
              <p className="text-sm text-gray-500 mt-1">{notificationType.description}</p>
            </div>
            <Badge className={cn("text-xs", getCategoryBadgeColor(notificationType.category))}>
              {notificationType.category.charAt(0).toUpperCase() + notificationType.category.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium">Email</span>
              <Switch
                checked={notificationType.channels.email}
                onCheckedChange={() => toggleNotificationChannel(notificationType.id, 'email')}
              />
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium">SMS</span>
              <Switch
                checked={notificationType.channels.sms}
                onCheckedChange={() => toggleNotificationChannel(notificationType.id, 'sms')}
              />
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium">Push</span>
              <Switch
                checked={notificationType.channels.push}
                onCheckedChange={() => toggleNotificationChannel(notificationType.id, 'push')}
              />
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium">In-App</span>
              <Switch
                checked={notificationType.channels.inApp}
                onCheckedChange={() => toggleNotificationChannel(notificationType.id, 'inApp')}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Notification Settings</h1>
        <p className="text-gray-600">Configure how and when notifications are sent.</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="sms">SMS</TabsTrigger>
          <TabsTrigger value="push">Push</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="types">Types</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <SettingsForm
            domainName="notifications"
            settings={generalSettings}
            title="General Notification Settings"
            description="Configure general notification preferences and behavior."
          />
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          <SettingsForm
            domainName="notifications"
            settings={emailSettings}
            title="Email Configuration"
            description="Configure email notification settings and SMTP details."
          />
        </TabsContent>

        <TabsContent value="sms" className="space-y-4">
          <SettingsForm
            domainName="notifications"
            settings={smsSettings}
            title="SMS Configuration"
            description="Configure SMS notification settings and provider details."
          />
        </TabsContent>

        <TabsContent value="push" className="space-y-4">
          <SettingsForm
            domainName="notifications"
            settings={pushSettings}
            title="Push Notification Configuration"
            description="Configure push notification settings and service details."
          />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <SettingsForm
            domainName="notifications"
            settings={templateSettings}
            title="Notification Templates"
            description="Customize notification templates and content."
          />
        </TabsContent>

        <TabsContent value="types" className="space-y-4">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">Notification Types</h2>
              <p className="text-gray-600">Configure which notifications are sent through which channels.</p>
            </div>

            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="orders">Orders</TabsTrigger>
                <TabsTrigger value="customers">Customers</TabsTrigger>
                <TabsTrigger value="products">Products</TabsTrigger>
                <TabsTrigger value="system">System</TabsTrigger>
                <TabsTrigger value="marketing">Marketing</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-4">
                <div className="space-y-4">
                  {notificationTypes.map(renderNotificationTypeCard)}
                </div>
              </TabsContent>

              <TabsContent value="orders" className="space-y-4">
                <div className="space-y-4">
                  {getNotificationsByCategory('orders').map(renderNotificationTypeCard)}
                </div>
              </TabsContent>

              <TabsContent value="customers" className="space-y-4">
                <div className="space-y-4">
                  {getNotificationsByCategory('customers').map(renderNotificationTypeCard)}
                </div>
              </TabsContent>

              <TabsContent value="products" className="space-y-4">
                <div className="space-y-4">
                  {getNotificationsByCategory('products').map(renderNotificationTypeCard)}
                </div>
              </TabsContent>

              <TabsContent value="system" className="space-y-4">
                <div className="space-y-4">
                  {getNotificationsByCategory('system').map(renderNotificationTypeCard)}
                </div>
              </TabsContent>

              <TabsContent value="marketing" className="space-y-4">
                <div className="space-y-4">
                  {getNotificationsByCategory('marketing').map(renderNotificationTypeCard)}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotificationSettings;
