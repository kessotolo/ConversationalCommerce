import {
  PaymentInitializeRequest,
  PaymentInitializeResponse,
  PaymentProvider,
} from '../../models/payment';

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
    try {
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.publicKey}`,
        },
        body: JSON.stringify({
          email: request.customer_email,
          amount: request.amount.value * 100, // Convert to kobo/cents as required by Paystack
          currency: request.amount.currency,
          reference: `order_${request.order_id}_${Date.now()}`,
          callback_url: request.redirect_url || window.location.origin + '/checkout/confirmation',
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
        throw new Error(errorData.message || 'Failed to initialize Paystack payment');
      }

      const data = await response.json();

      return {
        checkout_url: data.data.authorization_url,
        reference: data.data.reference,
        access_code: data.data.access_code,
        payment_link: data.data.authorization_url,
      };
    } catch (error) {
      console.error('Paystack initialization error:', error);
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
    if (typeof window === 'undefined' || !(window as any).PaystackPop) {
      this.loadPaystackScript();
    }

    try {
      const handler = (window as any).PaystackPop.setup({
        key: this.publicKey,
        email: email,
        amount: amount * 100, // Convert to kobo/cents
        ref: reference,
        container: container,
        callback: (response: any) => {
          onSuccess(response.reference);
        },
        onClose: onClose,
      });

      handler.openIframe();
    } catch (error) {
      console.error('Error creating Paystack widget:', error);
      throw error;
    }
  }

  /**
   * Load Paystack script dynamically
   */
  private loadPaystackScript() {
    if (typeof window !== 'undefined' && !(window as any).PaystackPop) {
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }
}
