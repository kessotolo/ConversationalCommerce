import React, { useState, useEffect } from 'react';
import { SettingsService } from '../../services/SettingsService';
import SettingsForm from '../SettingsForm';
import { Setting } from '../../models/settings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { CreditCard, DollarSign, Settings, Shield, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Component to render a payment provider card
const PaymentProviderCard: React.FC<{
  title: string;
  description: string;
  icon: React.ReactElement;
  isActive: boolean;
  onActivate: () => void;
  onConfigure: () => void;
}> = ({ title, description, icon, isActive, onActivate, onConfigure }) => {
  return (
    <Card
      className={cn(
        "transition-all duration-200 hover:shadow-md",
        isActive ? "border-l-4 border-l-green-500" : ""
      )}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 text-blue-500 rounded-md">
              {icon}
            </div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <p className="text-sm text-gray-600 mt-1">{description}</p>
            </div>
          </div>
          {isActive && (
            <Badge className="bg-green-100 text-green-800 border-green-200">
              Active
            </Badge>
          )}
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4">
        <div className="flex justify-end">
          {!isActive ? (
            <Button size="sm" onClick={onActivate}>
              Activate
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={onConfigure}>
              Configure
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const PaymentSettings: React.FC = () => {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [showProviderConfig, setShowProviderConfig] = useState(false);

  // Group settings by category for better organization
  const generalSettings = settings.filter(s => s.key.startsWith('payment.general'));
  const stripeSettings = settings.filter(s => s.key.startsWith('payment.providers.stripe'));
  const paypalSettings = settings.filter(s => s.key.startsWith('payment.providers.paypal'));
  const squareSettings = settings.filter(s => s.key.startsWith('payment.providers.square'));
  const manualSettings = settings.filter(s => s.key.startsWith('payment.providers.manual'));

  // Load payment settings
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const paymentSettingsDomain = await new SettingsService().getDomainByNameWithSettings('payment');
        setSettings(paymentSettingsDomain.settings);

        // Determine active provider
        const activeProviderSetting = paymentSettingsDomain.settings.find(s => s.key === 'payment.general.active_provider');
        if (activeProviderSetting) {
          setActiveProvider(activeProviderSetting.value);
        }
      } catch (err) {
        console.error('Failed to load payment settings:', err);
        setError('Failed to load payment settings. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleActivateProvider = async (provider: string) => {
    try {
      // Find the active provider setting
      const activeProviderSetting = settings.find(s => s.key === 'payment.general.active_provider');

      if (activeProviderSetting) {
        // Update the active provider
        await new SettingsService().updateSetting(activeProviderSetting.id, provider);
        setActiveProvider(provider);
      }

      // Show the configuration panel for the newly activated provider
      setShowProviderConfig(true);
    } catch (error) {
      console.error('Failed to activate payment provider:', error);
      setError('Failed to activate payment provider. Please try again.');
    }
  };

  const handleConfigureProvider = () => {
    setShowProviderConfig(true);
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
        <h1 className="text-2xl font-bold mb-2">Payment Settings</h1>
        <p className="text-gray-600">Configure payment providers and checkout options for your store.</p>
      </div>

      <Tabs defaultValue="providers" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="providers">Payment Providers</TabsTrigger>
          <TabsTrigger value="checkout">Checkout Options</TabsTrigger>
          <TabsTrigger value="tax">Tax Settings</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="space-y-4">
          {!showProviderConfig ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-2">Available Payment Providers</h2>
                <p className="text-gray-600">Choose and configure your payment providers.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PaymentProviderCard
                  title="Stripe"
                  description="Accept credit cards, digital wallets, and more"
                  icon={<CreditCard className="h-5 w-5" />}
                  isActive={activeProvider === 'stripe'}
                  onActivate={() => handleActivateProvider('stripe')}
                  onConfigure={handleConfigureProvider}
                />

                <PaymentProviderCard
                  title="PayPal"
                  description="Accept PayPal payments and credit cards"
                  icon={<DollarSign className="h-5 w-5" />}
                  isActive={activeProvider === 'paypal'}
                  onActivate={() => handleActivateProvider('paypal')}
                  onConfigure={handleConfigureProvider}
                />

                <PaymentProviderCard
                  title="Square"
                  description="Accept payments with Square"
                  icon={<CreditCard className="h-5 w-5" />}
                  isActive={activeProvider === 'square'}
                  onActivate={() => handleActivateProvider('square')}
                  onConfigure={handleConfigureProvider}
                />

                <PaymentProviderCard
                  title="Manual Payment"
                  description="Accept manual payments (bank transfer, cash, etc.)"
                  icon={<DollarSign className="h-5 w-5" />}
                  isActive={activeProvider === 'manual'}
                  onActivate={() => handleActivateProvider('manual')}
                  onConfigure={handleConfigureProvider}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  Configure {activeProvider?.charAt(0).toUpperCase() + activeProvider?.slice(1)} Settings
                </h2>
                <Button variant="outline" onClick={() => setShowProviderConfig(false)}>
                  Back to Providers
                </Button>
              </div>

              {activeProvider === 'stripe' && (
                <SettingsForm
                  domainName="payment"
                  settings={stripeSettings}
                  title="Stripe Configuration"
                  description="Configure your Stripe payment settings."
                />
              )}

              {activeProvider === 'paypal' && (
                <SettingsForm
                  domainName="payment"
                  settings={paypalSettings}
                  title="PayPal Configuration"
                  description="Configure your PayPal payment settings."
                />
              )}

              {activeProvider === 'square' && (
                <SettingsForm
                  domainName="payment"
                  settings={squareSettings}
                  title="Square Configuration"
                  description="Configure your Square payment settings."
                />
              )}

              {activeProvider === 'manual' && (
                <SettingsForm
                  domainName="payment"
                  settings={manualSettings}
                  title="Manual Payment Configuration"
                  description="Configure manual payment options."
                />
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="checkout" className="space-y-4">
          <SettingsForm
            domainName="payment"
            settings={generalSettings}
            title="Checkout Options"
            description="Configure checkout flow and payment options."
          />
        </TabsContent>

        <TabsContent value="tax" className="space-y-4">
          <SettingsForm
            domainName="payment"
            settings={settings.filter(s => s.key.startsWith('payment.tax'))}
            title="Tax Settings"
            description="Configure tax calculation and collection."
          />
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <SettingsForm
            domainName="payment"
            settings={settings.filter(s => s.key.startsWith('payment.security'))}
            title="Payment Security"
            description="Configure security settings for payments."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PaymentSettings;
