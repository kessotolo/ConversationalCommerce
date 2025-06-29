from typing import Dict, List, Optional, Any, Union
from decimal import Decimal
import logging
from datetime import datetime
import uuid
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.payments import Payment, PaymentStatus, PaymentMethod, RefundTransaction
from app.models.returns import ReturnRequest, ReturnStatus
from app.services.refund_calculation_service import RefundCalculationService
from app.repositories.payment_repository import PaymentRepository
from app.repositories.return_repository import ReturnRepository
from app.core.config import settings
from app.integrations.payment.payment_provider_factory import PaymentProviderFactory

logger = logging.getLogger(__name__)

class RefundProcessingService:
    """Service for processing refunds through payment providers"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.payment_repo = PaymentRepository(db)
        self.return_repo = ReturnRepository(db)
        self.calculation_service = RefundCalculationService(db)
        self.provider_factory = PaymentProviderFactory()

    async def process_refund(
        self, 
        return_request_id: str, 
        tenant_id: str,
        refund_method: str = None,
        notes: str = None
    ) -> Dict[str, Any]:
        """
        Process a refund for an approved return request
        
        Args:
            return_request_id: The ID of the return request
            tenant_id: The tenant ID
            refund_method: Optional override for refund method
            notes: Optional notes about the refund
            
        Returns:
            Dictionary with refund transaction details
        """
        # Get the return request
        return_request = await self.return_repo.get_by_id(return_request_id, tenant_id)
        if not return_request:
            raise ValueError(f"Return request {return_request_id} not found")
            
        # Verify return is in a refundable status
        if return_request.status not in [ReturnStatus.APPROVED, ReturnStatus.PARTIAL_APPROVED, ReturnStatus.RECEIVED]:
            raise ValueError(f"Return request {return_request_id} is not in a refundable status")
            
        # Get the original payment(s) for this order
        payments = await self.payment_repo.get_payments_by_order_id(return_request.order_id, tenant_id)
        successful_payments = [p for p in payments if p.status == PaymentStatus.SUCCEEDED]
        
        if not successful_payments:
            raise ValueError(f"No successful payments found for order {return_request.order_id}")
        
        # Calculate refund amount if not already done
        if not return_request.refund_amount:
            refund_data = await self.calculation_service.calculate_refund_amounts(return_request_id, tenant_id)
            refund_amount = refund_data["total_refund"]
        else:
            refund_amount = return_request.refund_amount
            
        # Use specified refund method or fallback to original payment
        refund_method = refund_method or return_request.refund_method or "original_payment"
        
        # Process the refund through the appropriate channel
        if refund_method == "original_payment":
            # Refund to original payment method
            result = await self._refund_to_original_payment(
                payments=successful_payments,
                return_request=return_request,
                refund_amount=refund_amount
            )
        elif refund_method == "store_credit":
            # Issue store credit
            result = await self._issue_store_credit(
                return_request=return_request,
                tenant_id=tenant_id,
                refund_amount=refund_amount
            )
        elif refund_method == "manual_processing":
            # Record manual refund
            result = await self._record_manual_refund(
                return_request=return_request,
                tenant_id=tenant_id,
                refund_amount=refund_amount,
                notes=notes
            )
        else:
            raise ValueError(f"Unsupported refund method: {refund_method}")
            
        # Update return request status
        await self._update_return_request_status(
            return_request=return_request,
            tenant_id=tenant_id,
            refund_transaction_id=result.get("transaction_id"),
            refund_method=refund_method
        )
            
        return result
    
    async def _refund_to_original_payment(
        self,
        payments: List[Payment],
        return_request: ReturnRequest,
        refund_amount: Decimal
    ) -> Dict[str, Any]:
        """
        Process refund to original payment method
        
        Args:
            payments: List of original payments
            return_request: The return request
            refund_amount: Amount to refund
            
        Returns:
            Refund transaction details
        """
        # Most recent payment first
        payment_to_refund = sorted(payments, key=lambda p: p.created_at, reverse=True)[0]
        
        # Get the appropriate payment provider
        payment_provider = self.provider_factory.get_provider(
            provider_type=payment_to_refund.payment_method,
            tenant_id=return_request.tenant_id
        )
        
        # Process the refund through the payment provider
        refund_result = await payment_provider.process_refund(
            payment_id=payment_to_refund.provider_payment_id,
            amount=float(refund_amount),
            currency=return_request.refund_currency,
            reason=f"Return #{return_request.return_number}"
        )
        
        # Create refund transaction record
        refund_transaction = await self.payment_repo.create_refund_transaction({
            "id": str(uuid.uuid4()),
            "tenant_id": return_request.tenant_id,
            "return_request_id": return_request.id,
            "order_id": return_request.order_id,
            "payment_id": payment_to_refund.id,
            "amount": refund_amount,
            "currency": return_request.refund_currency,
            "status": "succeeded" if refund_result.get("success") else "failed",
            "provider_refund_id": refund_result.get("provider_refund_id"),
            "refund_method": "original_payment",
            "provider": payment_to_refund.payment_method,
            "metadata": refund_result.get("metadata", {})
        })
        
        return {
            "success": refund_result.get("success", False),
            "transaction_id": refund_transaction.id,
            "amount": refund_amount,
            "currency": return_request.refund_currency,
            "provider": payment_to_refund.payment_method,
            "provider_refund_id": refund_result.get("provider_refund_id"),
            "method": "original_payment",
            "date": datetime.now().isoformat()
        }
    
    async def _issue_store_credit(
        self,
        return_request: ReturnRequest,
        tenant_id: str,
        refund_amount: Decimal
    ) -> Dict[str, Any]:
        """
        Issue store credit for a return
        
        Args:
            return_request: The return request
            tenant_id: The tenant ID
            refund_amount: Amount to issue as store credit
            
        Returns:
            Store credit details
        """
        # Generate a unique credit code
        credit_code = f"CR-{return_request.return_number}"
        
        # Create a store credit record (implementation would depend on your store credit system)
        # This is a placeholder - you would need to implement store credit functionality
        store_credit = {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "customer_id": return_request.customer_id,
            "amount": refund_amount,
            "currency": return_request.refund_currency,
            "code": credit_code,
            "expires_at": None,  # No expiration
            "created_at": datetime.now().isoformat()
        }
        
        # Create refund transaction record
        refund_transaction = await self.payment_repo.create_refund_transaction({
            "id": str(uuid.uuid4()),
            "tenant_id": return_request.tenant_id,
            "return_request_id": return_request.id,
            "order_id": return_request.order_id,
            "amount": refund_amount,
            "currency": return_request.refund_currency,
            "status": "succeeded",
            "provider_refund_id": credit_code,
            "refund_method": "store_credit",
            "provider": "internal",
            "metadata": {"credit_id": store_credit["id"]}
        })
        
        return {
            "success": True,
            "transaction_id": refund_transaction.id,
            "amount": refund_amount,
            "currency": return_request.refund_currency,
            "provider": "store_credit",
            "provider_refund_id": credit_code,
            "method": "store_credit",
            "date": datetime.now().isoformat()
        }
    
    async def _record_manual_refund(
        self,
        return_request: ReturnRequest,
        tenant_id: str,
        refund_amount: Decimal,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Record a manual refund process
        
        Args:
            return_request: The return request
            tenant_id: The tenant ID
            refund_amount: Amount to refund manually
            notes: Optional notes about the manual refund
            
        Returns:
            Manual refund record details
        """
        transaction_id = str(uuid.uuid4())
        
        # Create refund transaction record
        refund_transaction = await self.payment_repo.create_refund_transaction({
            "id": transaction_id,
            "tenant_id": return_request.tenant_id,
            "return_request_id": return_request.id,
            "order_id": return_request.order_id,
            "amount": refund_amount,
            "currency": return_request.refund_currency,
            "status": "pending",  # Manual refunds start as pending
            "provider_refund_id": None,  # No provider ID for manual refunds
            "refund_method": "manual_processing",
            "provider": "manual",
            "metadata": {"notes": notes} if notes else {}
        })
        
        return {
            "success": True,
            "transaction_id": refund_transaction.id,
            "amount": refund_amount,
            "currency": return_request.refund_currency,
            "provider": "manual",
            "method": "manual_processing",
            "notes": notes,
            "date": datetime.now().isoformat()
        }
    
    async def _update_return_request_status(
        self,
        return_request: ReturnRequest,
        tenant_id: str,
        refund_transaction_id: str,
        refund_method: str
    ) -> None:
        """
        Update return request status after refund processing
        
        Args:
            return_request: The return request
            tenant_id: The tenant ID
            refund_transaction_id: ID of the refund transaction
            refund_method: Method used for the refund
        """
        update_data = {
            "refund_method": refund_method,
            "refund_transaction_id": refund_transaction_id,
            "refund_processed_at": datetime.now().isoformat()
        }
        
        # If the return items have been received, mark as completed
        if return_request.status == ReturnStatus.RECEIVED:
            update_data["status"] = ReturnStatus.COMPLETED
            update_data["completed_at"] = datetime.now().isoformat()
        
        await self.return_repo.update(
            return_request_id=return_request.id,
            tenant_id=tenant_id,
            data=update_data
        )
        
    async def mark_refund_as_completed(
        self,
        refund_transaction_id: str,
        tenant_id: str
    ) -> Dict[str, Any]:
        """
        Mark a manual refund as completed
        
        Args:
            refund_transaction_id: The ID of the refund transaction
            tenant_id: The tenant ID
            
        Returns:
            Updated refund transaction details
        """
        # Update the refund transaction status
        refund_transaction = await self.payment_repo.update_refund_transaction(
            refund_transaction_id=refund_transaction_id,
            tenant_id=tenant_id,
            data={
                "status": "succeeded",
                "processed_at": datetime.now().isoformat()
            }
        )
        
        if not refund_transaction:
            raise ValueError(f"Refund transaction {refund_transaction_id} not found")
        
        # Get the associated return request
        return_request = await self.return_repo.get_by_id(
            refund_transaction.return_request_id,
            tenant_id
        )
        
        # Update the return request status if needed
        if return_request and return_request.status == ReturnStatus.RECEIVED:
            await self._update_return_request_status(
                return_request=return_request,
                tenant_id=tenant_id,
                refund_transaction_id=refund_transaction_id,
                refund_method=refund_transaction.refund_method
            )
            
        return {
            "transaction_id": refund_transaction.id,
            "status": "succeeded",
            "amount": refund_transaction.amount,
            "currency": refund_transaction.currency,
            "method": refund_transaction.refund_method,
            "date": datetime.now().isoformat()
        }
