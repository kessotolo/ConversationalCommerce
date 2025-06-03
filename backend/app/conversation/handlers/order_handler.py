import logging
import json
import uuid
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime

from app.domain.models.order import (
    Order, 
    OrderStatus, 
    OrderSource, 
    PaymentMethod,
    PaymentStatus,
    CreateOrderRequest,
    CustomerInfo,
    Money,
    Address,
    ShippingDetails,
    PaymentDetails,
    OrderItem
)
from app.domain.events.event_bus import get_event_bus
from app.domain.events.order_events import OrderEventFactory
from app.conversation.nlp.intent_parser import IntentType, ParsedIntent
from app.conversation.message_builder import MessageBuilder, MessageType
from app.services.cart_service import get_cart_service
from app.database import get_db
from app.utils.retry import with_retry

logger = logging.getLogger(__name__)

class OrderIntentHandler:
    """
    Handler for order-related intents from conversational channels.
    Integrates with the existing WhatsApp NLP pipeline.
    
    Optimized for African market with offline resilience and graceful fallbacks.
    """
    
    def __init__(self, tenant_id: str, user_id: Optional[str] = None):
        self.tenant_id = tenant_id
        self.user_id = user_id
        self.db = next(get_db())
        self.cart_service = get_cart_service()
        self.event_bus = get_event_bus()
        self.message_builder = MessageBuilder()
    
    async def handle_intent(self, intent: ParsedIntent, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle order-related intents from conversational interfaces
        
        Args:
            intent: The parsed intent from NLP
            context: Conversation context with user info, conversation history, etc.
            
        Returns:
            Response object with messages to send and any updated context
        """
        intent_type = intent.intent_type
        
        # Map intent types to handler methods
        handlers = {
            IntentType.CHECKOUT: self.handle_checkout_intent,
            IntentType.ORDER_STATUS: self.handle_order_status_intent,
            IntentType.CANCEL_ORDER: self.handle_cancel_order_intent,
            IntentType.TRACK_ORDER: self.handle_track_order_intent,
            IntentType.PAYMENT_CONFIRMATION: self.handle_payment_confirmation_intent,
        }
        
        # Get the appropriate handler or use fallback
        handler = handlers.get(intent_type)
        
        if not handler:
            return await self.handle_unknown_intent(intent, context)
        
        # Execute the handler with retry for resilience
        try:
            return await with_retry(
                handler,
                retry_count=3,
                exceptions=(Exception,),
                args=(intent, context)
            )
        except Exception as e:
            logger.error(f"Error handling intent {intent_type}: {str(e)}", exc_info=True)
            return self.create_error_response(context)
    
    async def handle_checkout_intent(self, intent: ParsedIntent, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle checkout intent from conversational interfaces
        
        Flow:
        1. Retrieve cart
        2. Extract shipping and payment info from intent
        3. Create order in pending state
        4. Send payment instructions
        5. Clear cart
        """
        # Get user phone from context
        user_phone = context.get('phone_number') or context.get('user', {}).get('phone')
        
        if not user_phone:
            return self.create_invalid_response(
                context, 
                "I couldn't find your contact information. Please provide your phone number."
            )
        
        # Get user's cart with retry for resilience
        cart_result = await with_retry(
            self.cart_service.get_cart_by_phone,
            retry_count=3,
            args=(user_phone, self.tenant_id)
        )
        
        if not cart_result or not cart_result.get('items') or len(cart_result.get('items', [])) == 0:
            return self.create_invalid_response(
                context,
                "Your cart is empty. Add some products first before checking out."
            )
        
        # Extract customer info
        customer_name = intent.entities.get('customer_name') or context.get('user', {}).get('name')
        
        if not customer_name:
            # Ask for customer name if not available
            context['awaiting_customer_name'] = True
            return {
                'messages': [
                    self.message_builder.text_message(
                        "Please provide your full name to complete the checkout."
                    )
                ],
                'context': context
            }
        
        # Extract shipping address
        shipping_address = self._extract_address_from_intent(intent, context)
        
        if not shipping_address:
            # Ask for address if not available
            context['awaiting_address'] = True
            return {
                'messages': [
                    self.message_builder.text_message(
                        "Please provide your delivery address to complete the checkout."
                    )
                ],
                'context': context
            }
        
        # Calculate totals
        cart_items = cart_result.get('items', [])
        subtotal = sum(item.get('price', 0) * item.get('quantity', 0) for item in cart_items)
        shipping_cost = 500  # Default shipping cost (e.g., 500 KES)
        tax_amount = subtotal * 0.16  # Example: 16% tax
        total_amount = subtotal + shipping_cost + tax_amount
        currency = "KES"  # Default currency
        
        # Generate order items from cart
        order_items = [
            OrderItem(
                product_id=item.get('product_id'),
                product_name=item.get('name'),
                quantity=item.get('quantity', 1),
                unit_price=Money(amount=item.get('price', 0), currency=currency),
                total_price=Money(amount=item.get('price', 0) * item.get('quantity', 1), currency=currency),
                variant_id=item.get('variant_id'),
                variant_name=item.get('variant_name'),
                image_url=item.get('image_url')
            )
            for item in cart_items
        ]
        
        # Determine payment method (default to mobile money in African markets)
        payment_method = intent.entities.get('payment_method')
        if payment_method:
            try:
                payment_method = PaymentMethod(payment_method.upper())
            except ValueError:
                payment_method = PaymentMethod.MOBILE_MONEY
        else:
            payment_method = PaymentMethod.MOBILE_MONEY
        
        # Create unique order request
        order_request = CreateOrderRequest(
            customer=CustomerInfo(
                name=customer_name,
                phone=user_phone,
                email=context.get('user', {}).get('email'),
                is_guest=True
            ),
            items=order_items,
            shipping=ShippingDetails(
                address=shipping_address,
                method="Standard Delivery",
                shipping_cost=Money(amount=shipping_cost, currency=currency)
            ),
            payment=PaymentDetails(
                method=payment_method,
                status=PaymentStatus.PENDING,
                amount_paid=Money(amount=total_amount, currency=currency),
                phone_number=user_phone
            ),
            source=OrderSource.WHATSAPP,
            notes=intent.entities.get('notes'),
            tenant_id=self.tenant_id,
            idempotency_key=str(uuid.uuid4())
        )
        
        # Generate unique order number
        order_number = f"ORD-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
        
        # Create order domain model
        order = Order(
            id=str(uuid.uuid4()),
            tenant_id=self.tenant_id,
            order_number=order_number,
            customer=order_request.customer,
            items=order_request.items,
            subtotal=Money(amount=subtotal, currency=currency),
            tax=Money(amount=tax_amount, currency=currency),
            total_amount=Money(amount=total_amount, currency=currency),
            status=OrderStatus.PENDING,
            source=OrderSource.WHATSAPP,
            shipping=order_request.shipping,
            payment=order_request.payment,
            notes=order_request.notes,
            idempotency_key=order_request.idempotency_key,
            timeline=[{
                "status": OrderStatus.PENDING,
                "note": "Order created via WhatsApp",
                "created_by": "system"
            }]
        )
        
        # Save order to database
        # Note: In a real implementation, this would save to the database
        # For this example, we'll just simulate success
        
        # Publish order created event
        event = OrderEventFactory.create_order_created_event(order)
        await self.event_bus.publish(event)
        
        # Clear the cart
        await self.cart_service.clear_cart(user_phone, self.tenant_id)
        
        # Build response with payment instructions
        response_messages = []
        
        # Order confirmation message
        response_messages.append(
            self.message_builder.text_message(
                f"🛒 Order #{order_number} created successfully!\n\n"
                f"Total: {total_amount} {currency}\n"
                f"Items: {len(order_items)}\n"
                f"Delivery: {shipping_address.city}, {shipping_address.street}"
            )
        )
        
        # Payment instructions based on payment method
        payment_instructions = self._get_payment_instructions(payment_method, total_amount, currency)
        response_messages.append(
            self.message_builder.text_message(payment_instructions)
        )
        
        # Add order to context
        context['last_order_id'] = order.id
        context['last_order_number'] = order_number
        
        return {
            'messages': response_messages,
            'context': context
        }
    
    async def handle_order_status_intent(self, intent: ParsedIntent, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle order status inquiry"""
        # Extract order identifier from intent or context
        order_id = intent.entities.get('order_id')
        order_number = intent.entities.get('order_number') or context.get('last_order_number')
        
        if not order_id and not order_number:
            return {
                'messages': [
                    self.message_builder.text_message(
                        "Please provide your order number to check the status."
                    )
                ],
                'context': context
            }
        
        # Simulate fetching order (would use order service in production)
        # In a real implementation, this would query the database
        
        # Create a simulated order for this example
        order = Order(
            id=order_id or str(uuid.uuid4()),
            tenant_id=self.tenant_id,
            order_number=order_number or f"ORD-20250603-1234",
            customer=CustomerInfo(
                name=context.get('user', {}).get('name', 'Customer'),
                phone=context.get('phone_number'),
                is_guest=True
            ),
            items=[],  # Would have actual items
            subtotal=Money(amount=1500, currency="KES"),
            tax=Money(amount=240, currency="KES"),
            total_amount=Money(amount=2240, currency="KES"),
            status=OrderStatus.PROCESSING,  # Sample status
            source=OrderSource.WHATSAPP,
            shipping=ShippingDetails(
                address=Address(
                    street="123 Main St",
                    city="Nairobi",
                    state="Nairobi",
                    country="Kenya"
                ),
                method="Standard Delivery",
                shipping_cost=Money(amount=500, currency="KES")
            ),
            payment=PaymentDetails(
                method=PaymentMethod.MOBILE_MONEY,
                status=PaymentStatus.COMPLETED,
                amount_paid=Money(amount=2240, currency="KES")
            ),
            idempotency_key=str(uuid.uuid4()),
            timeline=[
                {
                    "status": OrderStatus.PENDING,
                    "note": "Order created",
                    "timestamp": (datetime.utcnow().replace(hour=10, minute=15)).isoformat()
                },
                {
                    "status": OrderStatus.PAID,
                    "note": "Payment received",
                    "timestamp": (datetime.utcnow().replace(hour=10, minute=30)).isoformat()
                },
                {
                    "status": OrderStatus.PROCESSING,
                    "note": "Order is being prepared",
                    "timestamp": (datetime.utcnow().replace(hour=11, minute=0)).isoformat()
                }
            ]
        )
        
        # Format timeline for WhatsApp
        timeline_text = "\n".join([
            f"• {event.get('status')}: {datetime.fromisoformat(event.get('timestamp')).strftime('%I:%M %p')}"
            for event in order.timeline
        ])
        
        # Build status message
        status_message = (
            f"📦 *Order #{order.order_number} Status*\n\n"
            f"Current Status: *{order.status}*\n\n"
            f"Timeline:\n{timeline_text}\n\n"
            f"Total: {order.total_amount.amount} {order.total_amount.currency}"
        )
        
        # Add next steps based on status
        next_steps = self._get_next_steps_for_status(order.status)
        if next_steps:
            status_message += f"\n\nNext Steps:\n{next_steps}"
        
        return {
            'messages': [
                self.message_builder.text_message(status_message)
            ],
            'context': context
        }
    
    async def handle_cancel_order_intent(self, intent: ParsedIntent, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle order cancellation request"""
        # Extract order identifier from intent or context
        order_id = intent.entities.get('order_id')
        order_number = intent.entities.get('order_number') or context.get('last_order_number')
        
        if not order_id and not order_number:
            return {
                'messages': [
                    self.message_builder.text_message(
                        "Please provide your order number to cancel."
                    )
                ],
                'context': context
            }
        
        # In a real implementation, this would fetch the order and check if it can be cancelled
        
        # For this example, just confirm the intent
        context['cancellation_pending'] = True
        context['pending_cancellation_order'] = order_number
        
        return {
            'messages': [
                self.message_builder.text_message(
                    f"Are you sure you want to cancel order #{order_number}? "
                    f"Please reply with 'yes' to confirm or 'no' to keep your order."
                )
            ],
            'context': context
        }
    
    async def handle_track_order_intent(self, intent: ParsedIntent, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle order tracking request"""
        # Extract order identifier from intent or context
        order_id = intent.entities.get('order_id')
        order_number = intent.entities.get('order_number') or context.get('last_order_number')
        
        if not order_id and not order_number:
            return {
                'messages': [
                    self.message_builder.text_message(
                        "Please provide your order number to track your package."
                    )
                ],
                'context': context
            }
        
        # In a real implementation, this would fetch the order with tracking info
        
        # For this example, just provide simulated tracking information
        tracking_message = (
            f"📍 *Tracking for Order #{order_number}*\n\n"
            f"Tracking Number: TRK123456789\n"
            f"Status: In Transit\n"
            f"Estimated Delivery: {(datetime.utcnow().date()).strftime('%d %b %Y')}\n\n"
            f"Current Location: Nairobi Distribution Center\n\n"
            f"Updates:\n"
            f"• Package received - {(datetime.utcnow().replace(hour=8, minute=30)).strftime('%I:%M %p')}\n"
            f"• Out for delivery - {(datetime.utcnow().replace(hour=10, minute=15)).strftime('%I:%M %p')}\n\n"
            f"Your package will arrive today between 2-5 PM."
        )
        
        # Send location with tracking info
        return {
            'messages': [
                self.message_builder.text_message(tracking_message),
                self.message_builder.location_message(-1.2921, 36.8219, "Nairobi Distribution Center")
            ],
            'context': context
        }
    
    async def handle_payment_confirmation_intent(self, intent: ParsedIntent, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle payment confirmation from user"""
        # Extract order and payment info
        order_number = intent.entities.get('order_number') or context.get('last_order_number')
        transaction_id = intent.entities.get('transaction_id')
        payment_method = intent.entities.get('payment_method')
        
        if not order_number:
            return {
                'messages': [
                    self.message_builder.text_message(
                        "Please provide your order number to confirm payment."
                    )
                ],
                'context': context
            }
        
        if not transaction_id:
            return {
                'messages': [
                    self.message_builder.text_message(
                        f"Please provide the transaction ID or reference number for your payment for order #{order_number}."
                    )
                ],
                'context': context
            }
        
        # In a real implementation, this would verify the payment with the payment processor
        
        # For this example, just confirm receipt
        context['payment_confirmed'] = True
        context['payment_transaction_id'] = transaction_id
        
        return {
            'messages': [
                self.message_builder.text_message(
                    f"✅ Thank you! We've received your payment for order #{order_number}.\n\n"
                    f"Transaction ID: {transaction_id}\n\n"
                    f"Your order is now being processed. You'll receive updates as your order progresses."
                )
            ],
            'context': context
        }
    
    async def handle_unknown_intent(self, intent: ParsedIntent, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle unknown order-related intent"""
        return {
            'messages': [
                self.message_builder.text_message(
                    "I'm not sure what you're asking about your order. "
                    "You can check your order status, track your package, "
                    "or cancel your order if needed."
                )
            ],
            'context': context
        }
    
    def create_invalid_response(self, context: Dict[str, Any], message: str) -> Dict[str, Any]:
        """Create response for invalid requests"""
        return {
            'messages': [
                self.message_builder.text_message(message)
            ],
            'context': context
        }
    
    def create_error_response(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Create response for error situations"""
        return {
            'messages': [
                self.message_builder.text_message(
                    "Sorry, I encountered an error processing your order request. "
                    "Please try again later or contact customer support."
                )
            ],
            'context': context
        }
    
    def _extract_address_from_intent(self, intent: ParsedIntent, context: Dict[str, Any]) -> Optional[Address]:
        """Extract shipping address from intent or context"""
        # Try to get from intent entities
        street = intent.entities.get('address_street')
        city = intent.entities.get('address_city')
        state = intent.entities.get('address_state')
        country = intent.entities.get('address_country', 'Kenya')
        
        # If not in intent, try to get from context
        if not street or not city:
            saved_address = context.get('user', {}).get('address', {})
            street = street or saved_address.get('street')
            city = city or saved_address.get('city')
            state = state or saved_address.get('state')
            country = country or saved_address.get('country', 'Kenya')
        
        # If we have the minimum required fields, create address
        if street and city:
            return Address(
                street=street,
                city=city,
                state=state or city,  # Default state to city if not provided
                country=country,
                landmark=intent.entities.get('address_landmark')
            )
        
        return None
    
    def _get_payment_instructions(self, payment_method: PaymentMethod, amount: float, currency: str) -> str:
        """Get payment instructions based on payment method"""
        if payment_method == PaymentMethod.MOBILE_MONEY:
            return (
                "💳 *Payment Instructions*\n\n"
                "Please complete your payment using M-Pesa:\n\n"
                "1. Go to M-Pesa menu\n"
                "2. Select Pay Bill\n"
                "3. Enter Business Number: 123456\n"
                "4. Enter Account Number: Your Order Number\n"
                f"5. Enter Amount: {amount} {currency}\n"
                "6. Enter your PIN and confirm\n\n"
                "Once payment is complete, please send us the M-Pesa confirmation code."
            )
        elif payment_method == PaymentMethod.CASH_ON_DELIVERY:
            return (
                "💵 *Cash on Delivery*\n\n"
                f"Please prepare {amount} {currency} in cash for when your order arrives.\n"
                "Our delivery person will provide a receipt upon payment."
            )
        elif payment_method == PaymentMethod.BANK_TRANSFER:
            return (
                "🏦 *Bank Transfer Instructions*\n\n"
                "Please transfer the payment to our bank account:\n\n"
                "Bank: Example Bank\n"
                "Account Name: Conversational Commerce Ltd\n"
                "Account Number: 1234567890\n"
                "Reference: Your Order Number\n\n"
                f"Amount: {amount} {currency}\n\n"
                "Once transfer is complete, please send us the transaction reference."
            )
        else:
            return (
                "💳 *Payment*\n\n"
                f"Please complete your payment of {amount} {currency}.\n"
                "You can pay using Mobile Money, Bank Transfer, or Cash on Delivery."
            )
    
    def _get_next_steps_for_status(self, status: OrderStatus) -> Optional[str]:
        """Get next steps text based on order status"""
        if status == OrderStatus.PENDING:
            return "Please complete payment to proceed with your order."
        elif status == OrderStatus.PAID:
            return "Your payment has been received. We're preparing your order for shipment."
        elif status == OrderStatus.PROCESSING:
            return "Your order is being prepared. We'll notify you once it ships."
        elif status == OrderStatus.SHIPPED:
            return "Your order is on its way! You can track its progress for updates."
        elif status == OrderStatus.DELIVERED:
            return "Your order has been delivered. Enjoy your purchase!"
        elif status == OrderStatus.CANCELLED:
            return "This order has been cancelled. Contact support if you have any questions."
        
        return None
