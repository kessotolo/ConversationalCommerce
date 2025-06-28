import { PaymentProvider } from '@/modules/payment/models/payment';
import type {
  PaymentInitializeRequest,
  PaymentInitializeResponse,
} from '@/modules/payment/models/payment';

/**
 * Paystack provider implementation
 * Handles integration with Paystack payment gateway
 */
export class PaystackProvider {
  private publicKey: string;

  constructor(publicKey: string) {
    this.publicKey = publicKey;
  }

  /**
   * Initialize a payment with Paystack
   */
  async initializePayment(request: PaymentInitializeRequest): Promise<PaymentInitializeResponse> {
    if (typeof fetch === 'undefined') throw new Error('fetch is not available');
    try {
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.publicKey}`,
        },
        body: JSON.stringify({
          email: request.customer_email,
          amount: request.amount.amount * 100, // Convert to kobo/cents as required by Paystack
          currency: request.amount.currency,
          reference: `order_${request.order_id}_${Date.now()}`,
          callback_url:
            request.redirect_url ??
            (typeof window !== 'undefined'
              ? `${window.location.origin}/checkout/confirmation`
              : undefined),
          metadata: {
            order_id: request.order_id,
            customer_name: request.customer_name,
            provider: PaymentProvider.PAYSTACK,
            ...request.metadata,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message ?? 'Failed to initialize Paystack payment');
      }

      const data = await response.json();

      return {
        checkout_url: data.data.authorization_url,
        reference: data.data.reference,
        access_code: data.data.access_code,
        payment_link: data.data.authorization_url,
      };
    } catch (error) {
      if (typeof console !== 'undefined') console.error('Paystack initialization error:', error);
      throw error;
    }
  }

  /**
   * Create inline Paystack payment widget
   */
  createPaymentWidget(
    container: string,
    amount: number,
    email: string,
    reference: string,
    onSuccess: (reference: string) => void,
    onClose: () => void,
  ) {
    if (
      typeof window === 'undefined' ||
      typeof (window as unknown as PaystackWindow).PaystackPop !== 'object'
    ) {
      this.loadPaystackScript();
    }

    try {
      const handler =
        typeof window !== 'undefined'
          ? (window as unknown as PaystackWindow).PaystackPop?.setup({
              key: this.publicKey,
              email: email,
              amount: amount * 100, // Convert to kobo/cents
              ref: reference,
              container: container,
              callback: (response: unknown) => {
                if (
                  typeof response === 'object' &&
                  response !== null &&
                  'reference' in response &&
                  typeof (response as { reference: unknown }).reference === 'string'
                ) {
                  onSuccess((response as { reference: string }).reference);
                } else {
                  if (typeof console !== 'undefined')
                    console.error('Paystack callback response missing reference:', response);
                }
              },
              onClose: onClose,
            })
          : undefined;

      if (handler) {
        (handler as { openIframe: () => void }).openIframe();
      }
    } catch (error) {
      if (typeof console !== 'undefined') console.error('Error creating Paystack widget:', error);
      throw error;
    }
  }

  /**
   * Load Paystack script dynamically
   */
  private loadPaystackScript() {
    if (
      typeof window !== 'undefined' &&
      typeof (window as unknown as PaystackWindow).PaystackPop !== 'object'
    ) {
      const script = typeof document !== 'undefined' ? document.createElement('script') : undefined;
      if (typeof document !== 'undefined' && script) {
        document.body.appendChild(script);
      }
    }
  }
}

// Define a type for window with PaystackPop
interface PaystackWindow extends Window {
  PaystackPop?: {
    setup: (config: unknown) => unknown;
  };
}
