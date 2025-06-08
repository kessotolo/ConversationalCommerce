import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Divider,
  Card,
  CardContent,
  Stack,
  Alert,
} from '@mui/material';
import { PaymentSettings, PaymentProvider } from '../models/payment';
import { HttpPaymentService } from '../services/PaymentService';

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
      } catch (err: any) {
        setError(`Error loading payment settings: ${err.message || 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    loadPaymentSettings();
  }, [tenantId]);

  const handleMethodChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSelectedMethod(value);

    if (value === 'online') {
      // If online is selected, select the first available provider
      const availableProviders = settings?.providers.filter((p) => p.enabled) || [];
      if (availableProviders.length > 0) {
        setSelectedProvider(availableProviders[0].provider);
        onMethodSelected('online', availableProviders[0].provider);
      }
    } else if (value === 'bank_transfer') {
      setSelectedProvider(null);
      onMethodSelected('bank_transfer');
    }
  };

  const handleProviderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value as PaymentProvider;
    setSelectedProvider(value);
    onMethodSelected('online', value);
  };

  if (loading) {
    return <Typography>Loading payment options...</Typography>;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!settings) {
    return <Alert severity="warning">Payment settings not available</Alert>;
  }

  // Check if there are any enabled online payment providers
  const hasEnabledOnlineProviders = settings.providers.some((p) => p.enabled);

  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Select Payment Method
        </Typography>

        <FormControl component="fieldset">
          <RadioGroup
            aria-label="payment-method"
            name="payment-method"
            value={selectedMethod}
            onChange={handleMethodChange}
          >
            {/* Only show online payment option if enabled in settings */}
            {settings.online_payments_enabled && hasEnabledOnlineProviders && (
              <FormControlLabel value="online" control={<Radio />} label="Pay Online" />
            )}

            {/* Always show bank transfer as an option */}
            <FormControlLabel value="bank_transfer" control={<Radio />} label="Bank Transfer" />
          </RadioGroup>
        </FormControl>

        {/* Show provider selection if online is selected and multiple providers are available */}
        {selectedMethod === 'online' && settings.providers.filter((p) => p.enabled).length > 1 && (
          <Box mt={2}>
            <Divider sx={{ my: 2 }} />
            <FormControl component="fieldset">
              <FormLabel component="legend">Select Payment Provider</FormLabel>
              <RadioGroup
                aria-label="payment-provider"
                name="payment-provider"
                value={selectedProvider}
                onChange={handleProviderChange}
              >
                {settings.providers
                  .filter((p) => p.enabled)
                  .map((provider) => (
                    <FormControlLabel
                      key={provider.provider}
                      value={provider.provider}
                      control={<Radio />}
                      label={
                        provider.provider === PaymentProvider.PAYSTACK ? 'Paystack' : 'Flutterwave'
                      }
                    />
                  ))}
              </RadioGroup>
            </FormControl>
          </Box>
        )}

        {/* Display bank details if bank transfer is selected */}
        {selectedMethod === 'bank_transfer' && settings.bank_transfer_details && (
          <Box mt={3}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" fontWeight="bold">
              Bank Transfer Details
            </Typography>

            <Stack spacing={1} mt={2}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Bank Name
                </Typography>
                <Typography variant="body1">{settings.bank_transfer_details.bank_name}</Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  Account Name
                </Typography>
                <Typography variant="body1">
                  {settings.bank_transfer_details.account_name}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  Account Number
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {settings.bank_transfer_details.account_number}
                </Typography>
              </Box>

              {settings.bank_transfer_details.instructions && (
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Instructions
                  </Typography>
                  <Typography variant="body2">
                    {settings.bank_transfer_details.instructions}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentMethodSelector;
