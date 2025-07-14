from decimal import Decimal
from typing import List, Dict, Optional, Tuple
import logging
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.orders import Order, OrderItem
from app.models.payments import Payment, PaymentStatus
from app.models.returns import ReturnRequest, ReturnItem, ReturnStatus
from app.models.taxes import Tax
from app.repositories.order_repository import OrderRepository
from app.repositories.payment_repository import PaymentRepository
from app.repositories.return_repository import ReturnRepository

logger = logging.getLogger(__name__)

class RefundCalculationService:
    """Service for calculating refund amounts for return requests"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.order_repo = OrderRepository(db)
        self.payment_repo = PaymentRepository(db)
        self.return_repo = ReturnRepository(db)

    async def calculate_refund_amounts(
        self, 
        return_request_id: str, 
        tenant_id: str
    ) -> Dict:
        """
        Calculate refund amounts for a return request
        
        Args:
            return_request_id: The ID of the return request
            tenant_id: The tenant ID
            
        Returns:
            Dictionary with refund breakdown and totals
        """
        # Fetch the return request with items
        return_request = await self.return_repo.get_by_id(return_request_id, tenant_id)
        if not return_request:
            raise ValueError(f"Return request {return_request_id} not found")
            
        # Fetch the original order
        order = await self.order_repo.get_by_id(return_request.order_id, tenant_id)
        if not order:
            raise ValueError(f"Order {return_request.order_id} not found")
            
        # Get payment information for the order
        payments = await self.payment_repo.get_payments_by_order_id(order.id, tenant_id)
        successful_payments = [p for p in payments if p.status == PaymentStatus.SUCCEEDED]
        
        if not successful_payments:
            raise ValueError(f"No successful payments found for order {order.id}")
            
        # Calculate refund amounts for each return item
        return_items = await self.return_repo.get_items_by_return_id(return_request_id)
        
        refund_breakdown = await self._calculate_item_refunds(
            return_items=return_items,
            order=order,
            return_request=return_request
        )
        
        # Calculate the totals
        subtotal = sum(item['refund_amount'] for item in refund_breakdown['items'])
        tax_total = sum(item['refund_tax_amount'] for item in refund_breakdown['items'])
        
        # Calculate shipping refund if applicable
        shipping_refund = await self._calculate_shipping_refund(
            order=order,
            return_request=return_request,
            items_total=subtotal
        )
        
        # Apply any adjustments based on merchant policies
        adjustments = await self._calculate_policy_adjustments(
            return_request=return_request,
            tenant_id=tenant_id
        )

        # Final refund amount
        total_refund = subtotal + tax_total + shipping_refund + adjustments
        
        # Currency is always taken from the order
        currency = order.currency
        
        return {
            'breakdown': refund_breakdown,
            'subtotal': subtotal,
            'tax_total': tax_total,
            'shipping_refund': shipping_refund,
            'adjustments': adjustments,
            'total_refund': total_refund,
            'currency': currency,
            'order_id': order.id,
            'return_id': return_request_id
        }

    async def _calculate_item_refunds(
        self, 
        return_items: List[ReturnItem],
        order: Order,
        return_request: ReturnRequest
    ) -> Dict:
        """
        Calculate refund amounts for individual items
        
        Args:
            return_items: List of return items
            order: The original order
            return_request: The return request
            
        Returns:
            Dictionary with item refund details
        """
        result = {
            'items': []
        }
        
        order_items_map = {item.id: item for item in order.items}
        
        for return_item in return_items:
            if return_item.order_item_id not in order_items_map:
                logger.warning(f"Order item {return_item.order_item_id} not found in order {order.id}")
                continue
                
            order_item = order_items_map[return_item.order_item_id]
            
            # Calculate unit price including discounts from the original order
            unit_price = order_item.unit_price
            original_quantity = order_item.quantity
            
            # Apply any discounts proportionally
            if order.discount_total and original_quantity > 0:
                # Calculate item's share of the discount
                item_subtotal = unit_price * original_quantity
                order_subtotal = sum(item.unit_price * item.quantity for item in order.items)
                if order_subtotal > 0:
                    discount_share = (item_subtotal / order_subtotal) * order.discount_total
                    discount_per_unit = discount_share / original_quantity
                    unit_price -= discount_per_unit
            
            # Calculate refund amount for this item
            refund_amount = unit_price * return_item.quantity
            
            # Calculate tax refund
            tax_rate = self._get_tax_rate_for_item(order_item, order)
            refund_tax_amount = refund_amount * tax_rate
            
            # Create the refund item details
            item_detail = {
                'return_item_id': return_item.id,
                'order_item_id': return_item.order_item_id,
                'product_name': order_item.product_name,
                'variant_name': order_item.variant_name,
                'quantity': return_item.quantity,
                'unit_price': unit_price,
                'refund_amount': refund_amount,
                'refund_tax_amount': refund_tax_amount
            }
            
            result['items'].append(item_detail)
            
        return result

    def _get_tax_rate_for_item(self, order_item: OrderItem, order: Order) -> Decimal:
        """
        Get the tax rate applicable to a specific order item
        
        Args:
            order_item: The order item
            order: The order containing tax information
            
        Returns:
            The decimal tax rate (0.0 if no tax applies)
        """
        # If we have the tax field populated on the order item, calculate the rate
        if hasattr(order_item, 'tax_amount') and order_item.tax_amount and order_item.quantity > 0:
            return Decimal(order_item.tax_amount) / (Decimal(order_item.unit_price) * Decimal(order_item.quantity))
        
        # Fall back to the order's overall tax rate
        if order.tax_total and order.subtotal and order.subtotal > 0:
            return Decimal(order.tax_total) / Decimal(order.subtotal)
            
        # Default to no tax if no data available
        return Decimal('0.0')

    async def _calculate_shipping_refund(
        self, 
        order: Order,
        return_request: ReturnRequest,
        items_total: Decimal
    ) -> Decimal:
        """
        Calculate shipping refund amount
        
        Args:
            order: The original order
            return_request: The return request
            items_total: The total refund amount for items
            
        Returns:
            The shipping refund amount
        """
        # Get the shipping policy for the tenant
        # For simplicity, we'll use common policies but this could be tenant-specific
        shipping_refund_policy = 'full'  # Other options: 'none', 'proportional'
        
        if not order.shipping_total or order.shipping_total <= 0:
            return Decimal('0.0')
            
        if shipping_refund_policy == 'none':
            # No shipping refund
            return Decimal('0.0')
            
        elif shipping_refund_policy == 'proportional':
            # Calculate proportional shipping refund based on item value
            if order.subtotal and order.subtotal > 0:
                proportion = items_total / Decimal(order.subtotal)
                return Decimal(order.shipping_total) * proportion
            return Decimal('0.0')
            
        else:  # full refund policy
            # Full shipping refund if all items are being returned
            all_items_returned = await self._is_full_order_return(return_request, order)
            if all_items_returned:
                return Decimal(order.shipping_total)
            else:
                return Decimal('0.0')
    
    async def _is_full_order_return(self, return_request: ReturnRequest, order: Order) -> bool:
        """Check if all items from the order are being returned"""
        # Get all return items for this order, including from other return requests
        all_return_items = await self.return_repo.get_return_items_by_order(order.id, order.tenant_id)
        
        # Group by order item ID and sum quantities
        returned_quantities = {}
        for item in all_return_items:
            if item.order_item_id not in returned_quantities:
                returned_quantities[item.order_item_id] = 0
            returned_quantities[item.order_item_id] += item.quantity
        
        # Check if all items have been fully returned
        for order_item in order.items:
            returned_qty = returned_quantities.get(order_item.id, 0)
            if returned_qty < order_item.quantity:
                return False
        
        return True

    async def _calculate_policy_adjustments(
        self, 
        return_request: ReturnRequest,
        tenant_id: str
    ) -> Decimal:
        """
        Calculate adjustments based on return policies
        
        Args:
            return_request: The return request
            tenant_id: The tenant ID
            
        Returns:
            Adjustment amount (negative for fees)
        """
        # Placeholder for policy-based adjustments like restocking fees, etc.
        # In a real implementation, this would check tenant-specific policies
        
        # Example: Apply restocking fee for certain return reasons
        restocking_fee = Decimal('0.0')
        if return_request.reason in ['no_longer_needed', 'other']:
            # Apply a 10% restocking fee for these types of returns
            # This would need to be calculated on the item totals
            # For now, we're returning 0, but this is where the calculation would go
            pass
            
        return -restocking_fee  # Negative because it's a deduction
    
    async def approve_return_with_refund(
        self, 
        return_request_id: str, 
        tenant_id: str,
        items_to_approve: List[str] = None,
        override_amounts: Dict[str, Decimal] = None
    ) -> Dict:
        """
        Approve a return request with calculated refund amounts
        
        Args:
            return_request_id: The ID of the return request
            tenant_id: The tenant ID
            items_to_approve: Optional list of return item IDs to approve (if None, approve all)
            override_amounts: Optional dict mapping return item IDs to override refund amounts
            
        Returns:
            Dictionary with approved return and refund details
        """
        # Calculate standard refund amounts
        refund_data = await self.calculate_refund_amounts(return_request_id, tenant_id)
        
        # Get the return request
        return_request = await self.return_repo.get_by_id(return_request_id, tenant_id)
        
        # Determine which items to approve
        return_items = await self.return_repo.get_items_by_return_id(return_request_id)
        
        if items_to_approve is not None:
            # Filter to only include specified items
            return_items = [item for item in return_items if item.id in items_to_approve]
            
            # If some items are approved but not all, set status to partial
            if len(return_items) < len(await self.return_repo.get_items_by_return_id(return_request_id)):
                status = ReturnStatus.PARTIAL_APPROVED
            else:
                status = ReturnStatus.APPROVED
        else:
            # Approve all items
            status = ReturnStatus.APPROVED
        
        # Apply any overridden refund amounts
        if override_amounts:
            for item_detail in refund_data['breakdown']['items']:
                if item_detail['return_item_id'] in override_amounts:
                    item_detail['refund_amount'] = override_amounts[item_detail['return_item_id']]
        
        # Update return request status
        await self.return_repo.update(
            return_request_id=return_request_id,
            tenant_id=tenant_id,
            data={
                'status': status,
                'refund_amount': refund_data['total_refund']
            }
        )
        
        # Update each return item status
        for item in return_items:
            # Find the calculated refund for this item
            item_refund = next(
                (i for i in refund_data['breakdown']['items'] if i['return_item_id'] == item.id),
                None
            )
            
            if item_refund:
                await self.return_repo.update_return_item(
                    item_id=item.id,
                    data={
                        'status': status,
                        'refund_amount': item_refund['refund_amount'],
                        'refund_tax_amount': item_refund['refund_tax_amount']
                    }
                )
        
        # Return the updated refund calculation
        return refund_data
