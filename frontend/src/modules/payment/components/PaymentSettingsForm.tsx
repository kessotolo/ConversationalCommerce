import { Alert } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';

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
      // Clean up the data to remove credentials for disabled providers
      const providers = data.providers.map((provider) => {
        if (!provider.enabled) {
          return {
            ...provider,
            credentials: {
              public_key: '',
              secret_key: '',
              encryption_key: '',
            },
          };
        }
        return provider;
      });

      const result = await paymentService.updatePaymentSettings(tenantId, {
        ...data,
        providers,
      });

      if (result.success) {
        setSuccess(true);
        if (onSaved) onSaved();
      } else {
        setError(`Failed to save settings: ${result.error?.message || 'Unknown error'}`);
      }
    } catch (err: unknown) {
      setError(`Error saving settings: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Payment Settings
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Payment settings saved successfully!
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Box mb={4}>
            <FormControlLabel
              control={
                <Controller
                  name="online_payments_enabled"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <Switch
                      checked={value}
                      onChange={(e) => onChange(e.target.checked)}
                      color="primary"
                    />
                  )}
                />
              }
              label="Enable Online Payments"
            />
            <FormHelperText>
              Allow customers to pay online through integrated payment gateways
            </FormHelperText>
          </Box>

          {/* Security Feature Toggles */}
          <Box mb={4}>
            <FormControlLabel
              control={
                <Controller
                  name="fraud_detection_enabled"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <Switch
                      checked={value ?? true}
                      onChange={(e) => onChange(e.target.checked)}
                      color="primary"
                    />
                  )}
                />
              }
              label="Enable Fraud Detection"
            />
            <FormHelperText>
              Enable advanced fraud detection for this seller (recommended)
            </FormHelperText>
            <FormControlLabel
              control={
                <Controller
                  name="rate_limiting_enabled"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <Switch
                      checked={value ?? true}
                      onChange={(e) => onChange(e.target.checked)}
                      color="primary"
                    />
                  )}
                />
              }
              label="Enable Rate Limiting"
            />
            <FormHelperText>
              Protect payment endpoints from abuse and suspicious activity
            </FormHelperText>
            <FormControlLabel
              control={
                <Controller
                  name="webhook_security_enabled"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <Switch
                      checked={value ?? true}
                      onChange={(e) => onChange(e.target.checked)}
                      color="primary"
                    />
                  )}
                />
              }
              label="Enable Webhook Security"
            />
            <FormHelperText>
              Enforce webhook signature validation and security for this seller
            </FormHelperText>
          </Box>

          {onlinePaymentsEnabled && (
            <>
              <Typography variant="h6" gutterBottom>
                Select Payment Provider(s)
              </Typography>

              <Grid sx={{ display: 'flex', gap: 3, mb: 4 }}>
                <Grid sx={{ flex: 1 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <FormControlLabel
                        control={
                          <Controller
                            name="providers.0.enabled"
                            control={control}
                            render={({ field: { onChange, value } }) => (
                              <Switch
                                checked={value}
                                onChange={(e) => onChange(e.target.checked)}
                                color="primary"
                              />
                            )}
                          />
                        }
                        label="Paystack"
                      />

                      <FormControlLabel
                        control={
                          <Controller
                            name="providers.0.test_mode"
                            control={control}
                            render={({ field: { onChange, value } }) => (
                              <Switch
                                checked={!!value}
                                onChange={(e) => onChange(e.target.checked)}
                                color="secondary"
                              />
                            )}
                          />
                        }
                        label="Enable Test Mode"
                      />
                      <FormHelperText>Allow test cards and fake payments for this provider (no real charges).</FormHelperText>

                      {paystackEnabled && (
                        <Box mt={2}>
                          <TextField
                            label="Public Key"
                            fullWidth
                            margin="normal"
                            {...register('providers.0.credentials.public_key', {
                              required: paystackEnabled ? 'Public Key is required' : false,
                            })}
                            error={!!errors.providers?.[0]?.credentials?.public_key}
                            helperText={errors.providers?.[0]?.credentials?.public_key?.message}
                          />

                          <TextField
                            label="Secret Key"
                            fullWidth
                            margin="normal"
                            type="password"
                            {...register('providers.0.credentials.secret_key', {
                              required: paystackEnabled ? 'Secret Key is required' : false,
                            })}
                            error={!!errors.providers?.[0]?.credentials?.secret_key}
                            helperText={errors.providers?.[0]?.credentials?.secret_key?.message}
                          />
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                <Grid sx={{ flex: 1 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <FormControlLabel
                        control={
                          <Controller
                            name="providers.1.enabled"
                            control={control}
                            render={({ field: { onChange, value } }) => (
                              <Switch
                                checked={value}
                                onChange={(e) => onChange(e.target.checked)}
                                color="primary"
                              />
                            )}
                          />
                        }
                        label="Flutterwave"
                      />

                      <FormControlLabel
                        control={
                          <Controller
                            name="providers.1.test_mode"
                            control={control}
                            render={({ field: { onChange, value } }) => (
                              <Switch
                                checked={!!value}
                                onChange={(e) => onChange(e.target.checked)}
                                color="secondary"
                              />
                            )}
                          />
                        }
                        label="Enable Test Mode"
                      />
                      <FormHelperText>Allow test cards and fake payments for this provider (no real charges).</FormHelperText>

                      {flutterwaveEnabled && (
                        <Box mt={2}>
                          <TextField
                            label="Public Key"
                            fullWidth
                            margin="normal"
                            {...register('providers.1.credentials.public_key', {
                              required: flutterwaveEnabled ? 'Public Key is required' : false,
                            })}
                            error={!!errors.providers?.[1]?.credentials?.public_key}
                            helperText={errors.providers?.[1]?.credentials?.public_key?.message}
                          />

                          <TextField
                            label="Secret Key"
                            fullWidth
                            margin="normal"
                            type="password"
                            {...register('providers.1.credentials.secret_key', {
                              required: flutterwaveEnabled ? 'Secret Key is required' : false,
                            })}
                            error={!!errors.providers?.[1]?.credentials?.secret_key}
                            helperText={errors.providers?.[1]?.credentials?.secret_key?.message}
                          />

                          <TextField
                            label="Encryption Key (Optional)"
                            fullWidth
                            margin="normal"
                            type="password"
                            {...register('providers.1.credentials.encryption_key')}
                            error={!!errors.providers?.[1]?.credentials?.encryption_key}
                            helperText={errors.providers?.[1]?.credentials?.encryption_key?.message}
                          />
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </>
          )}

          <Divider sx={{ my: 4 }} />

          <Typography variant="h6" gutterBottom>
            Bank Transfer Setup
          </Typography>

          <Box mb={4}>
            <TextField
              label="Bank Name"
              fullWidth
              margin="normal"
              {...register('bank_transfer_details.bank_name', {
                required: 'Bank name is required',
              })}
              error={!!errors.bank_transfer_details?.bank_name}
              helperText={errors.bank_transfer_details?.bank_name?.message}
            />

            <TextField
              label="Account Name"
              fullWidth
              margin="normal"
              {...register('bank_transfer_details.account_name', {
                required: 'Account name is required',
              })}
              error={!!errors.bank_transfer_details?.account_name}
              helperText={errors.bank_transfer_details?.account_name?.message}
            />

            <TextField
              label="Account Number"
              fullWidth
              margin="normal"
              {...register('bank_transfer_details.account_number', {
                required: 'Account number is required',
              })}
              error={!!errors.bank_transfer_details?.account_number}
              helperText={errors.bank_transfer_details?.account_number?.message}
            />

            <TextField
              label="Transfer Instructions (Optional)"
              fullWidth
              margin="normal"
              multiline
              rows={3}
              {...register('bank_transfer_details.instructions')}
            />
          </Box>

          <Divider sx={{ my: 4 }} />

          <Typography variant="h6" gutterBottom>
            Platform Fee Configuration
          </Typography>

          <Box mb={4}>
            <TextField
              label="Platform Fee Percentage"
              fullWidth
              margin="normal"
              type="number"
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
              {...register('platform_fee_percentage', {
                required: 'Platform fee is required',
                min: { value: 0, message: 'Fee cannot be negative' },
                max: { value: 100, message: 'Fee cannot exceed 100%' },
              })}
              error={!!errors.platform_fee_percentage}
              helperText={errors.platform_fee_percentage?.message}
            />

            <FormControlLabel
              control={
                <Controller
                  name="auto_calculate_payout"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <Switch
                      checked={value}
                      onChange={(e) => onChange(e.target.checked)}
                      color="primary"
                    />
                  )}
                />
              }
              label="Auto-calculate net payout amount"
            />
            <FormHelperText>
              Automatically deduct platform fees when calculating seller payouts
            </FormHelperText>
          </Box>

          <Box display="flex" justifyContent="flex-end" mt={4}>
            <Button type="submit" variant="contained" color="primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Settings'}
            </Button>
          </Box>
        </form>
      </CardContent>
    </Card>
  );
};

export default PaymentSettingsForm;
