from datetime import datetime, timedelta

import sentry_sdk
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.core.security.payment_security import (
    calculate_payment_risk,
    generate_payment_reference,
    get_tls12_session,
    verify_payment_reference,
)
from app.models.order import Order
from app.models.payment import ManualPaymentProof, Payment, PaymentSettings
# Import Tenant instead of Store which does not exist
from app.models.tenant import Tenant
from app.core.errors import payment_failures
from app.schemas.payment.payment import (
    BankAccountDetails,
)
from app.schemas.payment.payment import ManualPaymentProof as ManualPaymentProofSchema
from app.schemas.payment.payment import (
    Money,
    PaymentInitializeRequest,
    PaymentInitializeResponse,
    PaymentProvider,
    PaymentProviderConfig,
)
from app.schemas.payment.payment import PaymentSettings as PaymentSettingsSchema
from app.schemas.payment.payment import (
    PaymentStatus,
    PaymentVerificationResponse,
)
from app.services.order_service import OrderService
from app.services.payment.payment_provider import get_payment_provider


class PaymentService:
    """Service for handling payment operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def initialize_payment(
        self, request: PaymentInitializeRequest
    ) -> PaymentInitializeResponse:
        """Initialize a payment transaction with the selected provider"""
        async with self.db.begin():
            try:
                # Validate order exists
                order = await self.db.get(Order, Order.order_number == request.order_id)
                if not order:
                    raise HTTPException(
                        status_code=404, detail=f"Order {request.order_id} not found"
                    )

                # Get store payment settings
                store = await self.db.get(Store, Store.id == order.store_id)
                if not store:
                    raise HTTPException(
                        status_code=404, detail="Store not found")

                payment_settings = await self.db.get(
                    PaymentSettings, PaymentSettings.store_id == store.id
                )
                if not payment_settings:
                    raise HTTPException(
                        status_code=400, detail="Store payment settings not configured"
                    )

                # Check if online payments are enabled
                if not payment_settings.online_payments_enabled:
                    raise HTTPException(
                        status_code=400,
                        detail="Online payments are not enabled for this store",
                    )

                # Find the requested provider configuration
                provider_config = None
                provider_credentials = {}

                for config in payment_settings.providers:
                    if config.provider == request.provider.value:
                        provider_config = config
                        # Use test keys if test_mode is enabled
                        if getattr(config, 'test_mode', False):
                            # Example: override credentials with test keys
                            if config.provider == 'stripe':
                                provider_credentials = {
                                    "public_key": get_settings().STRIPE_TEST_PUBLIC_KEY,
                                    "secret_key": get_settings().STRIPE_TEST_SECRET_KEY,
                                }
                            elif config.provider == 'paystack':
                                provider_credentials = {
                                    "public_key": get_settings().PAYSTACK_TEST_PUBLIC_KEY,
                                    "secret_key": get_settings().PAYSTACK_TEST_SECRET_KEY,
                                }
                            # Add other providers as needed
                        else:
                            provider_credentials = {
                                "public_key": config.public_key,
                                "secret_key": config.secret_key,
                                "encryption_key": config.encryption_key,
                            }
                        break

                if not provider_config or not provider_config.enabled:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Payment provider {request.provider.value} is not enabled",
                    )

                # Get the payment provider implementation
                provider_instance = get_payment_provider(
                    request.provider, provider_credentials
                )

                # Generate a secure, signed payment reference
                tenant_id = (
                    str(order.tenant_id) if hasattr(
                        order, "tenant_id") else "default"
                )
                payment_reference = generate_payment_reference(
                    order_id=request.order_id, tenant_id=tenant_id
                )

                # Use TLS 1.2+ session for outbound requests
                session = get_tls12_session()

                # Risk scoring
                ip_address = getattr(request, "ip_address", None)
                user_agent = getattr(request, "user_agent", None)
                # Velocity: count recent attempts by user/IP
                recent_attempts = await self.db.execute(
                    select(Payment)
                    .filter(
                        Payment.customer_email == request.customer_email,
                        Payment.created_at >= datetime.utcnow() - timedelta(minutes=10),
                    )
                    .count()
                )
                risk_score = calculate_payment_risk(
                    amount=request.amount.value,
                    user_id=getattr(order, "user_id", None),
                    ip_address=ip_address,
                    user_agent=user_agent,
                    recent_attempts=recent_attempts.scalar(),
                )

                # Initialize the payment
                response = await provider_instance.initialize_payment(request)

                # Record the payment initialization in the database
                payment = Payment(
                    order_id=order.id,
                    reference=payment_reference,
                    amount=request.amount.value,
                    currency=request.amount.currency,
                    provider=request.provider.value,
                    status=PaymentStatus.PENDING.value,
                    customer_email=request.customer_email,
                    metadata=request.metadata,
                    risk_score=risk_score,
                    ip_address=ip_address,
                    user_agent=user_agent,
                )

                self.db.add(payment)
                await self.db.commit()

                # Optionally log high-risk attempts
                if risk_score > 0.7:
                    logger.warning(
                        f"High-risk payment attempt: {payment_reference} (score={risk_score})"
                    )

                # Return response with secure reference
                # (If provider needs a specific format, pass payment_reference as meta or tx_ref)
                return PaymentInitializeResponse(
                    checkout_url="",  # Set as needed
                    reference=payment_reference,
                    payment_link="",  # Set as needed
                )

            except HTTPException:
                raise
            except Exception as e:
                await self.db.rollback()
                logger.error(f"Error initializing payment: {str(e)}")
                sentry_sdk.capture_exception(e)
                payment_failures.inc()
                raise HTTPException(
                    status_code=500, detail=f"Payment initialization failed: {str(e)}"
                )

    async def verify_payment(
        self, reference: str, provider: PaymentProvider
    ) -> PaymentVerificationResponse:
        """Verify payment status with the provider"""
        async with self.db.begin():
            try:
                # Verify the reference integrity
                ref_payload = verify_payment_reference(reference)
                if not ref_payload:
                    raise HTTPException(
                        status_code=400, detail="Invalid or tampered payment reference"
                    )

                # Find the payment record
                payment = await self.db.get(Payment, Payment.reference == reference)
                if not payment:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Payment reference {reference} not found",
                    )

                # Get the store for this payment's order
                order = await self.db.get(Order, Order.id == payment.order_id)
                if not order:
                    raise HTTPException(
                        status_code=404, detail="Order not found")

                store = await self.db.get(Store, Store.id == order.store_id)
                if not store:
                    raise HTTPException(
                        status_code=404, detail="Store not found")

                # Get payment settings with provider credentials
                payment_settings = await self.db.get(
                    PaymentSettings, PaymentSettings.store_id == store.id
                )
                if not payment_settings:
                    raise HTTPException(
                        status_code=400, detail="Store payment settings not configured"
                    )

                # Find the provider configuration
                provider_config = None
                provider_credentials = {}

                for config in payment_settings.providers:
                    if config.provider == provider.value:
                        provider_config = config
                        provider_credentials = {
                            "public_key": config.public_key,
                            "secret_key": config.secret_key,
                            "encryption_key": config.encryption_key,
                        }
                        break

                if not provider_config:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Payment provider {provider.value} configuration not found",
                    )

                # Get the payment provider implementation
                provider_instance = get_payment_provider(
                    provider, provider_credentials)

                # Verify the payment
                verification_response = await provider_instance.verify_payment(
                    reference
                )

                # Update payment status in the database
                if verification_response.success:
                    payment.status = self.map_provider_status_to_internal(
                        provider.value, verification_response.status
                    )
                    payment.verified_at = datetime.now()
                    payment.provider_reference = (
                        verification_response.provider_reference
                    )
                    payment.payment_method = (
                        verification_response.payment_method.value
                        if verification_response.payment_method
                        else None
                    )
                    payment.transaction_date = verification_response.transaction_date

                    # Update order status if payment successful
                    await OrderService._update_order_status(
                        self.db, order, "PROCESSING"
                    )

                    # Emit PaymentProcessedEvent
                    import asyncio

                    from app.domain.events.event_bus import get_event_bus
                    from app.domain.events.order_events import OrderEventFactory

                    event = OrderEventFactory.create_payment_processed_event(
                        order, payment
                    )
                    asyncio.create_task(get_event_bus().publish(event))

                # Risk scoring (update if new info is available)
                if payment:
                    # Optionally update risk score if new info is available
                    pass

                return verification_response

            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error verifying payment: {str(e)}")
                sentry_sdk.capture_exception(e)
                payment_failures.inc()
                raise HTTPException(
                    status_code=500, detail=f"Payment verification failed: {str(e)}"
                )

    async def submit_manual_payment_proof(
        self, order_id: str, proof: ManualPaymentProofSchema
    ) -> bool:
        """Submit proof of manual payment for an order"""
        async with self.db.begin():
            try:
                # Find the order
                order = await self.db.get(Order, Order.order_number == order_id)
                if not order:
                    raise HTTPException(
                        status_code=404, detail=f"Order {order_id} not found"
                    )

                # Check if there's an existing payment record
                existing_payment = await self.db.get(
                    Payment,
                    Payment.order_id == order.id,
                    Payment.provider == PaymentProvider.MANUAL.value,
                )

                if existing_payment:
                    # Update the existing payment record
                    existing_proof = await self.db.get(
                        ManualPaymentProof,
                        ManualPaymentProof.payment_id == existing_payment.id,
                    )

                    if existing_proof:
                        existing_proof.reference = proof.reference
                        existing_proof.transfer_date = proof.transfer_date
                        existing_proof.bank_name = proof.bank_name
                        existing_proof.account_name = proof.account_name
                        existing_proof.screenshot_url = proof.screenshot_url
                        existing_proof.notes = proof.notes
                        existing_proof.updated_at = datetime.now()
                    else:
                        # Create a new proof record
                        new_proof = ManualPaymentProof(
                            payment_id=existing_payment.id,
                            reference=proof.reference,
                            transfer_date=proof.transfer_date,
                            bank_name=proof.bank_name,
                            account_name=proof.account_name,
                            screenshot_url=proof.screenshot_url,
                            notes=proof.notes,
                        )
                        self.db.add(new_proof)
                else:
                    # Create a new payment record
                    new_payment = Payment(
                        order_id=order.id,
                        reference=proof.reference,
                        amount=order.total_amount,
                        currency=order.currency,
                        provider=PaymentProvider.MANUAL.value,
                        status=PaymentStatus.PENDING.value,
                        customer_email=order.customer_email,
                    )
                    self.db.add(new_payment)
                    await self.db.flush()  # To get the payment ID

                    # Create a new proof record
                    new_proof = ManualPaymentProof(
                        payment_id=new_payment.id,
                        reference=proof.reference,
                        transfer_date=proof.transfer_date,
                        bank_name=proof.bank_name,
                        account_name=proof.account_name,
                        screenshot_url=proof.screenshot_url,
                        notes=proof.notes,
                    )
                    self.db.add(new_proof)

                # Update order status to indicate manual payment proof was submitted
                await OrderService._update_order_status(
                    self.db, order, "PENDING_VERIFICATION"
                )

                await self.db.commit()
                return True

            except HTTPException:
                raise
            except Exception as e:
                await self.db.rollback()
                logger.error(
                    f"Error submitting manual payment proof: {str(e)}")
                sentry_sdk.capture_exception(e)
                raise HTTPException(
                    status_code=500, detail=f"Failed to submit payment proof: {str(e)}"
                )

    async def confirm_manual_payment(self, payment_id: int, confirmed: bool) -> bool:
        """Confirm or reject a manual payment after reviewing proof"""
        async with self.db.begin():
            try:
                payment = await self.db.get(
                    Payment,
                    Payment.id == payment_id,
                    Payment.provider == PaymentProvider.MANUAL.value,
                )

                if not payment:
                    raise HTTPException(
                        status_code=404, detail="Manual payment record not found"
                    )

                order = await self.db.get(Order, Order.id == payment.order_id)
                if not order:
                    raise HTTPException(
                        status_code=404, detail="Order not found")

                if confirmed:
                    payment.status = PaymentStatus.COMPLETED.value
                    payment.verified_at = datetime.now()

                    # Update order status
                    await OrderService._update_order_status(
                        self.db, order, "PROCESSING"
                    )
                else:
                    payment.status = PaymentStatus.FAILED.value

                    # Update order status
                    await OrderService._update_order_status(self.db, order, "FAILED")

                await self.db.commit()
                return True

            except HTTPException:
                raise
            except Exception as e:
                await self.db.rollback()
                logger.error(f"Error confirming manual payment: {str(e)}")
                sentry_sdk.capture_exception(e)
                raise HTTPException(
                    status_code=500, detail=f"Failed to confirm payment: {str(e)}"
                )

    async def get_payment_settings(self, tenant_id: int) -> PaymentSettingsSchema:
        """Get payment settings for a store"""
        try:
            settings = await self.db.get(
                PaymentSettings, PaymentSettings.tenant_id == tenant_id
            )

            if not settings:
                # Return default settings
                return PaymentSettingsSchema(
                    online_payments_enabled=False,
                    providers=[],
                    platform_fee_percentage=5.0,
                    auto_calculate_payout=True,
                )

            # Map to schema
            provider_configs = []
            for provider in settings.providers:
                provider_configs.append(
                    PaymentProviderConfig(
                        provider=PaymentProvider(provider.provider),
                        enabled=provider.enabled,
                        is_default=provider.is_default,
                        credentials={
                            "public_key": provider.public_key,
                            "secret_key": "********",  # Never return the full secret key
                            "encryption_key": (
                                "********" if provider.encryption_key else None
                            ),
                        },
                    )
                )

            bank_details = None
            if settings.bank_name and settings.account_name and settings.account_number:
                bank_details = BankAccountDetails(
                    bank_name=settings.bank_name,
                    account_name=settings.account_name,
                    account_number=settings.account_number,
                    instructions=settings.bank_instructions,
                )

            return PaymentSettingsSchema(
                online_payments_enabled=settings.online_payments_enabled,
                providers=provider_configs,
                bank_transfer_details=bank_details,
                platform_fee_percentage=settings.platform_fee_percentage,
                auto_calculate_payout=settings.auto_calculate_payout,
            )

        except Exception as e:
            logger.error(f"Error getting payment settings: {str(e)}")
            sentry_sdk.capture_exception(e)
            raise HTTPException(
                status_code=500, detail=f"Failed to get payment settings: {str(e)}"
            )

    async def update_payment_settings(
        self, tenant_id: int, settings_data: PaymentSettingsSchema
    ) -> bool:
        """Update payment settings for a store"""
        async with self.db.begin():
            try:
                # Enforce: No more than 3 providers can be enabled at once
                enabled_providers = [
                    p for p in settings_data.providers if p.enabled]
                if len(enabled_providers) > 3:
                    raise HTTPException(
                        status_code=400,
                        detail="You can enable at most 3 payment providers at a time.",
                    )
                settings = await self.db.get(
                    PaymentSettings, PaymentSettings.tenant_id == tenant_id
                )

                if not settings:
                    # Create new settings
                    settings = PaymentSettings(
                        tenant_id=tenant_id,
                        online_payments_enabled=settings_data.online_payments_enabled,
                        platform_fee_percentage=settings_data.platform_fee_percentage,
                        auto_calculate_payout=settings_data.auto_calculate_payout,
                        providers=[],
                    )
                    self.db.add(settings)
                    await self.db.flush()  # To get the settings ID
                else:
                    # Update existing settings
                    settings.online_payments_enabled = (
                        settings_data.online_payments_enabled
                    )
                    settings.platform_fee_percentage = (
                        settings_data.platform_fee_percentage
                    )
                    settings.auto_calculate_payout = settings_data.auto_calculate_payout

                # Update bank details if provided
                if settings_data.bank_transfer_details:
                    settings.bank_name = settings_data.bank_transfer_details.bank_name
                    settings.account_name = (
                        settings_data.bank_transfer_details.account_name
                    )
                    settings.account_number = (
                        settings_data.bank_transfer_details.account_number
                    )
                    settings.bank_instructions = (
                        settings_data.bank_transfer_details.instructions
                    )
                else:
                    settings.bank_name = None
                    settings.account_name = None
                    settings.account_number = None
                    settings.bank_instructions = None

                # Update provider configurations
                settings.providers = []  # Clear existing providers

                for provider_config in settings_data.providers:
                    # All providers should default to disabled unless explicitly enabled
                    enabled = bool(provider_config.enabled)
                    secret_key = provider_config.credentials.secret_key
                    encryption_key = provider_config.credentials.encryption_key

                    if secret_key == "********":
                        # Look up existing secret
                        existing_provider = await self.db.get(
                            PaymentSettings,
                            PaymentSettings.tenant_id == tenant_id,
                            PaymentSettings.providers.any(
                                provider=provider_config.provider.value
                            ),
                        )
                        if existing_provider:
                            for provider in existing_provider.providers:
                                if provider.provider == provider_config.provider.value:
                                    secret_key = provider.secret_key
                                    break

                    if encryption_key == "********":
                        # Look up existing encryption key
                        existing_provider = await self.db.get(
                            PaymentSettings,
                            PaymentSettings.tenant_id == tenant_id,
                            PaymentSettings.providers.any(
                                provider=provider_config.provider.value
                            ),
                        )
                        if existing_provider:
                            for provider in existing_provider.providers:
                                if provider.provider == provider_config.provider.value:
                                    encryption_key = provider.encryption_key
                                    break

                    settings.providers.append(
                        {
                            "provider": provider_config.provider.value,
                            "enabled": enabled,
                            "public_key": provider_config.credentials.public_key,
                            "secret_key": secret_key,
                            "encryption_key": encryption_key,
                            "is_default": provider_config.is_default,
                        }
                    )

                await self.db.commit()
                return True

            except Exception as e:
                await self.db.rollback()
                logger.error(f"Error updating payment settings: {str(e)}")
                sentry_sdk.capture_exception(e)
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to update payment settings: {str(e)}",
                )

    def map_provider_status_to_internal(
        self, provider: str, external_status: str
    ) -> str:
        """Map external provider status to internal PaymentStatus enum."""
        mapping = {
            "paystack": {
                "success": "COMPLETED",
                "failed": "FAILED",
                "abandoned": "FAILED",
                "pending": "PENDING",
            },
            "flutterwave": {
                "successful": "COMPLETED",
                "failed": "FAILED",
                "pending": "PENDING",
            },
            "mpesa": {"Success": "COMPLETED", "Failed": "FAILED", "Pending": "PENDING"},
            "stripe": {
                "succeeded": "COMPLETED",
                "requires_payment_method": "FAILED",
                "requires_action": "PENDING",
                "processing": "PENDING",
                "canceled": "FAILED",
            },
        }
        return mapping.get(provider.lower(), {}).get(external_status, "PENDING")

    def get_enabled_payment_methods(self, tenant_id: int) -> list:
        """
        Return a list of enabled payment provider names for the given store/tenant.
        """
        # This is a synchronous helper for chat flows; assumes settings are already loaded or cached
        settings = self.db.query(PaymentSettings).filter_by(
            tenant_id=tenant_id).first()
        if not settings or not settings.providers:
            return []
        return [p.provider for p in settings.providers if p.enabled]

    def generate_payment_link(self, order, payment_method: str) -> str:
        """
        Generate a payment link for the given order and payment method using the provider SDK/API.
        """
        import logging

        from app.schemas.payment.payment import (
            Money,
            PaymentInitializeRequest,
            PaymentProvider,
        )
        from app.services.payment.payment_provider import get_payment_provider

        # Get provider credentials/settings for the tenant/store
        settings = (
            self.db.query(PaymentSettings).filter_by(
                tenant_id=order.seller_id).first()
        )
        provider_config = next(
            (
                p
                for p in settings.providers
                if p.provider == payment_method and p.enabled
            ),
            None,
        )
        if not provider_config:
            logging.error(
                f"Payment provider {payment_method} not enabled for store {order.seller_id}"
            )
            raise Exception("Payment provider not enabled.")
        # Prepare payment initialization request
        request = PaymentInitializeRequest(
            order_id=str(order.id),
            # Use the order's actual currency
            amount=Money(
                value=order.total_amount,
                currency=getattr(order, "currency", "USD")
            ),
            # Use actual buyer email or fallback to store owner email
            customer_email=getattr(order, "buyer_email", None) or
            getattr(order, "seller_email", None) or
            "",  # Empty string as last fallback
            customer_name=order.buyer_name,
            customer_phone=order.buyer_phone,
            provider=PaymentProvider(payment_method.upper()),
            redirect_url="https://yourdomain.com/payment/callback",
            metadata={"order_id": str(order.id)},
        )
        # Get provider instance and initialize payment
        provider_instance = get_payment_provider(
            request.provider, provider_config.credentials
        )
        try:
            response = provider_instance.initialize_payment(request)
            return response.checkout_url or response.payment_link
        except Exception as e:
            logging.error(f"Error generating payment link: {str(e)}")
            raise Exception("Failed to generate payment link.")
