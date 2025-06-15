import type { PaymentInitializeRequest, PaymentInitializeResponse } from '../../models/payment';

export class StripeProvider {
  private publicKey: string;
  private stripe: any;

  constructor(publicKey: string) {
    this.publicKey = publicKey;
    if (typeof window !== 'undefined' && (window as any).Stripe) {
      this.stripe = (window as any).Stripe(this.publicKey);
    } else {
      this.loadStripeScript();
    }
  }

  async initializePayment(request: PaymentInitializeRequest): Promise<PaymentInitializeResponse> {
    // Call backend to get client_secret
    const response = await fetch('/api/v1/payments/initialize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to initialize Stripe payment');
    }
    const data = await response.json();
    return data.payment;
  }

  async createPaymentWidget(
    clientSecret: string,
    onSuccess: () => void,
    onError: (error: any) => void,
  ) {
    if (!this.stripe) {
      this.stripe = (window as any).Stripe(this.publicKey);
    }
    try {
      const elements = this.stripe.elements();
      const card = elements.create('card');
      card.mount('#card-element');
      const form = document.getElementById('payment-form');
      if (form) {
        form.addEventListener('submit', async (event) => {
          event.preventDefault();
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
        });
      }
    } catch (error) {
      onError(error);
    }
  }

  private loadStripeScript() {
    if (typeof window !== 'undefined' && !(window as any).Stripe) {
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.async = true;
      script.onload = () => {
        this.stripe = (window as any).Stripe(this.publicKey);
      };
      document.body.appendChild(script);
    }
  }
}
