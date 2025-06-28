import { PaymentProvider } from '@/modules/payment/models/payment';
import type {
  PaymentInitializeRequest,
  PaymentInitializeResponse,
} from '@/modules/payment/models/payment';

/**
 * Flutterwave provider implementation
 * Handles integration with Flutterwave payment gateway
 */
export class FlutterwaveProvider {
  private publicKey: string;
  // Encryption key currently unused - will be needed when encryption is implemented
  // private encryptionKey: string | undefined;

  constructor(publicKey: string, encryptionKey?: string) {
    this.publicKey = publicKey;
    // Store encryption key when encryption is implemented
    // this.encryptionKey = encryptionKey;
  }

  /**
   * Initialize a payment with Flutterwave
   */
  async initializePayment(request: PaymentInitializeRequest): Promise<PaymentInitializeResponse> {
    if (typeof fetch === 'undefined') throw new Error('fetch is not available');
    try {
      const response = await fetch('https://api.flutterwave.com/v3/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.publicKey}`,
        },
        body: JSON.stringify({
          tx_ref: `order_${typeof request.order_id === 'string' ? request.order_id : ''}_${Date.now()}`,
          amount: String(typeof request.amount?.amount === 'number' ? request.amount.amount : 0),
          currency: String(
            typeof request.amount?.currency === 'string' ? request.amount.currency : '',
          ),
          redirect_url: String(
            typeof request.redirect_url === 'string'
              ? request.redirect_url
              : typeof window !== 'undefined'
                ? `${window.location.origin}/checkout/confirmation`
                : '',
          ),
          customer: {
            email: String(typeof request.customer_email === 'string' ? request.customer_email : ''),
            name: String(typeof request.customer_name === 'string' ? request.customer_name : ''),
            phonenumber: String(
              typeof request.customer_phone === 'string' ? request.customer_phone : '',
            ),
          },
          meta: {
            order_id: String(typeof request.order_id === 'string' ? request.order_id : ''),
            provider: String(PaymentProvider.FLUTTERWAVE),
            ...request.metadata,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message ?? 'Failed to initialize Flutterwave payment');
      }

      const data = await response.json();

      return {
        checkout_url: data.data.link,
        reference: data.data.tx_ref,
        payment_link: data.data.link,
      };
    } catch (error) {
      if (typeof console !== 'undefined') console.error('Flutterwave initialization error:', error);
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
    if (
      typeof window === 'undefined' ||
      typeof (window as unknown as FlutterwaveWindow).FlutterwaveCheckout !== 'function'
    ) {
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
          logo: typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : '',
        },
        callback: (response: unknown) => {
          if (
            typeof response === 'object' &&
            response !== null &&
            'tx_ref' in response &&
            typeof (response as { tx_ref: unknown }).tx_ref === 'string' &&
            'transaction_id' in response &&
            typeof (response as { transaction_id: unknown }).transaction_id === 'string'
          ) {
            onSuccess(
              (response as { tx_ref: string }).tx_ref,
              (response as { transaction_id: string }).transaction_id,
            );
          } else {
            if (typeof console !== 'undefined')
              console.error(
                'Flutterwave callback response missing tx_ref or transaction_id:',
                response,
              );
          }
        },
        onclose: onClose,
      };

      if (
        typeof window !== 'undefined' &&
        typeof (window as unknown as FlutterwaveWindow).FlutterwaveCheckout === 'function'
      ) {
        (window as unknown as FlutterwaveWindow).FlutterwaveCheckout?.(config);
      }
    } catch (error) {
      if (typeof console !== 'undefined')
        console.error('Error creating Flutterwave widget:', error);
      throw error;
    }
  }

  /**
   * Load Flutterwave script dynamically
   */
  private loadFlutterwaveScript() {
    if (
      typeof window !== 'undefined' &&
      typeof (window as unknown as FlutterwaveWindow).FlutterwaveCheckout !== 'function'
    ) {
      const script = typeof document !== 'undefined' ? document.createElement('script') : undefined;
      if (typeof document !== 'undefined' && script) {
        document.body.appendChild(script);
      }
    }
  }

  /**
   * Encrypt payload with encryption key (optional security enhancement)
   * Currently unused but may be needed in future implementation
   * 
   * @param payload - The data to encrypt
   * @returns The encrypted data or undefined if encryption fails
   */
  // private encryptPayload(payload: unknown): string | undefined {
  //   if (!this.encryptionKey || typeof window === 'undefined') {
  //     return undefined;
  //   }
  // 
  //   try {
  //     // Implement encryption using the encryption key
  //     // This would require a proper encryption library
  //     // For the sake of this example, we'll return undefined
  //     return undefined;
  //   } catch (error) {
  //     if (typeof console !== 'undefined') console.error('Encryption error:', error);
  //     return undefined;
  //   }
  // }
}

// Define a type for window with FlutterwaveCheckout
interface FlutterwaveWindow extends Window {
  FlutterwaveCheckout?: (config: unknown) => void;
}
