import {
  PaymentInitializeRequest,
  PaymentInitializeResponse,
  PaymentProvider,
} from '../../models/payment';

/**
 * Flutterwave provider implementation
 * Handles integration with Flutterwave payment gateway
 */
export class FlutterwaveProvider {
  private publicKey: string;
  private encryptionKey?: string;

  constructor(publicKey: string, encryptionKey?: string) {
    this.publicKey = publicKey;
    this.encryptionKey = encryptionKey;
  }

  /**
   * Initialize a payment with Flutterwave
   */
  async initializePayment(request: PaymentInitializeRequest): Promise<PaymentInitializeResponse> {
    try {
      const response = await fetch('https://api.flutterwave.com/v3/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.publicKey}`,
        },
        body: JSON.stringify({
          tx_ref: `order_${request.order_id}_${Date.now()}`,
          amount: request.amount.value,
          currency: request.amount.currency,
          redirect_url: request.redirect_url || window.location.origin + '/checkout/confirmation',
          customer: {
            email: request.customer_email,
            name: request.customer_name,
            phonenumber: request.customer_phone,
          },
          meta: {
            order_id: request.order_id,
            provider: PaymentProvider.FLUTTERWAVE,
            ...request.metadata,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to initialize Flutterwave payment');
      }

      const data = await response.json();

      return {
        checkout_url: data.data.link,
        reference: data.data.tx_ref,
        payment_link: data.data.link,
      };
    } catch (error) {
      console.error('Flutterwave initialization error:', error);
      throw error;
    }
  }

  /**
   * Create inline Flutterwave payment modal
   */
  createPaymentWidget(
    amount: number,
    currency: string,
    email: string,
    name: string,
    phone: string,
    reference: string,
    onSuccess: (reference: string, transactionId: string) => void,
    onClose: () => void,
  ) {
    if (typeof window === 'undefined' || !(window as any).FlutterwaveCheckout) {
      this.loadFlutterwaveScript();
    }

    try {
      const config = {
        public_key: this.publicKey,
        tx_ref: reference,
        amount: amount,
        currency: currency,
        payment_options: 'card, banktransfer, ussd, account, mpesa, mobilemoneyghana',
        customer: {
          email: email,
          phone_number: phone,
          name: name,
        },
        customizations: {
          title: 'Payment for your order',
          description: 'Complete your purchase',
          logo: window.location.origin + '/logo.png',
        },
        callback: (response: any) => {
          onSuccess(response.tx_ref, response.transaction_id);
        },
        onclose: onClose,
      };

      // @ts-ignore
      window.FlutterwaveCheckout(config);
    } catch (error) {
      console.error('Error creating Flutterwave widget:', error);
      throw error;
    }
  }

  /**
   * Load Flutterwave script dynamically
   */
  private loadFlutterwaveScript() {
    if (typeof window !== 'undefined' && !(window as any).FlutterwaveCheckout) {
      const script = document.createElement('script');
      script.src = 'https://checkout.flutterwave.com/v3.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }

  /**
   * Encrypt payload with encryption key (optional security enhancement)
   */
  private encryptPayload(payload: any): string | undefined {
    if (!this.encryptionKey || typeof window === 'undefined') {
      return undefined;
    }

    try {
      // Implement encryption using the encryption key
      // This would require a proper encryption library
      // For the sake of this example, we'll return undefined
      return undefined;
    } catch (error) {
      console.error('Encryption error:', error);
      return undefined;
    }
  }
}
