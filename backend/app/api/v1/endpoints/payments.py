from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, Header, Body, Request
from sqlalchemy.orm import Session

from app.api import deps
from app.services.payment.payment_service import PaymentService
from app.schemas.payment.payment import (
    PaymentInitializeRequest,
    PaymentInitializeResponseWithWrapper,
    PaymentVerificationResponseWithWrapper,
    PaymentSettingsResponseWithWrapper,
    PaymentSettings,
    PaymentProvider,
    PaymentWebhookEvent,
    ManualPaymentProof
)
from app.core.auth import get_current_user, get_current_active_user
from app.services.payment.payment_provider import get_payment_provider
from app.schemas.payment.payment_validation import EnhancedPaymentInitializeRequest, EnhancedManualPaymentProof
from app.services.audit_service import create_audit_log, AuditActionType, AuditResourceType
from app.core.security.payment_security import mask_sensitive_data

router = APIRouter()


@router.post("/initialize", response_model=PaymentInitializeResponseWithWrapper)
async def initialize_payment(
    request: EnhancedPaymentInitializeRequest,
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(get_current_active_user),
    fastapi_request: Request = None
) -> Any:
    """
    Initialize a payment transaction with the selected provider
    """
    payment_service = PaymentService(db)
    payment_response = await payment_service.initialize_payment(request)
    # Audit log
    create_audit_log(
        db=db,
        user_id=getattr(current_user, 'id', None),
        action=AuditActionType.CREATE,
        resource_type=AuditResourceType.PAYMENT,
        resource_id=request.order_id,
        details={
            "masked_data": mask_sensitive_data(request.dict()),
            "operation": "initialize",
        },
        request=fastapi_request
    )
    return {"payment": payment_response}


@router.get("/verify/{reference}/{provider}", response_model=PaymentVerificationResponseWithWrapper)
async def verify_payment(
    reference: str,
    provider: PaymentProvider,
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(get_current_active_user)
) -> Any:
    """
    Verify the status of a payment using its reference
    """
    payment_service = PaymentService(db)
    verification_response = await payment_service.verify_payment(reference, provider)

    return {"verification": verification_response}


@router.post("/manual/{order_id}/proof", response_model=dict)
async def submit_manual_payment_proof(
    order_id: str,
    proof: EnhancedManualPaymentProof,
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(get_current_active_user),
    fastapi_request: Request = None
) -> Any:
    """
    Submit proof of manual bank transfer payment for an order
    """
    payment_service = PaymentService(db)
    success = await payment_service.submit_manual_payment_proof(order_id, proof)
    # Audit log
    create_audit_log(
        db=db,
        user_id=getattr(current_user, 'id', None),
        action=AuditActionType.UPDATE,
        resource_type=AuditResourceType.PAYMENT,
        resource_id=order_id,
        details={
            "masked_data": mask_sensitive_data(proof.dict()),
            "operation": "manual_payment_proof",
        },
        request=fastapi_request
    )
    return {"success": success}


@router.post("/manual/{payment_id}/confirm", response_model=dict)
async def confirm_manual_payment(
    payment_id: int,
    confirmed: bool = Body(..., embed=True),
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_active_superuser)
) -> Any:
    """
    Confirm or reject a manual payment after reviewing proof (admin/seller only)
    """
    payment_service = PaymentService(db)
    success = await payment_service.confirm_manual_payment(payment_id, confirmed)

    return {"success": success}


@router.get("/settings/{store_id}", response_model=PaymentSettingsResponseWithWrapper)
async def get_payment_settings(
    store_id: int,
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(get_current_active_user)
) -> Any:
    """
    Get payment settings for a store
    """
    # TODO: Add permission check - only store owner or admin should be able to access this
    payment_service = PaymentService(db)
    settings = await payment_service.get_payment_settings(store_id)

    return {"settings": settings}


@router.put("/settings/{store_id}", response_model=dict)
async def update_payment_settings(
    store_id: int,
    settings_data: PaymentSettings,
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(get_current_active_user)
) -> Any:
    """
    Update payment settings for a store
    """
    # TODO: Add permission check - only store owner or admin should be able to update this
    payment_service = PaymentService(db)
    success = await payment_service.update_payment_settings(store_id, settings_data)

    return {"success": success}


@router.post("/webhook/paystack", response_model=dict)
async def paystack_webhook(
    request: Request,
    x_paystack_signature: str = Header(None),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    Handle Paystack webhook events
    """
    # Read request body
    payload = await request.body()

    try:
        # Get store from the payload data to retrieve the correct secret key
        # This is a simplified implementation; you would need to extract the order/store ID from the payload
        # and fetch the correct secret key from the database

        # For demonstration, assuming a default secret key for validation
        # In production, you'd retrieve this from the database based on the webhook data
        secret_key = "your_paystack_secret_key"

        provider = get_payment_provider(PaymentProvider.PAYSTACK, {
                                        "secret_key": secret_key})

        # Validate webhook signature
        if not provider.validate_webhook(payload, x_paystack_signature):
            raise HTTPException(
                status_code=400, detail="Invalid webhook signature")

        # Parse the payload
        event_data = await request.json()

        # Process different event types
        event_type = event_data.get("event")

        if event_type == "charge.success":
            # Handle successful payment
            reference = event_data.get("data", {}).get("reference")

            if reference:
                payment_service = PaymentService(db)
                await payment_service.verify_payment(reference, PaymentProvider.PAYSTACK)

        return {"success": True, "message": f"Webhook processed: {event_type}"}

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error processing webhook: {str(e)}")


@router.post("/webhook/flutterwave", response_model=dict)
async def flutterwave_webhook(
    request: Request,
    verify_hash: str = Header(None),
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    Handle Flutterwave webhook events
    """
    # Read request body
    payload = await request.body()

    try:
        # For demonstration, assuming a default secret key for validation
        # In production, you'd retrieve this from the database based on the webhook data
        secret_key = "your_flutterwave_secret_key"

        provider = get_payment_provider(PaymentProvider.FLUTTERWAVE, {
                                        "secret_key": secret_key})

        # Validate webhook signature
        if not provider.validate_webhook(payload, verify_hash):
            raise HTTPException(
                status_code=400, detail="Invalid webhook signature")

        # Parse the payload
        event_data = await request.json()

        # Process different event types
        event_type = event_data.get("event")

        if event_type == "charge.completed":
            # Handle successful payment
            tx_ref = event_data.get("data", {}).get("tx_ref")

            if tx_ref:
                payment_service = PaymentService(db)
                await payment_service.verify_payment(tx_ref, PaymentProvider.FLUTTERWAVE)

        return {"success": True, "message": f"Webhook processed: {event_type}"}

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error processing webhook: {str(e)}")
