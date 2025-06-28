from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.config.settings import get_settings
from app.core.security.payment_security import verify_paystack_signature
from app.services.payment.payment_service import PaymentService
from app.core.monitoring.webhook_metrics import WebhookMetrics
from app.core.logging import logger
from app.api.deps import get_db
from app.services.payment.payment_service import PaymentService
from typing import Dict, Optional, Callable, Any
import json
import ipaddress

settings = get_settings()
router = APIRouter()


# IP Whitelist Validator
def validate_ip(request: Request, provider: str) -> bool:
    """Validate incoming webhook IP against provider whitelist"""
    client_ip = request.client.host
    if not client_ip:
        logger.warning(f"No client IP found in {provider} webhook request")
        return False

    try:
        client_ip_obj = ipaddress.ip_address(client_ip)

        # Provider-specific IP whitelists
        if provider == "paystack":
            # Paystack IP ranges (update these with the latest from Paystack)
            paystack_ips = [
                ipaddress.ip_network("52.31.139.75/32"),
                ipaddress.ip_network("52.49.173.169/32"),
                # Add more if needed
            ]
            return any(client_ip_obj in ip_range for ip_range in paystack_ips)

        elif provider == "mpesa":
            # M-Pesa IP ranges (update these with the actual M-Pesa IPs)
            mpesa_ips = [
                # Add M-Pesa IP ranges here
                ipaddress.ip_network("196.201.214.0/24"),
                ipaddress.ip_network("196.201.214.200/32"),
                # Add more if needed
            ]
            return any(client_ip_obj in ip_range for ip_range in mpesa_ips)

        else:
            logger.warning(f"No IP whitelist defined for provider: {provider}")
            return False

    except ValueError as e:
        logger.error(f"IP validation error: {str(e)}")
        return False


# Ensure idempotency for webhook processing
async def ensure_idempotency(db: AsyncSession, event_id: str, provider: str) -> bool:
    """Check if the event has already been processed to ensure idempotency"""
    from app.services.payment.webhook_event_service import WebhookEventService
    service = WebhookEventService()
    return await service.is_webhook_processed(db, event_id, provider)


@router.post("/paystack")
async def paystack_webhook(
    request: Request, db: AsyncSession = Depends(get_db)
):
    """Handle webhooks from Paystack"""
    # Start tracking metrics
    WebhookMetrics.record_received("paystack")

    with WebhookMetrics.track_processing_time("paystack"):
        try:
            # Validate IP address
            if settings.VALIDATE_WEBHOOK_IPS:
                client_ip = request.client.host
                if not validate_ip(request, "paystack"):
                    WebhookMetrics.record_processed("paystack", "ip_rejected")
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="IP address not allowed"
                    )

            # Parse and validate request body
            payload = await request.json()

            # Verify signature
            signature_header = request.headers.get("x-paystack-signature")
            if not signature_header or not verify_paystack_signature(payload, signature_header):
                WebhookMetrics.record_processed(
                    "paystack", "invalid_signature")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid signature"
                )

            # Get event details
            event = payload.get("event")
            event_id = payload.get("id")
            data = payload.get("data", {})

            if not event or not event_id or not data:
                WebhookMetrics.record_processed("paystack", "invalid_payload")
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Invalid payload format"
                )

            # Check for idempotency
            if await ensure_idempotency(db, event_id, "paystack"):
                WebhookMetrics.record_processed("paystack", "duplicate")
                return {"status": "skipped", "message": "Event already processed"}

            # Process webhook based on event type
            service = PaymentService()
            if event == "charge.success":
                await service.process_successful_payment(
                    db=db,
                    payment_data=data,
                    provider="paystack",
                    event_id=event_id
                )
                WebhookMetrics.record_processed("paystack", "success")
            elif event == "charge.failed":
                await service.process_failed_payment(
                    db=db,
                    payment_data=data,
                    provider="paystack",
                    event_id=event_id,
                    failure_reason=data.get(
                        "gateway_response", "Payment failed")
                )
                WebhookMetrics.record_processed("paystack", "failure")
            else:
                WebhookMetrics.record_processed("paystack", "unhandled_event")
            # Add more event types as needed

            # Record the processed event for idempotency
            from app.services.payment.webhook_event_service import WebhookEventService
            service = WebhookEventService()
            await service.record_webhook_event(
                db=db,
                event_id=event_id,
                provider="paystack",
                event_type=event,
                payload=payload
            )

            return {"status": "success", "message": "Webhook processed"}
        except Exception as e:
            # Record failure metric but don't re-raise
            WebhookMetrics.record_processed("paystack", "error")
            raise


@router.post("/mpesa")
async def mpesa_webhook(
    request: Request, db: AsyncSession = Depends(get_db)
):
    """Handle webhooks from M-Pesa"""
    # Start tracking metrics
    WebhookMetrics.record_received("mpesa")

    with WebhookMetrics.track_processing_time("mpesa"):
        try:
            # Validate IP address
            if settings.VALIDATE_WEBHOOK_IPS:
                client_ip = request.client.host
                if not validate_ip(request, "mpesa"):
                    WebhookMetrics.record_processed("mpesa", "ip_rejected")
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="IP address not allowed"
                    )

            # Parse request body
            payload = await request.json()

            # Extract STK callback response
            stk_callback = payload.get("Body", {}).get("stkCallback", {})
            if not stk_callback:
                WebhookMetrics.record_processed("mpesa", "invalid_payload")
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Invalid payload format"
                )

            # Extract event ID (CheckoutRequestID)
            event_id = stk_callback.get("CheckoutRequestID")
            if not event_id:
                WebhookMetrics.record_processed("mpesa", "invalid_payload")
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Missing CheckoutRequestID"
                )

            # Check for idempotency
            if await ensure_idempotency(db, event_id, "mpesa"):
                WebhookMetrics.record_processed("mpesa", "duplicate")
                return {"status": "skipped", "message": "Event already processed"}

            # Process based on result code
            result_code = stk_callback.get("ResultCode")
            service = PaymentService()

            if result_code == 0:  # Success
                await service.process_successful_payment(
                    db=db,
                    payment_data=stk_callback,
                    provider="mpesa",
                    event_id=event_id
                )
                WebhookMetrics.record_processed("mpesa", "success")
            else:  # Failure
                result_desc = stk_callback.get("ResultDesc", "Payment failed")
                await service.process_failed_payment(
                    db=db,
                    payment_data=stk_callback,
                    provider="mpesa",
                    event_id=event_id,
                    failure_reason=result_desc
                )
                WebhookMetrics.record_processed("mpesa", "failure")

            # Record the processed event for idempotency
            from app.services.payment.webhook_event_service import WebhookEventService
            service = WebhookEventService()
            await service.record_webhook_event(
                db=db,
                event_id=event_id,
                provider="mpesa",
                event_type=f"mpesa_result_{result_code}",
                payload=payload
            )

            return {"status": "success", "message": "Webhook processed"}
        except Exception as e:
            # Record failure metric but don't re-raise
            WebhookMetrics.record_processed("mpesa", "error")
            raise
