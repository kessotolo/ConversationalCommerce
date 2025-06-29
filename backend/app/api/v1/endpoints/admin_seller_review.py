from fastapi import APIRouter, Depends, HTTPException, status, Query, Path
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime
from uuid import UUID

from app.api.deps import get_db, get_current_admin
from app.models.seller_onboarding import (
    SellerVerification, 
    SellerOnboardingStatus,
    SellerVerificationStatus,
    SellerVerificationType
)
from app.schemas.seller_onboarding import (
    VerificationResponse,
    VerificationAdminUpdate,
    OnboardingStatusResponse,
    AdminDashboardStats
)
from app.services.audit_service import create_audit_log, AuditActionType
from app.services.notification_service import NotificationService, NotificationType

router = APIRouter()


@router.get("/dashboard/stats", response_model=AdminDashboardStats)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """
    Get statistics for the admin dashboard.
    """
    # Count total pending verifications
    pending_result = await db.execute(
        select(func.count())
        .select_from(SellerVerification)
        .where(SellerVerification.status == SellerVerificationStatus.pending)
    )
    pending_count = pending_result.scalar_one()
    
    # Count in-review
    in_review_result = await db.execute(
        select(func.count())
        .select_from(SellerVerification)
        .where(SellerVerification.status == SellerVerificationStatus.in_review)
    )
    in_review_count = in_review_result.scalar_one()
    
    # Count rejected
    rejected_result = await db.execute(
        select(func.count())
        .select_from(SellerVerification)
        .where(SellerVerification.status == SellerVerificationStatus.rejected)
    )
    rejected_count = rejected_result.scalar_one()
    
    # Count additional info needed
    additional_info_result = await db.execute(
        select(func.count())
        .select_from(SellerVerification)
        .where(SellerVerification.status == SellerVerificationStatus.additional_info_needed)
    )
    additional_info_count = additional_info_result.scalar_one()
    
    # Count approved sellers
    approved_sellers_result = await db.execute(
        select(func.count())
        .select_from(SellerOnboardingStatus)
        .where(SellerOnboardingStatus.is_approved == True)
    )
    approved_sellers_count = approved_sellers_result.scalar_one()
    
    # Count by verification type that are pending
    pending_identity_result = await db.execute(
        select(func.count())
        .select_from(SellerVerification)
        .where(
            SellerVerification.status == SellerVerificationStatus.pending,
            SellerVerification.verification_type == SellerVerificationType.identity
        )
    )
    pending_identity = pending_identity_result.scalar_one()
    
    pending_business_result = await db.execute(
        select(func.count())
        .select_from(SellerVerification)
        .where(
            SellerVerification.status == SellerVerificationStatus.pending,
            SellerVerification.verification_type == SellerVerificationType.business
        )
    )
    pending_business = pending_business_result.scalar_one()
    
    pending_banking_result = await db.execute(
        select(func.count())
        .select_from(SellerVerification)
        .where(
            SellerVerification.status == SellerVerificationStatus.pending,
            SellerVerification.verification_type == SellerVerificationType.banking
        )
    )
    pending_banking = pending_banking_result.scalar_one()
    
    pending_tax_result = await db.execute(
        select(func.count())
        .select_from(SellerVerification)
        .where(
            SellerVerification.status == SellerVerificationStatus.pending,
            SellerVerification.verification_type == SellerVerificationType.tax
        )
    )
    pending_tax = pending_tax_result.scalar_one()
    
    pending_address_result = await db.execute(
        select(func.count())
        .select_from(SellerVerification)
        .where(
            SellerVerification.status == SellerVerificationStatus.pending,
            SellerVerification.verification_type == SellerVerificationType.address
        )
    )
    pending_address = pending_address_result.scalar_one()
    
    return AdminDashboardStats(
        pending_verifications=pending_count,
        in_review_verifications=in_review_count,
        approved_sellers=approved_sellers_count,
        rejected_verifications=rejected_count,
        additional_info_needed=additional_info_count,
        pending_identity=pending_identity,
        pending_business=pending_business,
        pending_banking=pending_banking,
        pending_tax=pending_tax,
        pending_address=pending_address
    )


@router.get("/verifications", response_model=List[VerificationResponse])
async def get_verifications(
    status: Optional[str] = Query(None),
    verification_type: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """
    Get all seller verifications, optionally filtered by status and type.
    """
    query = select(SellerVerification)
    
    # Apply filters if provided
    if status:
        query = query.where(SellerVerification.status == status)
    if verification_type:
        query = query.where(SellerVerification.verification_type == verification_type)
        
    # Apply pagination and sort by most recent first
    query = query.order_by(SellerVerification.submitted_at.desc()).limit(limit).offset(offset)
    
    result = await db.execute(query)
    verifications = result.scalars().all()
    
    return verifications


@router.get("/verifications/{verification_id}", response_model=VerificationResponse)
async def get_verification_details(
    verification_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """
    Get details of a specific verification.
    """
    result = await db.execute(
        select(SellerVerification)
        .where(SellerVerification.id == verification_id)
    )
    verification = result.scalar_one_or_none()
    
    if not verification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verification not found"
        )
    
    return verification


@router.patch("/verifications/{verification_id}", response_model=VerificationResponse)
async def update_verification_status(
    verification_id: UUID,
    admin_update: VerificationAdminUpdate,
    db: AsyncSession = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """
    Update the status of a verification request.
    
    Can be used to:
    - Mark as in review
    - Approve or reject
    - Request additional information
    """
    # Get the verification
    result = await db.execute(
        select(SellerVerification)
        .where(SellerVerification.id == verification_id)
    )
    verification = result.scalar_one_or_none()
    
    if not verification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verification not found"
        )
    
    # Update the verification
    old_status = verification.status
    verification.status = admin_update.status
    
    if admin_update.notes is not None:
        verification.notes = admin_update.notes
    
    if admin_update.rejection_reason is not None:
        verification.rejection_reason = admin_update.rejection_reason
    
    if admin_update.additional_info_requested is not None:
        verification.additional_info_requested = admin_update.additional_info_requested
    
    # Set reviewed information
    if old_status != admin_update.status:
        verification.reviewed_by = admin.id
        verification.reviewed_at = datetime.now()
    
    await db.commit()
    await db.refresh(verification)
    
    # Create audit log
    await create_audit_log(
        db,
        tenant_id=verification.tenant_id,
        action_type=AuditActionType.update,
        entity_type="seller_verification",
        entity_id=str(verification.id),
        actor_id=str(admin.id),
        details={
            "old_status": old_status,
            "new_status": verification.status,
            "verification_type": verification.verification_type
        }
    )
    
    # If status changed to approved, rejected, or additional_info_needed, send notification
    if (old_status != admin_update.status and 
        admin_update.status in [SellerVerificationStatus.approved, 
                              SellerVerificationStatus.rejected,
                              SellerVerificationStatus.additional_info_needed]):
        
        # Update seller onboarding status if verification is approved
        if admin_update.status == SellerVerificationStatus.approved:
            await _update_onboarding_status(
                db, 
                verification.seller_id,
                verification.tenant_id,
                verification.verification_type
            )
        
        # Send notification
        notification_service = NotificationService(db)
        
        # Determine notification type based on status
        notification_types = {
            SellerVerificationStatus.approved: NotificationType.VERIFICATION_APPROVED,
            SellerVerificationStatus.rejected: NotificationType.VERIFICATION_REJECTED,
            SellerVerificationStatus.additional_info_needed: NotificationType.VERIFICATION_INFO_NEEDED,
        }
        
        await notification_service.send_verification_notification(
            seller_id=verification.seller_id,
            tenant_id=verification.tenant_id,
            verification_id=verification.id,
            notification_type=notification_types[verification.status],
            verification_type=verification.verification_type,
            message=verification.notes or (
                f"Your {verification.verification_type} verification has been {verification.status}"
            )
        )
    
    return verification


@router.get("/sellers/{seller_id}", response_model=OnboardingStatusResponse)
async def get_seller_onboarding_status(
    seller_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """
    Get the onboarding status for a specific seller.
    """
    result = await db.execute(
        select(SellerOnboardingStatus)
        .where(SellerOnboardingStatus.seller_id == seller_id)
    )
    onboarding_status = result.scalar_one_or_none()
    
    if not onboarding_status:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seller onboarding status not found"
        )
    
    # Get all verifications for this seller
    verifications_result = await db.execute(
        select(SellerVerification)
        .where(SellerVerification.seller_id == seller_id)
    )
    verifications = verifications_result.scalars().all()
    
    # Include verifications in the response
    response = OnboardingStatusResponse.from_orm(onboarding_status)
    response.verifications = verifications
    
    return response


@router.post("/sellers/{seller_id}/approve", response_model=OnboardingStatusResponse)
async def approve_seller(
    seller_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """
    Approve a seller and activate their account.
    """
    # Get the seller onboarding status
    result = await db.execute(
        select(SellerOnboardingStatus)
        .where(SellerOnboardingStatus.seller_id == seller_id)
    )
    onboarding_status = result.scalar_one_or_none()
    
    if not onboarding_status:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seller onboarding status not found"
        )
    
    # Check if all required verifications are approved
    if not all([
        onboarding_status.is_identity_verified,
        onboarding_status.is_business_verified,
        onboarding_status.is_banking_verified,
        onboarding_status.is_tax_verified,
        onboarding_status.is_address_verified
    ]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not all required verifications have been completed"
        )
    
    # Mark as approved and set completion timestamp
    onboarding_status.is_approved = True
    onboarding_status.completed_at = datetime.now()
    
    await db.commit()
    await db.refresh(onboarding_status)
    
    # Create audit log
    await create_audit_log(
        db,
        tenant_id=onboarding_status.tenant_id,
        action_type=AuditActionType.update,
        entity_type="seller_onboarding",
        entity_id=str(onboarding_status.id),
        actor_id=str(admin.id),
        details={"action": "approve_seller"}
    )
    
    # Send notification
    notification_service = NotificationService(db)
    await notification_service.send_verification_notification(
        seller_id=seller_id,
        tenant_id=onboarding_status.tenant_id,
        verification_id=None,
        notification_type=NotificationType.SELLER_APPROVED,
        verification_type=None,
        message="Congratulations! Your seller account has been approved."
    )
    
    return onboarding_status


async def _update_onboarding_status(
    db: AsyncSession,
    seller_id: UUID,
    tenant_id: UUID,
    verification_type: SellerVerificationType
):
    """
    Update the onboarding status when a verification is approved.
    """
    # Get the onboarding status
    result = await db.execute(
        select(SellerOnboardingStatus)
        .where(
            SellerOnboardingStatus.seller_id == seller_id,
            SellerOnboardingStatus.tenant_id == tenant_id
        )
    )
    onboarding_status = result.scalar_one_or_none()
    
    if not onboarding_status:
        # Create if it doesn't exist
        onboarding_status = SellerOnboardingStatus(
            seller_id=seller_id,
            tenant_id=tenant_id
        )
        db.add(onboarding_status)
    
    # Update the appropriate verification field
    if verification_type == SellerVerificationType.identity:
        onboarding_status.is_identity_verified = True
    elif verification_type == SellerVerificationType.business:
        onboarding_status.is_business_verified = True
    elif verification_type == SellerVerificationType.banking:
        onboarding_status.is_banking_verified = True
    elif verification_type == SellerVerificationType.tax:
        onboarding_status.is_tax_verified = True
    elif verification_type == SellerVerificationType.address:
        onboarding_status.is_address_verified = True
    
    # Update completed steps
    if not onboarding_status.completed_steps:
        onboarding_status.completed_steps = []
    
    step = f"{verification_type}_verification"
    if step not in onboarding_status.completed_steps:
        onboarding_status.completed_steps.append(step)
    
    # Determine next step
    steps = [
        ("identity_verification", onboarding_status.is_identity_verified),
        ("business_verification", onboarding_status.is_business_verified),
        ("banking_verification", onboarding_status.is_banking_verified),
        ("tax_verification", onboarding_status.is_tax_verified),
        ("address_verification", onboarding_status.is_address_verified),
    ]
    
    next_step = next((name for name, complete in steps if not complete), None)
    onboarding_status.current_step = next_step
    
    await db.commit()
