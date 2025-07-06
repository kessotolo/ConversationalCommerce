import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, ExternalLink, AlertCircle } from 'lucide-react';

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
          setClientSecret(
            typeof result.data.metadata?.client_secret === 'string'
              ? result.data.metadata.client_secret
              : null
          );
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
    const errorMessage = `Payment error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    setError(errorMessage);
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
      <div className="space-y-4">
        <div id="paystack-payment-container" />
        <Button
          onClick={handleInitiateInlinePayment}
          disabled={loading}
          className="w-full flex items-center space-x-2"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CreditCard className="h-4 w-4" />
          )}
          <span>{loading ? 'Loading...' : 'Pay with Paystack'}</span>
        </Button>
      </div>
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
      <div className="space-y-4">
        <Button
          onClick={handleInitiateInlinePayment}
          disabled={loading}
          className="w-full flex items-center space-x-2"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CreditCard className="h-4 w-4" />
          )}
          <span>{loading ? 'Loading...' : 'Pay with Flutterwave'}</span>
        </Button>
      </div>
    );
  };

  const renderStripeInlinePayment = (clientSecret: string, onSuccess: () => void, onError: (error: unknown) => void) => {
    useEffect(() => {
      const stripeProvider = new StripeProvider(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || '');
      stripeProvider.createPaymentWidget(clientSecret, onSuccess, onError);
    }, [clientSecret]);

    return (
      <form id="payment-form" className="space-y-4">
        <div id="card-element" className="min-h-10 mb-4 p-3 border border-gray-300 rounded-md" />
        <Button type="submit" className="w-full">
          Pay with Stripe
        </Button>
      </form>
    );
  };

  const renderPaymentLink = () => {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Use the payment link below to complete your payment:
        </p>
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <a
            href={paymentLink || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 break-all underline flex items-center space-x-2"
          >
            <span>{paymentLink}</span>
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    );
  };

  if (loading && !paymentLink) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Initializing payment...</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CreditCard className="h-5 w-5" />
          <span>Complete Your Payment</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!error && (
          <div className="space-y-6">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Payment Amount:</strong> {order.total_amount.currency} {order.total_amount.amount.toFixed(2)}
              </p>
            </div>

            {provider === PaymentProvider.PAYSTACK && renderPaystackInlinePayment()}
            {provider === PaymentProvider.FLUTTERWAVE && renderFlutterwaveInlinePayment()}
            {provider === PaymentProvider.STRIPE && clientSecret && renderStripeInlinePayment(clientSecret, () => handlePaymentSuccess(reference || ''), handleError)}

            {!useInlineWidget && paymentLink && renderPaymentLink()}

            {useInlineWidget && paymentLink && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  If the payment widget doesn't load, you can also use the direct payment link:
                </p>
                <Button
                  variant="outline"
                  asChild
                  className="flex items-center space-x-2"
                >
                  <a href={paymentLink} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    <span>Open Payment Page</span>
                  </a>
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="pt-4 border-t">
          <Button variant="outline" onClick={onCancel} className="w-full">
            Cancel and go back
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default OnlinePaymentProcessor;
