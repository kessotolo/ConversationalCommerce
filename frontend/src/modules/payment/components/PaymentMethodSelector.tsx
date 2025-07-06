import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, CreditCard, Building2 } from 'lucide-react';

import { PaymentProvider } from '@/modules/payment/models/payment';
import type { PaymentSettings } from '@/modules/payment/models/payment';
import { HttpPaymentService } from '@/modules/payment/services/PaymentService';

interface PaymentMethodSelectorProps {
  tenantId: string;
  onMethodSelected: (method: 'online' | 'bank_transfer', provider?: PaymentProvider) => void;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  tenantId,
  onMethodSelected,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider | null>(null);

  const paymentService = new HttpPaymentService();

  useEffect(() => {
    const loadPaymentSettings = async () => {
      setLoading(true);
      try {
        const result = await paymentService.getPaymentSettings(tenantId);
        if (result.success && result.data) {
          setSettings(result.data);

          // Set default selected method
          if (result.data.online_payments_enabled && result.data.providers.some((p) => p.enabled)) {
            setSelectedMethod('online');

            // Find default provider or first enabled provider
            const defaultProvider = result.data.providers.find((p) => p.is_default && p.enabled);
            const firstEnabledProvider = result.data.providers.find((p) => p.enabled);

            if (defaultProvider) {
              setSelectedProvider(defaultProvider.provider);
            } else if (firstEnabledProvider) {
              setSelectedProvider(firstEnabledProvider.provider);
            }
          } else {
            setSelectedMethod('bank_transfer');
          }
        } else {
          setError('Failed to load payment settings');
        }
      } catch (err: unknown) {
        setError(
          `Error loading payment settings: ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      } finally {
        setLoading(false);
      }
    };

    loadPaymentSettings();
  }, [tenantId]);

  const handleMethodChange = (value: string) => {
    setSelectedMethod(value);

    if (value === 'online') {
      if (settings && settings.providers) {
        const availableProviders = settings.providers.filter((p) => p.enabled);
        const [firstProvider] = availableProviders;
        if (firstProvider) {
          setSelectedProvider(firstProvider.provider);
          onMethodSelected('online', firstProvider.provider);
        }
      }
    } else if (value === 'bank_transfer') {
      setSelectedProvider(null);
      onMethodSelected('bank_transfer');
    }
  };

  const handleProviderChange = (value: string) => {
    const provider = value as PaymentProvider;
    setSelectedProvider(provider);
    onMethodSelected('online', provider);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading payment options...</span>
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

  if (!settings) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Payment settings not available</AlertDescription>
      </Alert>
    );
  }

  // Check if there are any enabled online payment providers
  const hasEnabledOnlineProviders = settings.providers.some((p) => p.enabled);

  const selectedProviderConfig = settings.providers.find(
    (p) => p.provider === selectedProvider
  );
  const isTestMode = selectedProviderConfig?.test_mode;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CreditCard className="h-5 w-5" />
          <span>Select Payment Method</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isTestMode && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Test Mode Enabled:</strong> Payments are in test mode. Use test cards only. No real charges will be made.
              <br />
              {selectedProvider === PaymentProvider.STRIPE && (
                <span>Stripe test card: <code className="bg-gray-100 px-1 rounded">4242 4242 4242 4242</code> (any future date, any CVC)</span>
              )}
              {selectedProvider === PaymentProvider.PAYSTACK && (
                <span>Paystack test card: <code className="bg-gray-100 px-1 rounded">4084 0840 8408 4081</code> (any future date, any CVC)</span>
              )}
              {selectedProvider === PaymentProvider.FLUTTERWAVE && (
                <span>Flutterwave test card: <code className="bg-gray-100 px-1 rounded">5531 8866 5214 2950</code> (PIN: 1234, Exp: 09/32, CVV: 564)</span>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <RadioGroup value={selectedMethod} onValueChange={handleMethodChange}>
            {/* Only show online payment option if enabled in settings */}
            {settings.online_payments_enabled && hasEnabledOnlineProviders && (
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="online" id="online" />
                <Label htmlFor="online" className="flex items-center space-x-2 cursor-pointer">
                  <CreditCard className="h-4 w-4" />
                  <span>Pay Online</span>
                </Label>
              </div>
            )}

            {/* Always show bank transfer as an option */}
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="bank_transfer" id="bank_transfer" />
              <Label htmlFor="bank_transfer" className="flex items-center space-x-2 cursor-pointer">
                <Building2 className="h-4 w-4" />
                <span>Bank Transfer</span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Show provider selection if online is selected and multiple providers are available */}
        {selectedMethod === 'online' && settings.providers.filter((p) => p.enabled).length > 1 && (
          <div className="space-y-4">
            <Separator />
            <div className="space-y-3">
              <Label className="text-sm font-medium">Select Payment Provider</Label>
              <RadioGroup value={selectedProvider || ''} onValueChange={handleProviderChange}>
                {settings.providers
                  .filter((p) => p.enabled)
                  .map((provider) => (
                    <div key={provider.provider} className="flex items-center space-x-2">
                      <RadioGroupItem value={provider.provider} id={provider.provider} />
                      <Label htmlFor={provider.provider} className="cursor-pointer">
                        {provider.provider === PaymentProvider.PAYSTACK ? 'Paystack' :
                          provider.provider === PaymentProvider.FLUTTERWAVE ? 'Flutterwave' :
                            provider.provider === PaymentProvider.STRIPE ? 'Stripe' : 'Manual'}
                      </Label>
                    </div>
                  ))}
              </RadioGroup>
            </div>
          </div>
        )}

        {/* Display bank details if bank transfer is selected */}
        {selectedMethod === 'bank_transfer' && settings.bank_transfer_details && (
          <div className="space-y-4">
            <Separator />
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Bank Transfer Details</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">Bank Name</Label>
                  <p className="font-medium">{settings.bank_transfer_details.bank_name}</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">Account Name</Label>
                  <p className="font-medium">{settings.bank_transfer_details.account_name}</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">Account Number</Label>
                  <p className="font-bold text-lg">{settings.bank_transfer_details.account_number}</p>
                </div>

                {settings.bank_transfer_details.instructions && (
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-sm text-gray-600">Instructions</Label>
                    <p className="text-sm">{settings.bank_transfer_details.instructions}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentMethodSelector;
