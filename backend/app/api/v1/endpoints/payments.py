from typing import Any

from fastapi import APIRouter, Body, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from app.app.api import deps
from app.app.api.deps.security_deps import payment_security_checks
from app.app.core.auth import get_current_active_user
from app.app.core.config.settings import get_settings
from app.app.core.security.payment_security import mask_sensitive_data
from app.app.models.tenant import Tenant
from app.app.models.user import User
from app.app.services.admin.admin_user.service import AdminUserService
from app.app.services.audit_service import AuditActionType, AuditResourceType, create_audit_log
from app.app.schemas.payment.payment import (
    PaymentInitializeResponseWithWrapper,
    PaymentProvider,
    PaymentSettings,
    PaymentSettingsResponseWithWrapper,
    PaymentVerificationResponseWithWrapper,
)
from app.app.schemas.payment.payment_validation import (
    EnhancedManualPaymentProof,
    EnhancedPaymentInitializeRequest,
)
from app.app.services.payment.payment_provider import get_payment_provider
from app.app.services.payment.payment_service import PaymentService

router = APIRouter()

# Initialize admin user service for permission checks
admin_user_service = AdminUserService()


async def check_payment_settings_permission(
    tenant_id: int,
    current_user: User,
    db: Session,
    require_admin: bool = False
) -> bool:
    """
    Check if the current user has permission to access payment settings.

    Args:
        tenant_id: ID of the tenant
        current_user: Current authenticated user
        db: Database session
        require_admin: Whether admin role is required (for sensitive operations)

    Returns:
        True if user has permission, False otherwise

    Raises:
        HTTPException: If user doesn't have permission
    """
    # Convert user ID to UUID if needed
    user_id = current_user.id
    if isinstance(user_id, str):
        from uuid import UUID
        user_id = UUID(user_id)

    # Check if tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=404,
            detail="Tenant not found"
        )

    # Check if user is the tenant owner
    if tenant.admin_user_id == user_id:
        return True

    # If admin role is required, check for admin permissions
    if require_admin:
        has_admin_role = await admin_user_service.has_role(
            db=db,
            admin_user_id=user_id,
            role_name="admin",  # or "super_admin" depending on your hierarchy
            tenant_id=None,  # Global admin role
            include_ancestors=True
        )
        if has_admin_role:
            return True

    # Check if user has any admin role (for general access)
    has_any_admin_role = await admin_user_service.has_role(
        db=db,
        admin_user_id=user_id,
        role_name="admin",
        tenant_id=None,
        include_ancestors=True
    )

    if has_any_admin_role:
        return True

    return False


@router.post("/initialize", response_model=PaymentInitializeResponseWithWrapper)
async def initialize_payment(
    request: EnhancedPaymentInitializeRequest,
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(get_current_active_user),
    fastapi_request: Request = None,
    _: bool = Depends(payment_security_checks("payment:initialize")),
) -> Any:
    """
    Initialize a payment transaction with the selected provider
    """
    payment_service = PaymentService(db)
    payment_response = await payment_service.initialize_payment(request)
    # Audit log
    create_audit_log(
        db=db,
        user_id=getattr(current_user, "id", None),
        action=AuditActionType.CREATE,
        resource_type=AuditResourceType.PAYMENT,
        resource_id=request.order_id,
        details={
            "masked_data": mask_sensitive_data(request.dict()),
            "operation": "initialize",
        },
        request=fastapi_request,
    )
    return {"payment": payment_response}


@router.get(
    "/verify/{reference}/{provider}",
    response_model=PaymentVerificationResponseWithWrapper,
)
async def verify_payment(
    reference: str,
    provider: PaymentProvider,
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(get_current_active_user),
    _: bool = Depends(payment_security_checks("payment:verify")),
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
    fastapi_request: Request = None,
    _: bool = Depends(payment_security_checks("payment:manual_proof")),
) -> Any:
    """
    Submit proof of manual bank transfer payment for an order
    """
    payment_service = PaymentService(db)
    success = await payment_service.submit_manual_payment_proof(order_id, proof)
    # Audit log
    create_audit_log(
        db=db,
        user_id=getattr(current_user, "id", None),
        action=AuditActionType.UPDATE,
        resource_type=AuditResourceType.PAYMENT,
        resource_id=order_id,
        details={
            "masked_data": mask_sensitive_data(proof.dict()),
            "operation": "manual_payment_proof",
        },
        request=fastapi_request,
    )
    return {"success": success}


@router.post("/manual/{payment_id}/confirm", response_model=dict)
async def confirm_manual_payment(
    payment_id: int,
    confirmed: bool = Body(..., embed=True),
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(deps.get_current_active_superuser),
    _: bool = Depends(payment_security_checks("payment:manual_confirm")),
) -> Any:
    """
    Confirm or reject a manual payment after reviewing proof (admin/seller only)
    """
    payment_service = PaymentService(db)
    success = await payment_service.confirm_manual_payment(payment_id, confirmed)

    return {"success": success}


@router.get("/settings/{tenant_id}", response_model=PaymentSettingsResponseWithWrapper)
async def get_payment_settings(
    tenant_id: int,
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(get_current_active_user),
    _: bool = Depends(payment_security_checks("payment:settings")),
) -> Any:
    """
    Get payment settings for a store

    This endpoint requires the user to be either:
    - The tenant owner
    - An admin user with appropriate permissions
    """
    # Check permission
    has_permission = await check_payment_settings_permission(
        tenant_id=tenant_id,
        current_user=current_user,
        db=db,
        require_admin=False
    )

    if not has_permission:
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to access payment settings for this tenant"
        )

    payment_service = PaymentService(db)
    settings = await payment_service.get_payment_settings(tenant_id)

    return {"settings": settings}


@router.put("/settings/{tenant_id}", response_model=dict)
async def update_payment_settings(
    tenant_id: int,
    settings_data: PaymentSettings,
    db: Session = Depends(deps.get_db),
    current_user: Any = Depends(get_current_active_user),
    _: bool = Depends(payment_security_checks("payment:settings")),
) -> Any:
    """
    Update payment settings for a store

    This endpoint requires the user to be either:
    - The tenant owner
    - An admin user with appropriate permissions
    """
    # Check permission
    has_permission = await check_payment_settings_permission(
        tenant_id=tenant_id,
        current_user=current_user,
        db=db,
        require_admin=True  # More restrictive for updates
    )

    if not has_permission:
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to update payment settings for this tenant"
        )

    payment_service = PaymentService(db)
    success = await payment_service.update_payment_settings(tenant_id, settings_data)

    # Create audit log for payment settings update
    create_audit_log(
        db=db,
        user_id=getattr(current_user, "id", None),
        action=AuditActionType.UPDATE,
        resource_type=AuditResourceType.SETTING,
        resource_id=f"payment_settings_{tenant_id}",
        details={
            "tenant_id": tenant_id,
            "operation": "update_payment_settings",
            "masked_data": mask_sensitive_data(settings_data.dict()),
        },
    )

    return {"success": success}


@router.post("/webhook/paystack", response_model=dict)
async def paystack_webhook(
    request: Request,
    x_paystack_signature: str = Header(None),
    db: Session = Depends(deps.get_db),
    _: bool = Depends(payment_security_checks("payment:webhook")),
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

        # Get Paystack secret key from environment variables
        settings = get_settings()
        secret_key = settings.PAYSTACK_SECRET_KEY

        provider = get_payment_provider(
            PaymentProvider.PAYSTACK, {"secret_key": secret_key}
        )

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
                await payment_service.verify_payment(
                    reference, PaymentProvider.PAYSTACK
                )

        return {"success": True, "message": f"Webhook processed: {event_type}"}

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error processing webhook: {str(e)}"
        )


@router.post("/webhook/flutterwave", response_model=dict)
async def flutterwave_webhook(
    request: Request,
    verify_hash: str = Header(None),
    db: Session = Depends(deps.get_db),
    _: bool = Depends(payment_security_checks("payment:webhook")),
) -> Any:
    """
    Handle Flutterwave webhook events
    """
    # Read request body
    payload = await request.body()

    try:
        # Get Flutterwave secret key from environment variables
        settings = get_settings()
        secret_key = settings.FLUTTERWAVE_SECRET_KEY

        provider = get_payment_provider(
            PaymentProvider.FLUTTERWAVE, {"secret_key": secret_key}
        )

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
                await payment_service.verify_payment(
                    tx_ref, PaymentProvider.FLUTTERWAVE
                )

        return {"success": True, "message": f"Webhook processed: {event_type}"}

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error processing webhook: {str(e)}"
        )


@router.post("/webhook/mpesa", response_model=dict)
async def mpesa_webhook(
    request: Request,
    db: Session = Depends(deps.get_db),
    _: bool = Depends(payment_security_checks("payment:webhook")),
) -> Any:
    """
    Handle M-Pesa webhook events
    """
    payload = await request.body()
    try:
        # Get M-Pesa credentials from environment variables
        settings = get_settings()
        credentials = {
            "consumer_key": settings.MPESA_CONSUMER_KEY,
            "consumer_secret": settings.MPESA_CONSUMER_SECRET,
            "shortcode": settings.MPESA_SHORTCODE,
            "passkey": settings.MPESA_PASSKEY,
        }
        provider = get_payment_provider(PaymentProvider.MPESA, credentials)
        # Validate webhook (add real logic as needed)
        if not provider.validate_webhook(payload, ""):
            raise HTTPException(
                status_code=400, detail="Invalid webhook signature")
        event_data = await request.json()
        # Extract reference (CheckoutRequestID or similar)
        reference = event_data.get(
            "CheckoutRequestID") or event_data.get("reference")
        if reference:
            payment_service = PaymentService(db)
            await payment_service.verify_payment(reference, PaymentProvider.MPESA)
        return {"success": True, "message": "Webhook processed"}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error processing webhook: {str(e)}"
        )


@router.post("/webhook/stripe", response_model=dict)
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None),
    db: Session = Depends(deps.get_db),
    _: bool = Depends(payment_security_checks("payment:webhook")),
) -> Any:
    """
    Handle Stripe webhook events
    """
    payload = await request.body()
    try:
        # Get Stripe secret key from environment variables
        settings = get_settings()
        credentials = {"secret_key": settings.STRIPE_SECRET_KEY}
        provider = get_payment_provider(PaymentProvider.STRIPE, credentials)
        if not provider.validate_webhook(payload, stripe_signature):
            raise HTTPException(
                status_code=400, detail="Invalid webhook signature")
        event_data = await request.json()
        # Stripe event types: payment_intent.succeeded, etc.
        event_type = event_data.get("type")
        if event_type == "payment_intent.succeeded":
            reference = event_data.get("data", {}).get("object", {}).get("id")
            if reference:
                payment_service = PaymentService(db)
                await payment_service.verify_payment(reference, PaymentProvider.STRIPE)
        return {"success": True, "message": f"Webhook processed: {event_type}"}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error processing webhook: {str(e)}"
        )
