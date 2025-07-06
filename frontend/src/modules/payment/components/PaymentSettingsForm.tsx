import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, AlertCircle, CheckCircle } from 'lucide-react';

import { PaymentProvider } from '@/modules/payment/models/payment';
import type { PaymentSettings } from '@/modules/payment/models/payment';
import { HttpPaymentService } from '@/modules/payment/services/PaymentService';

interface PaymentSettingsFormProps {
  tenantId: string;
  onSaved?: () => void;
}

export const PaymentSettingsForm: React.FC<PaymentSettingsFormProps> = ({ tenantId, onSaved }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<PaymentSettings>({
    defaultValues: {
      online_payments_enabled: false,
      providers: [
        {
          provider: PaymentProvider.PAYSTACK,
          enabled: false,
          credentials: { public_key: '', secret_key: '' },
          is_default: true,
        },
        {
          provider: PaymentProvider.FLUTTERWAVE,
          enabled: false,
          credentials: { public_key: '', secret_key: '', encryption_key: '' },
        },
      ],
      bank_transfer_details: {
        bank_name: '',
        account_name: '',
        account_number: '',
        instructions: '',
      },
      platform_fee_percentage: 5.0,
      auto_calculate_payout: true,
    },
  });

  const onlinePaymentsEnabled = watch('online_payments_enabled');
  const paystackEnabled = watch('providers.0.enabled');
  const flutterwaveEnabled = watch('providers.1.enabled');

  const paymentService = new HttpPaymentService();

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const result = await paymentService.getPaymentSettings(tenantId);
        if (result.success && result.data) {
          reset(result.data);
        }
      } catch (err) {
        console.error('Error loading payment settings:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [tenantId, reset]);

  const onSubmit = async (data: PaymentSettings) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await paymentService.updatePaymentSettings(tenantId, data);
      if (result.success) {
        setSuccess(true);
        if (onSaved) {
          onSaved();
        }
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error?.message || 'Failed to save payment settings');
      }
    } catch (err: unknown) {
      setError(`Error saving settings: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CreditCard className="h-5 w-5" />
          <span>Payment Settings</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>Payment settings saved successfully!</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Online Payments Toggle */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Controller
                name="online_payments_enabled"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Switch checked={value} onCheckedChange={onChange} />
                )}
              />
              <div>
                <Label className="text-base font-medium">Enable Online Payments</Label>
                <p className="text-sm text-gray-600">
                  Allow customers to pay online through integrated payment gateways
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment Providers */}
          {onlinePaymentsEnabled && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Payment Providers</h3>

              {/* Paystack Provider */}
              <Card className="border border-gray-200">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Controller
                        name="providers.0.enabled"
                        control={control}
                        render={({ field: { onChange, value } }) => (
                          <Switch checked={value} onCheckedChange={onChange} />
                        )}
                      />
                      <div>
                        <Label className="text-base font-medium">Paystack</Label>
                        <p className="text-sm text-gray-600">Accept payments via Paystack</p>
                      </div>
                    </div>
                    <Badge variant={paystackEnabled ? "default" : "secondary"}>
                      {paystackEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>

                  {paystackEnabled && (
                    <div className="space-y-4 pt-4 border-t">
                      <div className="flex items-center gap-3">
                        <Controller
                          name="providers.0.test_mode"
                          control={control}
                          render={({ field: { onChange, value } }) => (
                            <Switch checked={!!value} onCheckedChange={onChange} />
                          )}
                        />
                        <Label className="text-sm">Test Mode</Label>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="paystack_public_key">Public Key *</Label>
                          <Input
                            id="paystack_public_key"
                            {...register('providers.0.credentials.public_key', {
                              required: paystackEnabled ? 'Public key is required' : false,
                            })}
                            placeholder="pk_test_..."
                          />
                          {errors.providers?.[0]?.credentials?.public_key && (
                            <p className="text-sm text-red-500">
                              {errors.providers[0].credentials.public_key.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="paystack_secret_key">Secret Key *</Label>
                          <Input
                            id="paystack_secret_key"
                            type="password"
                            {...register('providers.0.credentials.secret_key', {
                              required: paystackEnabled ? 'Secret key is required' : false,
                            })}
                            placeholder="sk_test_..."
                          />
                          {errors.providers?.[0]?.credentials?.secret_key && (
                            <p className="text-sm text-red-500">
                              {errors.providers[0].credentials.secret_key.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Flutterwave Provider */}
              <Card className="border border-gray-200">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Controller
                        name="providers.1.enabled"
                        control={control}
                        render={({ field: { onChange, value } }) => (
                          <Switch checked={value} onCheckedChange={onChange} />
                        )}
                      />
                      <div>
                        <Label className="text-base font-medium">Flutterwave</Label>
                        <p className="text-sm text-gray-600">Accept payments via Flutterwave</p>
                      </div>
                    </div>
                    <Badge variant={flutterwaveEnabled ? "default" : "secondary"}>
                      {flutterwaveEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>

                  {flutterwaveEnabled && (
                    <div className="space-y-4 pt-4 border-t">
                      <div className="flex items-center gap-3">
                        <Controller
                          name="providers.1.test_mode"
                          control={control}
                          render={({ field: { onChange, value } }) => (
                            <Switch checked={!!value} onCheckedChange={onChange} />
                          )}
                        />
                        <Label className="text-sm">Test Mode</Label>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="flutterwave_public_key">Public Key *</Label>
                          <Input
                            id="flutterwave_public_key"
                            {...register('providers.1.credentials.public_key', {
                              required: flutterwaveEnabled ? 'Public key is required' : false,
                            })}
                            placeholder="FLWPUBK_TEST-..."
                          />
                          {errors.providers?.[1]?.credentials?.public_key && (
                            <p className="text-sm text-red-500">
                              {errors.providers[1].credentials.public_key.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="flutterwave_secret_key">Secret Key *</Label>
                          <Input
                            id="flutterwave_secret_key"
                            type="password"
                            {...register('providers.1.credentials.secret_key', {
                              required: flutterwaveEnabled ? 'Secret key is required' : false,
                            })}
                            placeholder="FLWSECK_TEST-..."
                          />
                          {errors.providers?.[1]?.credentials?.secret_key && (
                            <p className="text-sm text-red-500">
                              {errors.providers[1].credentials.secret_key.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="flutterwave_encryption_key">Encryption Key</Label>
                          <Input
                            id="flutterwave_encryption_key"
                            type="password"
                            {...register('providers.1.credentials.encryption_key')}
                            placeholder="FLWSECK_TEST..."
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <Separator />

          {/* Bank Transfer Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Bank Transfer Details</h3>
            <p className="text-sm text-gray-600">
              Configure bank details for manual payment transfers
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bank_name">Bank Name</Label>
                <Input
                  id="bank_name"
                  {...register('bank_transfer_details.bank_name')}
                  placeholder="Enter bank name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_name">Account Name</Label>
                <Input
                  id="account_name"
                  {...register('bank_transfer_details.account_name')}
                  placeholder="Enter account name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_number">Account Number</Label>
                <Input
                  id="account_number"
                  {...register('bank_transfer_details.account_number')}
                  placeholder="Enter account number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="platform_fee">Platform Fee (%)</Label>
                <Input
                  id="platform_fee"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  {...register('platform_fee_percentage', {
                    valueAsNumber: true,
                    min: { value: 0, message: 'Fee cannot be negative' },
                    max: { value: 100, message: 'Fee cannot exceed 100%' },
                  })}
                  placeholder="5.0"
                />
                {errors.platform_fee_percentage && (
                  <p className="text-sm text-red-500">{errors.platform_fee_percentage.message}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="transfer_instructions">Transfer Instructions</Label>
                <Input
                  id="transfer_instructions"
                  {...register('bank_transfer_details.instructions')}
                  placeholder="Additional instructions for bank transfers"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Additional Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Additional Settings</h3>

            <div className="flex items-center gap-3">
              <Controller
                name="auto_calculate_payout"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Switch checked={value} onCheckedChange={onChange} />
                )}
              />
              <div>
                <Label className="text-base">Auto Calculate Payout</Label>
                <p className="text-sm text-gray-600">
                  Automatically calculate merchant payout after platform fees
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-6">
            <Button type="submit" disabled={loading} className="flex items-center space-x-2">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>Save Settings</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default PaymentSettingsForm;
