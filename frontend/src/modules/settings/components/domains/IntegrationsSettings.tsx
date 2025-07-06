import React, { useState, useEffect } from 'react';
import { SettingsService } from '../../services/SettingsService';
import SettingsForm from '../SettingsForm';
import { Setting } from '../../models/settings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import {
  Plus,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Integration interface
interface Integration {
  id: string;
  name: string;
  description: string;
  logoUrl: string;
  category: 'marketing' | 'payment' | 'shipping' | 'accounting' | 'crm' | 'analytics' | 'marketplace';
  status: 'connected' | 'disconnected' | 'pending' | 'error';
  hasSettings: boolean;
}

const IntegrationsSettings: React.FC = () => {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const { toast } = useToast();

  // Filter integrations by category
  const getIntegrationsByCategory = (category: Integration['category']) => {
    return integrations.filter(integration => integration.category === category);
  };

  // Load integration settings
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const integrationsSettingsDomain = await new SettingsService().getDomainByNameWithSettings('integrations');
        setSettings(integrationsSettingsDomain.settings);

        // In a real implementation, you would load integrations from the API
        // For this example, we'll use dummy data
        setIntegrations([
          {
            id: '1',
            name: 'Google Analytics',
            description: 'Track website traffic and user behavior',
            logoUrl: 'https://www.gstatic.com/analytics-suite/header/suite/v2/ic_analytics.svg',
            category: 'analytics',
            status: 'connected',
            hasSettings: true,
          },
          {
            id: '2',
            name: 'Facebook Ads',
            description: 'Manage Facebook ad campaigns',
            logoUrl: 'https://www.facebook.com/images/fb_icon_325x325.png',
            category: 'marketing',
            status: 'connected',
            hasSettings: true,
          },
          {
            id: '3',
            name: 'Mailchimp',
            description: 'Email marketing and automation',
            logoUrl: 'https://cdn-images.mailchimp.com/icons/social-block-v2/outline-color-48.png',
            category: 'marketing',
            status: 'disconnected',
            hasSettings: true,
          },
          {
            id: '4',
            name: 'QuickBooks',
            description: 'Accounting and bookkeeping',
            logoUrl: 'https://quickbooks.intuit.com/cas/dam/IMAGE/A81QR5Ay/icom-blue-large.png',
            category: 'accounting',
            status: 'disconnected',
            hasSettings: true,
          },
          {
            id: '5',
            name: 'Shopify',
            description: 'Sync products with Shopify store',
            logoUrl: 'https://cdn.shopify.com/shopifycloud/brochure/assets/brand-assets/shopify-logo-primary-logo-456baa801ee66a0a435671082365958316831c9960c480451dd0330bcdae304f.svg',
            category: 'marketplace',
            status: 'error',
            hasSettings: true,
          },
          {
            id: '6',
            name: 'Salesforce',
            description: 'Customer relationship management',
            logoUrl: 'https://c1.sfdcstatic.com/content/dam/sfdc-docs/www/logos/logo-salesforce.svg',
            category: 'crm',
            status: 'pending',
            hasSettings: true,
          },
          {
            id: '7',
            name: 'UPS',
            description: 'Shipping rate calculation and label printing',
            logoUrl: 'https://www.ups.com/assets/resources/images/UPS_logo.svg',
            category: 'shipping',
            status: 'connected',
            hasSettings: true,
          },
          {
            id: '8',
            name: 'Amazon Marketplace',
            description: 'Sell products on Amazon',
            logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/1024px-Amazon_logo.svg.png',
            category: 'marketplace',
            status: 'disconnected',
            hasSettings: true,
          },
          {
            id: '9',
            name: 'Stripe',
            description: 'Payment processing',
            logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Stripe_Logo%2C_revised_2016.svg/2560px-Stripe_Logo%2C_revised_2016.svg.png',
            category: 'payment',
            status: 'connected',
            hasSettings: true,
          },
          {
            id: '10',
            name: 'HubSpot',
            description: 'CRM and marketing automation',
            logoUrl: 'https://www.hubspot.com/hubfs/assets/hubspot.com/style-guide/brand-guidelines/guidelines_the-logo.svg',
            category: 'crm',
            status: 'disconnected',
            hasSettings: true,
          },
        ]);
      } catch (err) {
        console.error('Failed to load integration settings:', err);
        setError('Failed to load integration settings. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleConnect = (integration: Integration) => {
    // In a real implementation, this would open an OAuth flow or settings panel
    toast({
      title: 'Connecting...',
      description: `Opening connection flow for ${integration.name}`,
    });

    // Simulate connection process
    setTimeout(() => {
      setIntegrations(prevIntegrations =>
        prevIntegrations.map(item =>
          item.id === integration.id
            ? { ...item, status: 'connected' }
            : item
        )
      );

      toast({
        title: 'Connected!',
        description: `Successfully connected to ${integration.name}`,
      });
    }, 2000);
  };

  const handleDisconnect = (integration: Integration) => {
    // In a real implementation, this would revoke the integration
    toast({
      title: 'Disconnecting...',
      description: `Disconnecting from ${integration.name}`,
    });

    // Simulate disconnection process
    setTimeout(() => {
      setIntegrations(prevIntegrations =>
        prevIntegrations.map(item =>
          item.id === integration.id
            ? { ...item, status: 'disconnected' }
            : item
        )
      );

      toast({
        title: 'Disconnected',
        description: `Successfully disconnected from ${integration.name}`,
      });
    }, 1000);
  };

  const handleConfigureIntegration = (integration: Integration) => {
    setSelectedIntegration(integration);
  };

  const renderIntegrationCard = (integration: Integration) => {
    const getStatusBadge = (status: Integration['status']) => {
      switch (status) {
        case 'connected':
          return (
            <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
              <CheckCircle className="w-3 h-3 mr-1" />
              Connected
            </Badge>
          );
        case 'disconnected':
          return (
            <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-gray-200">
              <XCircle className="w-3 h-3 mr-1" />
              Disconnected
            </Badge>
          );
        case 'pending':
          return (
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
              <Clock className="w-3 h-3 mr-1" />
              Pending
            </Badge>
          );
        case 'error':
          return (
            <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
              <AlertCircle className="w-3 h-3 mr-1" />
              Error
            </Badge>
          );
        default:
          return null;
      }
    };

    return (
      <Card key={integration.id} className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img
                src={integration.logoUrl}
                alt={`${integration.name} logo`}
                className="w-8 h-8 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div>
                <CardTitle className="text-base">{integration.name}</CardTitle>
                <p className="text-sm text-gray-600">{integration.description}</p>
              </div>
            </div>
            {getStatusBadge(integration.status)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            {integration.status === 'connected' ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDisconnect(integration)}
                >
                  Disconnect
                </Button>
                {integration.hasSettings && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleConfigureIntegration(integration)}
                  >
                    Configure
                  </Button>
                )}
              </>
            ) : (
              <Button
                size="sm"
                onClick={() => handleConnect(integration)}
                disabled={integration.status === 'pending'}
              >
                <Plus className="w-4 h-4 mr-1" />
                Connect
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(`#`, '_blank')}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-32" />
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
        <h1 className="text-2xl font-bold mb-2">Integrations</h1>
        <p className="text-gray-600">Connect your store to third-party services and platforms.</p>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
          <TabsTrigger value="shipping">Shipping</TabsTrigger>
          <TabsTrigger value="accounting">Accounting</TabsTrigger>
          <TabsTrigger value="crm">CRM</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {integrations.map(renderIntegrationCard)}
          </div>
        </TabsContent>

        <TabsContent value="marketing" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getIntegrationsByCategory('marketing').map(renderIntegrationCard)}
          </div>
        </TabsContent>

        <TabsContent value="payment" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getIntegrationsByCategory('payment').map(renderIntegrationCard)}
          </div>
        </TabsContent>

        <TabsContent value="shipping" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getIntegrationsByCategory('shipping').map(renderIntegrationCard)}
          </div>
        </TabsContent>

        <TabsContent value="accounting" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getIntegrationsByCategory('accounting').map(renderIntegrationCard)}
          </div>
        </TabsContent>

        <TabsContent value="crm" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getIntegrationsByCategory('crm').map(renderIntegrationCard)}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getIntegrationsByCategory('analytics').map(renderIntegrationCard)}
          </div>
        </TabsContent>

        <TabsContent value="marketplace" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getIntegrationsByCategory('marketplace').map(renderIntegrationCard)}
          </div>
        </TabsContent>
      </Tabs>

      {selectedIntegration && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">
            Configure {selectedIntegration.name}
          </h2>
          <SettingsForm
            domainName="integrations"
            settings={settings.filter(s => s.key.includes(selectedIntegration.id))}
            title={`${selectedIntegration.name} Settings`}
            description={`Configure your ${selectedIntegration.name} integration.`}
            onSaved={() => setSelectedIntegration(null)}
          />
        </div>
      )}
    </div>
  );
};

export default IntegrationsSettings;
