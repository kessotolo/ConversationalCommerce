# Payment System Security Documentation

## Security Architecture Overview

The Conversational Commerce platform implements comprehensive security measures for its multi-provider payment system. This document outlines the security controls, data protection mechanisms, and best practices implemented to protect payment transactions across Paystack, Flutterwave, and manual bank transfers.

## Data Protection

### Encryption

- **Sensitive Data Encryption**: All sensitive payment data (API keys, account numbers, credentials) are encrypted at rest using Fernet symmetric encryption
- **Key Derivation**: PBKDF2HMAC with SHA-256 is used for key derivation with 100,000 iterations
- **Environment-Based Keys**: Encryption keys are stored in environment variables, not in code
- **Data Masking**: Sensitive data is masked in logs and API responses

```python
# Example of data masking implementation
masked_data = mask_sensitive_data(payment_data)
# Card numbers: first 6 and last 4 digits visible (e.g., 411111******1111)
# Other sensitive fields: only first and last character visible
```

## API Security

### Input Validation & Sanitization

- **Schema Validation**: Enhanced Pydantic models with strict validation rules
- **Type Safety**: Strong type checking for all payment-related data
- **Sanitization**: Input sanitization to prevent injection attacks
- **Amount Validation**: Validation of payment amounts to prevent tampering

### Authentication & Authorization

- **JWT Authentication**: Required for all payment endpoints
- **Role-Based Access Control**: Specific roles required for payment management
- **Permission Checks**: Store owner/admin verification for settings management
- **API Keys**: Separate API keys for external services and webhooks

### Rate Limiting & Abuse Prevention

- **Endpoint-Specific Limits**:

  - Payment initialization: 10 requests/minute
  - Payment verification: 20 requests/minute
  - Webhooks: 100 requests/minute
  - Settings management: 20 requests/minute

- **Progressive Throttling**: Increased restrictions after repeated failures
- **IP Blacklisting**: Automatic blocking of IPs with suspicious patterns
- **Velocity Checks**: Detection of rapid-fire payment attempts

```python
# Rate limit configuration example
RATE_LIMIT_CONFIG = {
    "payment:initialize": {"limit": 10, "window": 60},  # 10 requests per minute
    "payment:verify": {"limit": 20, "window": 60},      # 20 requests per minute
    "payment:webhook": {"limit": 100, "window": 60},    # 100 requests per minute
    "payment:settings": {"limit": 20, "window": 60}     # 20 requests per minute
}
```

## Webhook Security

- **Signature Verification**: HMAC-based signature verification for all webhook payloads
- **Provider-Specific Verification**:
  - Paystack: SHA-512 HMAC verification
  - Flutterwave: SHA-256 verification with secret
- **Replay Protection**: Idempotency keys to prevent duplicate processing

## Payment References & Tokens

- **JWT-Based References**: Signed payment references with expiration
- **Tampering Detection**: Validation of reference integrity throughout lifecycle
- **Secure Token Generation**: Cryptographically secure random token generation

```python
# Example of secure payment reference generation
def generate_payment_reference(order_id: str, tenant_id: str, timestamp: Optional[int] = None) -> str:
    if not timestamp:
        timestamp = int(datetime.utcnow().timestamp())
    payload = {
        "order_id": order_id,
        "tenant_id": tenant_id,
        "ts": timestamp
    }
    token = jwt.encode(payload, PAYMENT_REF_SECRET, algorithm="HS256")
    return token
```

## TLS & Network Security

- **Minimum TLS Version**: TLS 1.2+ enforced for all API communications
- **Certificate Validation**: Proper certificate validation for outbound requests
- **HTTPS Only**: All payment endpoints require HTTPS

## Fraud Detection

- **Risk Scoring System**: Calculation of risk scores based on multiple factors:
  - Transaction amount anomalies
  - Velocity (multiple rapid transactions)
  - IP address reputation
  - Geolocation mismatches
  - User agent analysis

```python
# Risk scoring example
def calculate_payment_risk(
    amount: float,
    user_id: Optional[str],
    ip_address: Optional[str],
    user_agent: Optional[str],
    recent_attempts: int = 0,
    country_mismatch: bool = False,
    ip_reputation_score: float = 0.0
) -> float:
    """Calculate risk score (0-1, higher is riskier)"""
    score = 0.0
    # High amount
    if amount > 1000: score += 0.2
    if amount > 5000: score += 0.2
    # Velocity
    if recent_attempts > 3: score += 0.2
    if recent_attempts > 10: score += 0.3
    # IP reputation
    if ip_reputation_score > 0.7: score += 0.2
    # Country mismatch
    if country_mismatch: score += 0.2
    # User agent anomaly
    if not user_agent or user_agent.lower() in ["curl", "python-requests", "httpclient"]:
        score += 0.1
    return min(score, 1.0)
```

## Audit Logging

- **Comprehensive Audit Trail**: Logging of all payment-related activities
- **Security Events**: Special logging for security-related events
- **Non-Repudiation**: Recording of user IDs, IP addresses, and timestamps
- **Tamper-Evident Logs**: Logs designed to detect manipulation

## Error Handling & Security

- **Secure Error Messages**: Non-revealing error messages for production
- **Logging of Exceptions**: Detailed internal logging of payment errors
- **Graceful Degradation**: System remains functional even with partial failures

## Security Monitoring & Response

### Alerts & Monitoring

- **Suspicious Activity Alerts**: Monitoring for unusual payment patterns
- **Threshold Alerting**: Alerts for high-risk score payments
- **Rate Limit Breach Monitoring**: Notification of rate limit violations

### Incident Response

- **Payment Freeze Capability**: Ability to freeze suspicious payments
- **Rollback Procedures**: Procedures to handle fraudulent payment attempts
- **Security Contact**: Dedicated security contact for payment-related issues

## Provider-Specific Security

### Paystack

- **Webhook Verification**: SHA-512 HMAC signature validation
- **API Authentication**: Secret key authentication for all API calls
- **Transaction Verification**: Server-side verification of all payments

### Flutterwave

- **Webhook Hash**: Verification of signature hash for all webhooks
- **Encryption**: Support for payload encryption (where applicable)
- **Transaction Reference Validation**: Verification of tx_ref for all payments

### Manual Bank Transfers

- **Proof Validation**: Admin verification of submitted payment proofs
- **Image Validation**: Client and server-side validation of uploaded screenshots
- **Double-Approval**: Requirement for manual admin approval

## Security Best Practices for Development

### Code Security

- **Dependency Management**: Regular updates of payment-related dependencies
- **Code Reviews**: Mandatory security-focused code reviews for payment code
- **Static Analysis**: Regular static analysis of payment code

### Testing

- **Security Testing**: Regular penetration testing of payment flows
- **Fuzzing**: Input fuzzing for payment endpoints
- **Compliance Testing**: Testing against payment card industry standards

## Environment & Configuration

- **Environment Variables**: Storage of sensitive values in environment variables
- **Secrets Management**: No hardcoded secrets in code repositories
- **Production Hardening**: Additional security measures for production

## Compliance Considerations

- **PCI DSS**: Considerations for Payment Card Industry Data Security Standard
- **GDPR**: Handling of EU customer payment data
- **Local Regulations**: Compliance with local payment regulations

## Deployment Security

- **Secure CI/CD**: Security-focused deployment pipeline
- **Access Controls**: Limited access to payment system deployment
- **Immutable Infrastructure**: Immutable deployment practices

## Security Roadmap

- **Regular Security Reviews**: Quarterly review of payment security
- **Threat Modeling Updates**: Regular updates to threat models
- **Security Training**: Ongoing security training for developers

---

_This document should be reviewed and updated regularly as part of the security maintenance process._
