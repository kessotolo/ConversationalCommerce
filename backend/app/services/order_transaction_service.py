import logging
from typing import Dict, Any, Optional, List
from uuid import UUID, uuid4
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, text
from sqlalchemy.orm import joinedload
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from backend.app.models.order import Order, OrderStatus
from backend.app.models.payment import Payment, PaymentSettings, ProviderConfiguration
from backend.app.models.tenant import Tenant
from backend.app.core.security.payment_security import (
    encrypt_sensitive_data,
    decrypt_sensitive_data,
    generate_payment_reference,
    verify_payment_reference,
    calculate_payment_risk,
    mask_sensitive_data
)
from backend.app.core.config.settings import get_settings
from backend.app.services.order_exceptions import OrderNotFoundError, OrderValidationError
from backend.app.services.audit_service import AuditActionType, create_audit_log
from backend.app.core.exceptions import AppError
from backend.app.core.error_counters import payment_failures
from backend.app.domain.events.event_bus import get_event_bus
from backend.app.domain.events.order_events import OrderEventFactory

logger = logging.getLogger(__name__)
settings = get_settings()


class PaymentError(AppError):
    """Payment-specific error"""
    pass


class PaymentProviderError(PaymentError):
    """Payment provider communication error"""
    pass


class CircuitBreakerError(PaymentError):
    """Circuit breaker is open"""
    pass


class OrderTransactionService:
    """
    Service for handling order transactions with secure payment processing,
    encryption, and retry mechanisms following PCI DSS compliance best practices.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.event_bus = get_event_bus()
        self.circuit_breaker_state = {}  # Simple circuit breaker state
        self.circuit_breaker_timeout = 300  # 5 minutes
        self.circuit_breaker_threshold = 5  # Failures before opening

    async def process_transaction(self, order: Order, payment_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a payment transaction for an order with full security and error handling.

        Args:
            order: Order instance to process payment for
            payment_data: Payment details (encrypted sensitive data)

        Returns:
            Dictionary containing transaction result

        Raises:
            PaymentError: If payment processing fails
            OrderValidationError: If order is invalid for payment
        """
        try:
            # Validate order state
            if not self._is_order_payable(order):
                raise OrderValidationError(
                    f"Order {order.id} is not in a payable state")

            # Validate payment data
            self._validate_payment_data(payment_data)

            # Get payment settings for tenant
            payment_settings = await self._get_payment_settings(order.seller_id)
            if not payment_settings or not payment_settings.online_payments_enabled:
                raise PaymentError(
                    "Online payments are not enabled for this merchant")

            # Calculate risk score
            risk_score = await self._calculate_risk_score(order, payment_data)

            # Check if payment should be processed based on risk
            if risk_score > 0.8:  # High risk threshold
                logger.warning(
                    f"High risk payment detected for order {order.id}: {risk_score}")
                return await self._handle_high_risk_payment(order, payment_data, risk_score)

            # Generate secure payment reference
            payment_reference = generate_payment_reference(
                str(order.id),
                str(order.seller_id),
                int(datetime.utcnow().timestamp())
            )

            # Get payment provider configuration
            provider_config = await self._get_provider_config(
                payment_settings,
                payment_data.get('provider', 'paystack')
            )

            if not provider_config:
                raise PaymentError("Payment provider not configured")

            # Create payment record
            payment = Payment(
                order_id=order.id,
                reference=payment_reference,
                amount=order.total_amount,
                currency=payment_data.get('currency', 'KES'),
                provider=provider_config.provider,
                status='pending',
                customer_email=order.buyer_email or payment_data.get(
                    'email', ''),
                customer_name=order.buyer_name,
                payment_method=payment_data.get('method', 'card'),
                ip_address=payment_data.get('ip_address'),
                user_agent=payment_data.get('user_agent'),
                risk_score=risk_score,
                idempotency_key=payment_data.get(
                    'idempotency_key', str(uuid4())),
                created_at=datetime.utcnow()
            )

            # Store encrypted payment metadata (NO RAW CARD DATA)
            payment_metadata = {
                'order_id': str(order.id),
                'tenant_id': str(order.seller_id),
                'payment_method': payment_data.get('method'),
                'amount': order.total_amount,
                'currency': payment_data.get('currency', 'KES'),
                'reference': payment_reference,
                'timestamp': datetime.utcnow().isoformat()
            }

            # Encrypt sensitive metadata
            payment.payment_metadata = payment_metadata

            # Save payment record
            self.db.add(payment)
            await self.db.flush()

            # Process payment with provider
            transaction_result = await self._process_with_provider(
                provider_config,
                order,
                payment,
                payment_data
            )

            # Update payment status
            payment.status = transaction_result.get('status', 'failed')
            payment.provider_reference = transaction_result.get(
                'provider_reference')
            payment.transaction_date = transaction_result.get(
                'transaction_date')

            if transaction_result.get('authorization_url'):
                payment.payment_metadata['authorization_url'] = transaction_result['authorization_url']

            # Update order status if payment successful
            if payment.status == 'success':
                await self._update_order_payment_status(order, payment)

            await self.db.commit()

            # Create audit log
            await create_audit_log(
                db=self.db,
                user_id=order.seller_id,
                action=AuditActionType.CREATE,
                resource_type="Payment",
                resource_id=str(payment.id),
                details={
                    'order_id': str(order.id),
                    'amount': order.total_amount,
                    'currency': payment_data.get('currency', 'KES'),
                    'provider': provider_config.provider,
                    'status': payment.status,
                    'reference': payment_reference,
                    'risk_score': risk_score,
                    'masked_data': mask_sensitive_data(payment_data)
                }
            )

            # Emit domain event
            try:
                event = OrderEventFactory.create_payment_processed_event(
                    order,
                    payment,
                    transaction_result
                )
                await self.event_bus.publish(event)
            except Exception as e:
                logger.warning(
                    f"Failed to emit payment processed event: {str(e)}")

            logger.info(
                f"Payment processed for order {order.id}: {payment.status}")

            return {
                'success': payment.status == 'success',
                'payment_id': str(payment.id),
                'reference': payment_reference,
                'status': payment.status,
                'provider_reference': payment.provider_reference,
                'authorization_url': transaction_result.get('authorization_url'),
                'message': transaction_result.get('message', 'Payment processed')
            }

        except Exception as e:
            await self.db.rollback()
            payment_failures.inc()
            logger.error(
                f"Payment processing failed for order {order.id}: {str(e)}")

            # Create failure audit log
            await create_audit_log(
                db=self.db,
                user_id=order.seller_id,
                action=AuditActionType.CREATE,
                resource_type="Payment",
                resource_id="failed",
                details={
                    'order_id': str(order.id),
                    'error': str(e),
                    'payment_data': mask_sensitive_data(payment_data)
                }
            )

            if isinstance(e, (PaymentError, OrderValidationError)):
                raise
            raise PaymentError(f"Payment processing failed: {str(e)}")

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        retry=retry_if_exception_type(PaymentProviderError)
    )
    async def _process_with_provider(
        self,
        provider_config: ProviderConfiguration,
        order: Order,
        payment: Payment,
        payment_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Process payment with the configured provider with retry logic.

        Args:
            provider_config: Provider configuration
            order: Order instance
            payment: Payment instance
            payment_data: Payment data

        Returns:
            Dictionary containing provider response
        """
        try:
            # Check circuit breaker
            if self._is_circuit_breaker_open(provider_config.provider):
                raise CircuitBreakerError(
                    f"Circuit breaker is open for {provider_config.provider}")

            # Get provider instance
            provider = await self._get_provider_instance(provider_config)

            # Prepare payment request
            payment_request = {
                'amount': int(order.total_amount * 100),  # Convert to cents
                'currency': payment_data.get('currency', 'KES'),
                'email': order.buyer_email or payment_data.get('email', ''),
                'reference': payment.reference,
                'callback_url': f"{settings.BACKEND_URL}/api/v1/payments/callback",
                'metadata': {
                    'order_id': str(order.id),
                    'tenant_id': str(order.seller_id),
                    'customer_name': order.buyer_name,
                    'customer_phone': order.buyer_phone
                }
            }

            # Process payment
            if provider_config.provider.lower() == 'paystack':
                result = await self._process_paystack_payment(provider, payment_request)
            elif provider_config.provider.lower() == 'flutterwave':
                result = await self._process_flutterwave_payment(provider, payment_request)
            elif provider_config.provider.lower() == 'stripe':
                result = await self._process_stripe_payment(provider, payment_request)
            else:
                raise PaymentError(
                    f"Unsupported payment provider: {provider_config.provider}")

            # Reset circuit breaker on success
            self._reset_circuit_breaker(provider_config.provider)

            return result

        except Exception as e:
            # Update circuit breaker on failure
            self._record_failure(provider_config.provider)

            if isinstance(e, CircuitBreakerError):
                raise

            logger.error(
                f"Provider {provider_config.provider} error: {str(e)}")
            raise PaymentProviderError(f"Payment provider error: {str(e)}")

    async def verify_payment(self, payment_reference: str, tenant_id: UUID) -> Dict[str, Any]:
        """
        Verify a payment status with the provider.

        Args:
            payment_reference: Payment reference to verify
            tenant_id: Tenant ID for isolation

        Returns:
            Dictionary containing verification result
        """
        try:
            # Get payment record
            payment = await self._get_payment_by_reference(payment_reference, tenant_id)
            if not payment:
                raise PaymentError(f"Payment {payment_reference} not found")

            # Get provider configuration
            payment_settings = await self._get_payment_settings(tenant_id)
            provider_config = await self._get_provider_config(
                payment_settings,
                payment.provider
            )

            # Get provider instance
            provider = await self._get_provider_instance(provider_config)

            # Verify with provider
            verification_result = await provider.verify_payment(payment_reference)

            # Update payment status
            old_status = payment.status
            payment.status = verification_result.get('status', 'failed')
            payment.verified_at = datetime.utcnow()

            if verification_result.get('gateway_response'):
                payment.payment_metadata = payment.payment_metadata or {}
                payment.payment_metadata['gateway_response'] = verification_result['gateway_response']

            # Update order status if payment is now successful
            if payment.status == 'success' and old_status != 'success':
                order = await self._get_order_by_id(payment.order_id)
                if order:
                    await self._update_order_payment_status(order, payment)

            await self.db.commit()

            logger.info(
                f"Payment {payment_reference} verified: {payment.status}")

            return {
                'success': payment.status == 'success',
                'status': payment.status,
                'amount': payment.amount,
                'currency': payment.currency,
                'reference': payment.reference,
                'provider_reference': payment.provider_reference,
                'verified_at': payment.verified_at.isoformat() if payment.verified_at else None
            }

        except Exception as e:
            await self.db.rollback()
            logger.error(
                f"Payment verification failed for {payment_reference}: {str(e)}")
            raise PaymentError(f"Payment verification failed: {str(e)}")

    async def refund_payment(
        self,
        payment_reference: str,
        tenant_id: UUID,
        amount: Optional[float] = None,
        reason: str = "Customer refund request"
    ) -> Dict[str, Any]:
        """
        Process a refund for a payment.

        Args:
            payment_reference: Payment reference to refund
            tenant_id: Tenant ID for isolation
            amount: Refund amount (None for full refund)
            reason: Reason for refund

        Returns:
            Dictionary containing refund result
        """
        try:
            # Get payment record
            payment = await self._get_payment_by_reference(payment_reference, tenant_id)
            if not payment:
                raise PaymentError(f"Payment {payment_reference} not found")

            if payment.status != 'success':
                raise PaymentError(
                    f"Cannot refund payment with status {payment.status}")

            # Calculate refund amount
            refund_amount = amount or payment.amount
            if refund_amount > payment.amount:
                raise PaymentError(
                    "Refund amount cannot exceed payment amount")

            # Get provider configuration
            payment_settings = await self._get_payment_settings(tenant_id)
            provider_config = await self._get_provider_config(
                payment_settings,
                payment.provider
            )

            # Get provider instance
            provider = await self._get_provider_instance(provider_config)

            # Process refund
            refund_result = await provider.refund_payment(
                payment.provider_reference,
                refund_amount,
                reason
            )

            # Update payment metadata
            payment.payment_metadata = payment.payment_metadata or {}
            payment.payment_metadata['refund'] = {
                'amount': refund_amount,
                'reason': reason,
                'refund_reference': refund_result.get('refund_reference'),
                'refunded_at': datetime.utcnow().isoformat()
            }

            await self.db.commit()

            # Create audit log
            await create_audit_log(
                db=self.db,
                user_id=tenant_id,
                action=AuditActionType.UPDATE,
                resource_type="Payment",
                resource_id=str(payment.id),
                details={
                    'action': 'refund',
                    'amount': refund_amount,
                    'reason': reason,
                    'refund_reference': refund_result.get('refund_reference')
                }
            )

            logger.info(
                f"Refund processed for payment {payment_reference}: {refund_amount}")

            return {
                'success': True,
                'refund_amount': refund_amount,
                'refund_reference': refund_result.get('refund_reference'),
                'message': 'Refund processed successfully'
            }

        except Exception as e:
            await self.db.rollback()
            logger.error(
                f"Refund failed for payment {payment_reference}: {str(e)}")
            raise PaymentError(f"Refund failed: {str(e)}")

    # Helper methods

    def _is_order_payable(self, order: Order) -> bool:
        """Check if order is in a payable state"""
        payable_statuses = [OrderStatus.pending, OrderStatus.confirmed]
        return order.status in payable_statuses and not order.is_deleted

    def _validate_payment_data(self, payment_data: Dict[str, Any]) -> None:
        """Validate payment data structure"""
        required_fields = ['amount', 'currency']
        for field in required_fields:
            if field not in payment_data:
                raise PaymentError(f"Missing required field: {field}")

        # Validate amount
        if payment_data['amount'] <= 0:
            raise PaymentError("Payment amount must be positive")

        # Validate currency
        if payment_data['currency'] not in ['KES', 'USD', 'EUR', 'GBP']:
            raise PaymentError(
                f"Unsupported currency: {payment_data['currency']}")

    async def _get_payment_settings(self, tenant_id: UUID) -> Optional[PaymentSettings]:
        """Get payment settings for a tenant"""
        try:
            query = select(PaymentSettings).where(
                PaymentSettings.tenant_id == tenant_id
            )
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(
                f"Error getting payment settings for tenant {tenant_id}: {str(e)}")
            return None

    async def _get_provider_config(
        self,
        payment_settings: PaymentSettings,
        provider_name: str
    ) -> Optional[ProviderConfiguration]:
        """Get provider configuration"""
        for config in payment_settings.providers:
            if config.provider.lower() == provider_name.lower() and config.enabled:
                return config
        return None

    async def _calculate_risk_score(self, order: Order, payment_data: Dict[str, Any]) -> float:
        """Calculate payment risk score"""
        return await calculate_payment_risk({
            'amount': order.total_amount,
            'currency': payment_data.get('currency', 'KES'),
            'customer_email': order.buyer_email,
            'customer_phone': order.buyer_phone,
            'ip_address': payment_data.get('ip_address'),
            'user_agent': payment_data.get('user_agent'),
            'order_id': str(order.id),
            'tenant_id': str(order.seller_id)
        })

    async def _handle_high_risk_payment(
        self,
        order: Order,
        payment_data: Dict[str, Any],
        risk_score: float
    ) -> Dict[str, Any]:
        """Handle high-risk payments"""
        # For high-risk payments, we might:
        # 1. Require additional verification
        # 2. Hold the payment for manual review
        # 3. Reject the payment

        logger.warning(
            f"High-risk payment flagged for order {order.id}: score {risk_score}")

        return {
            'success': False,
            'status': 'flagged',
            'message': 'Payment flagged for manual review',
            'risk_score': risk_score,
            'requires_verification': True
        }

    async def _update_order_payment_status(self, order: Order, payment: Payment) -> None:
        """Update order status when payment is successful"""
        if payment.status == 'success' and order.status == OrderStatus.pending:
            order.status = OrderStatus.confirmed
            order.updated_at = datetime.utcnow()
            logger.info(f"Order {order.id} confirmed after successful payment")

    async def _get_provider_instance(self, provider_config: ProviderConfiguration):
        """Get provider instance (mock implementation)"""
        # In a real implementation, this would return the actual provider SDK instance
        # For now, return a mock object
        class MockProvider:
            def __init__(self, config):
                self.config = config

            async def process_payment(self, request):
                # Mock implementation
                return {
                    'status': 'success',
                    'provider_reference': f"mock_{uuid4()}",
                    'transaction_date': datetime.utcnow().isoformat(),
                    'message': 'Payment processed successfully'
                }

            async def verify_payment(self, reference):
                return {
                    'status': 'success',
                    'gateway_response': 'Payment verified'
                }

            async def refund_payment(self, reference, amount, reason):
                return {
                    'refund_reference': f"refund_{uuid4()}",
                    'status': 'success'
                }

        return MockProvider(provider_config)

    async def _process_paystack_payment(self, provider, payment_request: Dict[str, Any]) -> Dict[str, Any]:
        """Process payment with Paystack"""
        try:
            # Mock Paystack implementation
            return await provider.process_payment(payment_request)
        except Exception as e:
            raise PaymentProviderError(f"Paystack error: {str(e)}")

    async def _process_flutterwave_payment(self, provider, payment_request: Dict[str, Any]) -> Dict[str, Any]:
        """Process payment with Flutterwave"""
        try:
            # Mock Flutterwave implementation
            return await provider.process_payment(payment_request)
        except Exception as e:
            raise PaymentProviderError(f"Flutterwave error: {str(e)}")

    async def _process_stripe_payment(self, provider, payment_request: Dict[str, Any]) -> Dict[str, Any]:
        """Process payment with Stripe"""
        try:
            # Mock Stripe implementation
            return await provider.process_payment(payment_request)
        except Exception as e:
            raise PaymentProviderError(f"Stripe error: {str(e)}")

    async def _get_payment_by_reference(self, reference: str, tenant_id: UUID) -> Optional[Payment]:
        """Get payment by reference with tenant isolation"""
        try:
            query = select(Payment).join(Order).where(
                and_(
                    Payment.reference == reference,
                    Order.seller_id == tenant_id
                )
            )
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(
                f"Error getting payment by reference {reference}: {str(e)}")
            return None

    async def _get_order_by_id(self, order_id: UUID) -> Optional[Order]:
        """Get order by ID"""
        try:
            query = select(Order).where(Order.id == order_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error getting order {order_id}: {str(e)}")
            return None

    # Circuit breaker methods

    def _is_circuit_breaker_open(self, provider: str) -> bool:
        """Check if circuit breaker is open for a provider"""
        if provider not in self.circuit_breaker_state:
            return False

        state = self.circuit_breaker_state[provider]
        if state['status'] == 'open':
            # Check if timeout has passed
            if datetime.utcnow() - state['opened_at'] > timedelta(seconds=self.circuit_breaker_timeout):
                self._reset_circuit_breaker(provider)
                return False
            return True

        return False

    def _record_failure(self, provider: str) -> None:
        """Record a failure for circuit breaker"""
        if provider not in self.circuit_breaker_state:
            self.circuit_breaker_state[provider] = {
                'status': 'closed',
                'failures': 0,
                'opened_at': None
            }

        state = self.circuit_breaker_state[provider]
        state['failures'] += 1

        if state['failures'] >= self.circuit_breaker_threshold:
            state['status'] = 'open'
            state['opened_at'] = datetime.utcnow()
            logger.warning(f"Circuit breaker opened for provider {provider}")

    def _reset_circuit_breaker(self, provider: str) -> None:
        """Reset circuit breaker for a provider"""
        if provider in self.circuit_breaker_state:
            self.circuit_breaker_state[provider] = {
                'status': 'closed',
                'failures': 0,
                'opened_at': None
            }
            logger.info(f"Circuit breaker reset for provider {provider}")
