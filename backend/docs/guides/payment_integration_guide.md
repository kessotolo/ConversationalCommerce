# Payment Integration Guide

## Overview

This guide documents the payment integration system in the Conversational Commerce platform, covering supported payment providers (M-Pesa, Paystack, manual payments), webhook handling, security measures, and how to extend the system with new payment providers.

## Architecture

The payment system follows these architectural principles:

1. **Provider Abstraction**: All payment providers implement a common interface
2. **Security First**: All payment flows incorporate encryption, signature verification, and idempotency
3. **Event-Driven**: Payment state changes emit events for downstream processing
4. **Multi-Provider**: Support for multiple payment methods with unified handling
5. **Offline-Compatible**: Support for offline/manual payment verification

```
┌───────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Payment  │     │ PaymentProvider │     │ Payment Gateway │
│  Service  ├────►│    Interface    ├────►│   (External)    │
└───────────┘     └─────────────────┘     └─────────────────┘
                         │
                         │
                  ┌──────┴──────┐
                  │             │
           ┌──────▼──┐   ┌──────▼──┐
           │ M-Pesa  │   │ Paystack │
           └─────────┘   └─────────┘
```

## Supported Payment Providers

### M-Pesa

M-Pesa integration uses the Daraja API with both STK Push and USSD fallback:

```python
# Sample initialization
mpesa_provider = MPesaProvider(
    consumer_key=settings.MPESA_CONSUMER_KEY,
    consumer_secret=settings.MPESA_CONSUMER_SECRET,
    shortcode=settings.MPESA_SHORTCODE,
    passkey=settings.MPESA_PASSKEY,
    callback_url=settings.MPESA_CALLBACK_URL
)
```

Key features:

- STK Push for smartphone users
- USSD fallback for feature phones
- Automatic transaction verification
- Webhook handling for status updates

### Paystack

Paystack integration supports card payments and bank transfers:

```python
# Sample initialization
paystack_provider = PaystackProvider(
    secret_key=settings.PAYSTACK_SECRET_KEY,
    public_key=settings.PAYSTACK_PUBLIC_KEY,
    webhook_secret=settings.PAYSTACK_WEBHOOK_SECRET
)
```

Key features:

- Card payment processing
- Bank transfer support
- Payment link generation
- Webhook verification

### Manual/Offline Payments

The system supports manual payment verification for:

- Cash on delivery (COD)
- Bank transfers
- Mobile money with manual verification

## PaymentService Core Methods

### Initializing a Payment

```python
# Create a new payment
payment = await payment_service.create_payment(
    order_id=order.id,
    amount=order.total_amount,
    currency="KES",
    provider=PaymentProvider.MPESA,
    payment_method=PaymentMethod.MOBILE_MONEY,
    customer_details=customer
)
```

### Processing a Payment

```python
# Process payment via selected provider
result = await payment_service.process_payment(
    payment_id=payment.id,
    provider_data={
        "phone_number": "+254712345678"
    }
)
```

### Handling Manual Payments

```python
# Submit proof of manual payment
proof_id = await payment_service.submit_manual_payment_proof(
    order_id=order.id,
    proof_type=ProofType.BANK_TRANSFER,
    proof_reference="TXN123456",
    proof_image_url="https://example.com/receipt.jpg",
    additional_notes="Paid via KCB mobile banking"
)

# Admin confirmation of manual payment
await payment_service.confirm_manual_payment(
    payment_id=payment.id,
    admin_id=admin_user.id,
    is_verified=True,
    notes="Receipt validated and confirmed"
)
```

## Webhook Handling

### Webhook Routes

All payment provider webhooks are exposed via dedicated endpoints:

```python
@router.post("/webhook/mpesa", response_model=Dict)
async def mpesa_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    # Verify signature and process webhook
    ...
```

### Security Measures

All webhooks implement:

1. **Signature Verification**:

```python
# Verify webhook signature
is_valid = PaymentSecurity.verify_webhook_signature(
    provider=PaymentProvider.PAYSTACK,
    payload=request_data,
    signature=request.headers.get("x-paystack-signature")
)
if not is_valid:
    raise HTTPException(status_code=400, detail="Invalid signature")
```

2. **Idempotency**:

```python
# Check for duplicate webhook processing
if await payment_service.is_transaction_processed(transaction_ref):
    return {"status": "success", "message": "Already processed"}
```

3. **Risk Scoring**:

```python
# Score transaction risk
risk_score = PaymentSecurity.calculate_risk_score(
    amount=payment.amount,
    user_id=payment.user_id,
    provider=payment.provider
)
if risk_score > settings.HIGH_RISK_THRESHOLD:
    await payment_security.flag_high_risk_transaction(payment.id, risk_score)
```

## Payment Event System

Payments emit events that integrate with the platform's event system:

```python
# Payment events
await event_bus.publish(PaymentProcessedEvent(
    payment_id=payment.id,
    order_id=order.id,
    amount=payment.amount,
    provider=payment.provider
))
```

## Extending with New Payment Providers

### Creating a New Provider

1. Implement the `PaymentProviderInterface`:

```python
from app.services.payment.provider_interface import PaymentProviderInterface

class NewPaymentProvider(PaymentProviderInterface):
    def __init__(self, api_key, webhook_secret):
        self.api_key = api_key
        self.webhook_secret = webhook_secret

    async def initialize_payment(self, payment):
        # Initialize payment with provider
        pass

    async def verify_payment(self, reference):
        # Verify payment status
        pass

    async def process_webhook(self, payload):
        # Process webhook data
        pass
```

2. Register the provider in `PaymentService`:

```python
# In payment_service.py
self.providers = {
    PaymentProvider.MPESA: MPesaProvider(...),
    PaymentProvider.PAYSTACK: PaystackProvider(...),
    PaymentProvider.NEW_PROVIDER: NewPaymentProvider(...)
}
```

3. Add webhook endpoint:

```python
@router.post("/webhook/new-provider", response_model=Dict)
async def new_provider_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    payload = await request.json()
    signature = request.headers.get("x-signature")

    # Verify signature
    is_valid = PaymentSecurity.verify_webhook_signature(
        provider=PaymentProvider.NEW_PROVIDER,
        payload=payload,
        signature=signature
    )

    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Process webhook asynchronously
    background_tasks.add_task(
        process_new_provider_webhook,
        db,
        payload
    )

    return {"status": "success"}
```

## Testing Payment Integrations

### Mock Providers

Use mock providers for testing:

```python
class MockPaymentProvider(PaymentProviderInterface):
    async def initialize_payment(self, payment):
        return {"reference": f"mock-{payment.id}", "status": "pending"}

    async def verify_payment(self, reference):
        # Always succeeds in test mode
        return {"status": "success", "amount": 1000.00}
```

### Simulating Webhooks

Test webhook handling:

```python
# Generate a test webhook payload
payload = {
    "event": "charge.success",
    "data": {
        "reference": payment.provider_reference,
        "amount": payment.amount * 100,
        "status": "success"
    }
}

# Generate signature
signature = PaymentSecurity.generate_webhook_signature(
    provider=PaymentProvider.PAYSTACK,
    payload=payload,
    secret=settings.PAYSTACK_WEBHOOK_SECRET
)

# Send test webhook
response = client.post(
    "/api/v1/payments/webhook/paystack",
    json=payload,
    headers={"x-paystack-signature": signature}
)
```

## Security Best Practices

1. **Environment Variables**: Store all API keys and secrets in environment variables
2. **Encrypted Storage**: Encrypt sensitive payment data at rest
3. **TLS Only**: Use HTTPS for all payment endpoints
4. **IP Whitelisting**: Restrict webhook endpoints to provider IP ranges
5. **Request Validation**: Validate all payment request parameters
6. **Amount Verification**: Verify payment amount matches expected amount
7. **Audit Logging**: Log all payment operations for audit
8. **Rate Limiting**: Apply rate limits to prevent abuse

### Required Environment Variables

The following environment variables must be set for payment integrations to work properly:

```
# Paystack API credentials
PAYSTACK_SECRET_KEY=your_paystack_secret_key

# Flutterwave API credentials
FLUTTERWAVE_SECRET_KEY=your_flutterwave_secret_key

# Stripe API credentials
STRIPE_SECRET_KEY=your_stripe_secret_key

# M-Pesa API credentials
MPESA_CONSUMER_KEY=your_mpesa_consumer_key
MPESA_CONSUMER_SECRET=your_mpesa_consumer_secret
MPESA_SHORTCODE=your_mpesa_shortcode
MPESA_PASSKEY=your_mpesa_passkey
```

These variables are loaded by the application's settings module and should be set in your environment or in a `.env` file in the project root (not versioned in git).

## Common Issues and Solutions

1. **Webhook Failures**:

   - Check webhook URL accessibility
   - Verify signature calculation
   - Inspect webhook logs

2. **Payment Timeouts**:

   - Implement asynchronous processing
   - Add background status checking

3. **Failed Verifications**:
   - Check provider API status
   - Verify correct implementation of provider APIs
   - Check for currency/amount formatting issues

## Payment Flow Diagrams

### Standard Online Payment Flow

```
Customer → Select Payment Method → Provider Checkout → Provider Gateway → Success/Failure
   ↓                                                                           ↓
   ↓                                                                           ↓
Order Created                                                        Order Status Updated
   ↓                                                                           ↓
   ↓                                                                           ↓
Payment Record Created                                               Events Triggered
                                                                              ↓
                                                                              ↓
                                                           Notifications, Fulfillment, Analytics
```

### Manual/Offline Payment Flow

```
Customer → Submit Payment Proof → Admin Review → Accept/Reject → Order Status Updated
   ↓                                                                   ↓
   ↓                                                                   ↓
Order Created                                                   Events Triggered
                                                                       ↓
                                                                       ↓
                                                     Notifications, Fulfillment, Analytics
```

## Per-Tenant Payment Test Mode

Each tenant can enable test mode for any payment provider in their payment settings. When test mode is enabled:
- The platform uses the provider's test API keys (Stripe, Paystack, Flutterwave, etc.)
- Only test cards are accepted; no real charges are made
- A prominent banner is shown in the checkout UI with test card instructions

### How to Enable Test Mode
- Go to the Payment Settings in the admin dashboard
- Toggle 'Enable Test Mode' for the desired provider
- Save your settings

### Provider-Specific Test Card Instructions
- **Stripe:** 4242 4242 4242 4242 (any future date, any CVC)
- **Paystack:** 4084 0840 8408 4081 (any future date, any CVC)
- **Flutterwave:** 5531 8866 5214 2950 (PIN: 1234, Exp: 09/32, CVV: 564)

### Technical Details
- The `test_mode` flag in `PaymentProviderConfig` determines if test keys are used for a provider
- Backend logic automatically switches to test keys when `test_mode` is enabled
- Frontend displays test mode banners and instructions to users
