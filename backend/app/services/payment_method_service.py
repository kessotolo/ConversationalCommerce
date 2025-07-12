from datetime import datetime
from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.payment_method import PaymentMethod
from backend.app.schemas.payment_method import PaymentMethodCreate, PaymentMethodUpdate
from backend.app.services.audit_service import create_audit_log, AuditActionType
from backend.app.core.exceptions import AppError

"""
Payment Method Service

This service handles the business logic for saved payment methods,
providing functionality for:

- Creating saved payment methods
- Retrieving saved payment methods for a customer
- Updating payment method details
- Setting a default payment method
- Deleting payment methods

Key business rules:
1. Payment methods are saved securely using provider tokenization
2. Only one payment method can be the default
3. Customers can only access their own payment methods
4. Actual sensitive data is never stored, only tokens and display information
"""


class PaymentMethodError(AppError):
    """Base exception for payment method-related errors."""
    pass


class PaymentMethodNotFoundError(PaymentMethodError):
    """Raised when a payment method is not found."""
    pass


class PaymentMethodService:
    """Service for handling saved payment methods."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_payment_method(
        self,
        payment_data: PaymentMethodCreate,
        customer_id: UUID,
        tenant_id: UUID,
    ) -> PaymentMethod:
        """
        Create a new saved payment method.

        Args:
            payment_data: Payment method data
            customer_id: ID of the customer
            tenant_id: Tenant ID for isolation

        Returns:
            Created PaymentMethod object
        """
        # If this is set as default, unset any existing defaults
        if payment_data.is_default:
            await self._unset_existing_defaults(customer_id, tenant_id)

        # Create the payment method
        payment_method = PaymentMethod(
            customer_id=customer_id,
            tenant_id=tenant_id,
            payment_type=payment_data.payment_type,
            nickname=payment_data.nickname,
            provider=payment_data.provider,
            provider_token=payment_data.provider_token,
            provider_payment_id=payment_data.provider_payment_id,
            display_name=payment_data.display_name,
            last_four=payment_data.last_four,
            expiry_date=payment_data.expiry_date,
            billing_address=payment_data.billing_address,
            is_default=payment_data.is_default,
            payment_metadata=payment_data.payment_metadata,
        )

        self.db.add(payment_method)
        await self.db.commit()
        await self.db.refresh(payment_method)

        # Create audit log
        await create_audit_log(
            self.db,
            tenant_id=tenant_id,
            action_type=AuditActionType.create,
            entity_type="payment_method",
            entity_id=str(payment_method.id),
            actor_id=str(customer_id),
            details={
                "payment_type": payment_data.payment_type,
                "provider": payment_data.provider,
                "is_default": payment_data.is_default
            }
        )

        return payment_method

    async def get_payment_methods(
        self,
        customer_id: UUID,
        tenant_id: UUID,
        active_only: bool = True,
    ) -> List[PaymentMethod]:
        """
        Get all payment methods for a customer.

        Args:
            customer_id: Customer ID to filter by
            tenant_id: Tenant ID for isolation
            active_only: If True, only return active payment methods

        Returns:
            List of PaymentMethod objects
        """
        query = select(PaymentMethod).where(
            PaymentMethod.customer_id == customer_id,
            PaymentMethod.tenant_id == tenant_id,
        )

        if active_only:
            query = query.where(PaymentMethod.is_active == True)

        result = await self.db.execute(query)
        payment_methods = result.scalars().all()

        return payment_methods

    async def get_payment_method(
        self,
        payment_method_id: UUID,
        customer_id: UUID,
        tenant_id: UUID,
    ) -> PaymentMethod:
        """
        Get a specific payment method.

        Args:
            payment_method_id: ID of the payment method to retrieve
            customer_id: Customer ID for verification
            tenant_id: Tenant ID for isolation

        Returns:
            PaymentMethod object

        Raises:
            PaymentMethodNotFoundError: If the payment method is not found
        """
        result = await self.db.execute(
            select(PaymentMethod).where(
                PaymentMethod.id == payment_method_id,
                PaymentMethod.customer_id == customer_id,
                PaymentMethod.tenant_id == tenant_id,
            )
        )
        payment_method = result.scalar_one_or_none()

        if not payment_method:
            raise PaymentMethodNotFoundError(
                f"Payment method {payment_method_id} not found")

        return payment_method

    async def update_payment_method(
        self,
        payment_method_id: UUID,
        payment_update: PaymentMethodUpdate,
        customer_id: UUID,
        tenant_id: UUID,
    ) -> PaymentMethod:
        """
        Update a payment method.

        Args:
            payment_method_id: ID of the payment method to update
            payment_update: Update data
            customer_id: Customer ID for verification
            tenant_id: Tenant ID for isolation

        Returns:
            Updated PaymentMethod object

        Raises:
            PaymentMethodNotFoundError: If the payment method is not found
        """
        # Get the payment method
        payment_method = await self.get_payment_method(
            payment_method_id=payment_method_id,
            customer_id=customer_id,
            tenant_id=tenant_id,
        )

        # If setting as default, unset any existing defaults
        if payment_update.is_default:
            await self._unset_existing_defaults(customer_id, tenant_id)

        # Update fields
        update_data = payment_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(payment_method, field, value)

        await self.db.commit()
        await self.db.refresh(payment_method)

        # Create audit log
        await create_audit_log(
            self.db,
            tenant_id=tenant_id,
            action_type=AuditActionType.update,
            entity_type="payment_method",
            entity_id=str(payment_method.id),
            actor_id=str(customer_id),
            details={"updated_fields": list(update_data.keys())}
        )

        return payment_method

    async def delete_payment_method(
        self,
        payment_method_id: UUID,
        customer_id: UUID,
        tenant_id: UUID,
    ) -> None:
        """
        Delete a payment method.

        Actually just marks it as inactive rather than physically deleting.

        Args:
            payment_method_id: ID of the payment method to delete
            customer_id: Customer ID for verification
            tenant_id: Tenant ID for isolation

        Raises:
            PaymentMethodNotFoundError: If the payment method is not found
        """
        # Get the payment method
        payment_method = await self.get_payment_method(
            payment_method_id=payment_method_id,
            customer_id=customer_id,
            tenant_id=tenant_id,
        )

        # Mark as inactive
        payment_method.is_active = False

        # If this was the default, we need to find another one to make default
        if payment_method.is_default:
            payment_method.is_default = False

            # Find another active payment method to make default
            result = await self.db.execute(
                select(PaymentMethod).where(
                    PaymentMethod.customer_id == customer_id,
                    PaymentMethod.tenant_id == tenant_id,
                    PaymentMethod.is_active == True,
                    PaymentMethod.id != payment_method_id,
                ).limit(1)
            )
            another_payment_method = result.scalar_one_or_none()

            if another_payment_method:
                another_payment_method.is_default = True

        await self.db.commit()

        # Create audit log
        await create_audit_log(
            self.db,
            tenant_id=tenant_id,
            action_type=AuditActionType.delete,
            entity_type="payment_method",
            entity_id=str(payment_method.id),
            actor_id=str(customer_id),
            details={"action": "deactivate"}
        )

    async def set_default_payment_method(
        self,
        payment_method_id: UUID,
        customer_id: UUID,
        tenant_id: UUID,
    ) -> PaymentMethod:
        """
        Set a payment method as the default.

        Args:
            payment_method_id: ID of the payment method to set as default
            customer_id: Customer ID for verification
            tenant_id: Tenant ID for isolation

        Returns:
            Updated PaymentMethod object

        Raises:
            PaymentMethodNotFoundError: If the payment method is not found
        """
        # Unset any existing defaults
        await self._unset_existing_defaults(customer_id, tenant_id)

        # Get the payment method
        payment_method = await self.get_payment_method(
            payment_method_id=payment_method_id,
            customer_id=customer_id,
            tenant_id=tenant_id,
        )

        # Set as default
        payment_method.is_default = True
        await self.db.commit()
        await self.db.refresh(payment_method)

        # Create audit log
        await create_audit_log(
            self.db,
            tenant_id=tenant_id,
            action_type=AuditActionType.update,
            entity_type="payment_method",
            entity_id=str(payment_method.id),
            actor_id=str(customer_id),
            details={"action": "set_default"}
        )

        return payment_method

    async def mark_payment_method_used(
        self,
        payment_method_id: UUID,
        customer_id: UUID,
        tenant_id: UUID,
    ) -> None:
        """
        Mark a payment method as used (updates last_used_at).

        Args:
            payment_method_id: ID of the payment method
            customer_id: Customer ID for verification
            tenant_id: Tenant ID for isolation

        Raises:
            PaymentMethodNotFoundError: If the payment method is not found
        """
        # Get the payment method
        payment_method = await self.get_payment_method(
            payment_method_id=payment_method_id,
            customer_id=customer_id,
            tenant_id=tenant_id,
        )

        # Update last_used_at
        payment_method.last_used_at = datetime.now()
        await self.db.commit()

    async def _unset_existing_defaults(
        self,
        customer_id: UUID,
        tenant_id: UUID,
    ) -> None:
        """
        Unset any existing default payment methods for a customer.

        Args:
            customer_id: Customer ID to filter by
            tenant_id: Tenant ID for isolation
        """
        await self.db.execute(
            update(PaymentMethod)
            .where(
                PaymentMethod.customer_id == customer_id,
                PaymentMethod.tenant_id == tenant_id,
                PaymentMethod.is_default == True,
            )
            .values(is_default=False)
        )
        await self.db.commit()
