# Payment Webhook API Documentation

This document outlines the webhook endpoints provided by the Conversational Commerce platform for receiving and processing payment notifications from various payment providers.

## Security Measures

All webhook endpoints implement the following security measures:

- **Signature Verification**: Validates that the webhook was sent by the legitimate payment provider
- **IP Whitelisting**: Only allows requests from the payment provider's official IP ranges
- **Idempotency**: Prevents duplicate processing of the same webhook event
- **Rate Limiting**: Protects against DoS attacks (configured at infrastructure level)

## Configuration Requirements

| Environment Variable | Description | Required |
|---------------------|-------------|----------|
| `PAYSTACK_SECRET_KEY` | Paystack secret key used for signature verification | Yes |
| `VALIDATE_WEBHOOK_IPS` | Enable/disable IP validation (should be enabled in production) | Yes |
| `PAYSTACK_WEBHOOK_IPS` | Comma-separated list of Paystack IP ranges | Yes |
| `MPESA_WEBHOOK_IPS` | Comma-separated list of M-Pesa IP ranges | Yes |

## Endpoints

### Paystack Webhook

**Endpoint:** `POST /api/v1/webhooks/paystack`

Processes webhooks from Paystack payment provider.

**Headers:**
- `X-Paystack-Signature`: HMAC SHA-512 signature of the request body

**Example Payload:**
```json
{
  "event": "charge.success",
  "data": {
    "id": 12345,
    "reference": "PAYMENT_REFERENCE",
    "amount": 10000,
    "status": "success",
    "customer": {
      "email": "customer@example.com"
    }
  },
  "id": "evt_12345"
}
```

**Response:**
- `200 OK`: Webhook processed successfully
- `401 Unauthorized`: Invalid signature
- `403 Forbidden`: IP not in whitelist
- `422 Unprocessable Entity`: Invalid payload format

### M-Pesa Webhook

**Endpoint:** `POST /api/v1/webhooks/mpesa`

Processes webhooks from M-Pesa payment provider.

**Example Payload:**
```json
{
  "Body": {
    "stkCallback": {
      "MerchantRequestID": "12345",
      "CheckoutRequestID": "ws_CO_123456789",
      "ResultCode": 0,
      "ResultDesc": "The service request is processed successfully.",
      "CallbackMetadata": {
        "Item": [
          {"Name": "Amount", "Value": 1000.00},
          {"Name": "MpesaReceiptNumber", "Value": "RECEIPT123"},
          {"Name": "TransactionDate", "Value": 20250626185430},
          {"Name": "PhoneNumber", "Value": "254712345678"}
        ]
      }
    }
  }
}
```

**Response:**
- `200 OK`: Webhook processed successfully
- `403 Forbidden`: IP not in whitelist
- `422 Unprocessable Entity`: Invalid payload format

## Idempotency

All webhook endpoints implement idempotency to prevent duplicate processing. Each webhook event is identified by its unique event ID provided by the payment provider. If the same event is received multiple times, only the first one will be processed.

## Error Handling

Webhook endpoints follow these error handling principles:
1. Always return 200 OK once the webhook is received and validated
2. Process webhooks asynchronously when possible
3. Log all errors for troubleshooting but don't expose sensitive details in responses

## Monitoring and Alerts

The webhook system is monitored using the following metrics:
- `webhook_received_total`: Counter of total webhooks received, labeled by provider
- `webhook_processed_total`: Counter of processed webhooks, labeled by provider and result
- `webhook_processing_duration_seconds`: Histogram of webhook processing time

Alerts are configured for:
- High rate of webhook failures
- Processing time exceeding threshold
- Unusual webhook volume
