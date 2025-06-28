import { Box, Button, CircularProgress, Typography, Alert, Card, CardContent } from '@mui/material';
import React, { useState, useEffect, useRef } from 'react';

import type { Order } from '@/modules/order/models/order';
import { PaymentProvider } from '@/modules/payment/models/payment';
import type { PaymentInitializeRequest } from '@/modules/payment/models/payment';
import { HttpPaymentService } from '@/modules/payment/services/PaymentService';
import { FlutterwaveProvider } from '@/modules/payment/services/providers/FlutterwaveProvider';
import { PaystackProvider } from '@/modules/payment/services/providers/PaystackProvider';
import { StripeProvider } from '@/modules/payment/services/providers/StripeProvider';

interface OnlinePaymentProcessorProps {
  order: Order;
  provider: PaymentProvider;
  providerConfig: {
    publicKey: string;
    encryptionKey?: string;
  };
  onPaymentComplete: (reference: string) => void;
  onCancel: () => void;
}

export const OnlinePaymentProcessor: React.FC<OnlinePaymentProcessorProps> = ({
  order,
  provider,
  providerConfig,
  onPaymentComplete,
  onCancel,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [useInlineWidget, setUseInlineWidget] = useState<boolean>(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const paymentService = new HttpPaymentService();

  useEffect(() => {
    const initializePayment = async () => {
      setLoading(true);
      setError(null);

      try {
        // Check if we're in a browser environment
        const isBrowser = typeof window !== 'undefined';

        // For WhatsApp or other conversational channels, always use hosted checkout
        const isWebCheckout = order.source === 'WEBSITE' && isBrowser;

        // Use inline widget for web checkouts where possible
        setUseInlineWidget(isWebCheckout);

        // Prepare payment initialization request
        const request: PaymentInitializeRequest = {
          order_id: order.order_number,
          amount: order.total_amount,
          customer_email: order.customer.email,
          customer_name: order.customer.name,
          customer_phone: order.customer.phone,
          provider,
          redirect_url: isBrowser ? `${window.location.origin}/checkout/confirmation` : '',
          metadata: {
            order_id: order.order_number,
            source: order.source,
          },
        };

        const result = await paymentService.initializePayment(request);

        if (result.success && result.data) {
          setPaymentLink(result.data.checkout_url || result.data.payment_link || null);
          setReference(result.data.reference);
          setClientSecret(result.data.metadata?.client_secret);
        } else {
          setError(
            'Failed to initialize payment. Please try again or choose a different payment method.',
          );
        }
      } catch (err: unknown) {
        setError(
          `Payment initialization error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      } finally {
        setLoading(false);
      }
    };

    initializePayment();
  }, [order, provider]);

  const handlePaymentSuccess = (reference: string) => {
    setLoading(true);
    onPaymentComplete(reference);
  };

  const handleError = (error: unknown) => {
    setError(`Payment error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    setLoading(false);
  };

  const renderPaystackInlinePayment = () => {
    const paystackProvider = new PaystackProvider(providerConfig.publicKey);

    const handleInitiateInlinePayment = () => {
      setLoading(true);
      try {
        const containerId = 'paystack-payment-container';
        paystackProvider.createPaymentWidget(
          containerId,
          order.total_amount.amount,
          order.customer.email,
          reference || `order_${order.order_number}_${Date.now()}`,
          (ref) => handlePaymentSuccess(ref),
          () => onCancel(),
        );
      } catch (error) {
        console.error('Failed to create inline payment widget:', error);
        setError('Failed to load payment widget. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    return (
      <Box>
        <div id="paystack-payment-container" />
        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={handleInitiateInlinePayment}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Pay with Paystack'}
        </Button>
      </Box>
    );
  };

  const renderFlutterwaveInlinePayment = () => {
    const flutterwaveProvider = new FlutterwaveProvider(
      providerConfig.publicKey,
      providerConfig.encryptionKey,
    );

    const handleInitiateInlinePayment = () => {
      setLoading(true);
      try {
        flutterwaveProvider.createPaymentWidget(
          order.total_amount.amount,
          order.total_amount.currency,
          order.customer.email,
          order.customer.name,
          order.customer.phone,
          reference || `order_${order.order_number}_${Date.now()}`,
          (ref) => handlePaymentSuccess(ref),
          () => onCancel(),
        );
      } catch (error) {
        console.error('Failed to create inline payment widget:', error);
        setError('Failed to load payment widget. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    return (
      <Box>
        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={handleInitiateInlinePayment}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Pay with Flutterwave'}
        </Button>
      </Box>
    );
  };

  const renderStripeInlinePayment = (clientSecret: string, onSuccess: () => void, onError: (error: unknown) => void) => {
    useEffect(() => {
      const stripeProvider = new StripeProvider(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || '');
      stripeProvider.createPaymentWidget(clientSecret, onSuccess, onError);
    }, [clientSecret]);

    return (
      <form id="payment-form">
        <div id="card-element" style={{ minHeight: 40, marginBottom: 16 }} />
        <button type="submit" className="btn btn-primary">Pay</button>
      </form>
    );
  };

  const renderPaymentLink = () => {
    return (
      <Box>
        <Typography variant="body1" gutterBottom>
          Use the payment link below to complete your payment:
        </Typography>
        <Box
          mt={2}
          p={2}
          bgcolor="background.paper"
          border={1}
          borderColor="divider"
          borderRadius={1}
        >
          <Typography
            component="a"
            href={paymentLink || '#'}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ wordBreak: 'break-all' }}
          >
            {paymentLink}
          </Typography>
        </Box>
      </Box>
    );
  };

  if (loading && !paymentLink) {
    return (
      <Box display="flex" justifyContent="center" my={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Complete Your Payment
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!error && (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Payment Amount: {order.total_amount.currency} {order.total_amount.amount.toFixed(2)}
            </Typography>

            {provider === PaymentProvider.PAYSTACK && renderPaystackInlinePayment()}
            {provider === PaymentProvider.FLUTTERWAVE && renderFlutterwaveInlinePayment()}
            {provider === PaymentProvider.STRIPE && clientSecret && renderStripeInlinePayment(clientSecret, () => handlePaymentSuccess(reference || ''), handleError)}

            {!useInlineWidget && paymentLink && renderPaymentLink()}

            {useInlineWidget && paymentLink && (
              <Box mt={2}>
                <Typography variant="body2">
                  If the payment widget doesn't load, you can also use the direct payment link:
                </Typography>
                <Button href={paymentLink} target="_blank" rel="noopener noreferrer" sx={{ mt: 1 }}>
                  Open Payment Page
                </Button>
              </Box>
            )}
          </Box>
        )}

        <Box mt={3}>
          <Button variant="text" color="inherit" onClick={onCancel}>
            Cancel and go back
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default OnlinePaymentProcessor;
