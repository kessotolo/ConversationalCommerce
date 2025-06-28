import type {
  PaymentInitializeRequest,
  PaymentInitializeResponse,
} from '@/modules/payment/models/payment';

// Define a type for window with Stripe
interface StripeWindow extends Window {
  Stripe?: (publicKey: string) => unknown;
}

export class StripeProvider {
  private publicKey: string;
  private stripe: any;

  constructor(publicKey: string) {
    this.publicKey = publicKey;
    if (typeof window !== 'undefined' && typeof (window as StripeWindow).Stripe === 'function') {
      this.stripe = (window as StripeWindow).Stripe!(this.publicKey);
    } else {
      this.loadStripeScript();
    }
  }

  async initializePayment(request: PaymentInitializeRequest): Promise<PaymentInitializeResponse> {
    if (typeof fetch === 'undefined') throw new Error('fetch is not available');
    const response = await fetch('/api/v1/payments/initialize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message ?? 'Failed to initialize Stripe payment');
    }
    const data = await response.json();
    return data.payment;
  }

  async createPaymentWidget(
    clientSecret: string,
    onSuccess: () => void,
    onError: (error: unknown) => void,
  ) {
    if (
      !this.stripe &&
      typeof window !== 'undefined' &&
      typeof (window as StripeWindow).Stripe === 'function'
    ) {
      this.stripe = (window as StripeWindow).Stripe!(this.publicKey);
    }
    try {
      if (
        typeof this.stripe === 'object' &&
        this.stripe !== null &&
        'elements' in this.stripe &&
        typeof this.stripe.elements === 'function'
      ) {
        const elements = this.stripe.elements();
        const card = elements.create('card');
        card.mount('#card-element');
        if (typeof document !== 'undefined') {
          const form = document.getElementById('payment-form');
          if (form) {
            form.addEventListener('submit', async (event) => {
              event.preventDefault();
              if (typeof this.stripe.confirmCardPayment === 'function') {
                const { error, paymentIntent } = await this.stripe.confirmCardPayment(clientSecret, {
                  payment_method: {
                    card: card,
                  },
                });
                if (error) {
                  onError(error);
                } else if (paymentIntent && paymentIntent.status === 'succeeded') {
                  onSuccess();
                }
              } else {
                onError(new Error('Stripe confirmCardPayment not available'));
              }
            });
          }
        }
      } else {
        onError(new Error('Stripe elements not available'));
      }
    } catch (error) {
      onError(error);
    }
  }

  private loadStripeScript() {
    if (typeof window !== 'undefined' && typeof (window as StripeWindow).Stripe !== 'function') {
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.async = true;
      script.onload = () => {
        if (
          typeof window !== 'undefined' &&
          typeof (window as StripeWindow).Stripe === 'function'
        ) {
          this.stripe = (window as StripeWindow).Stripe!(this.publicKey);
        }
      };
      if (typeof document !== 'undefined') {
        document.body.appendChild(script);
      }
    }
  }
}
