import logging
import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from app.conversation.message_builder import MessageBuilder
from app.conversation.nlp.intent_parser import IntentType, ParsedIntent
from app.domain.events.event_bus import get_event_bus
from app.domain.events.order_events import OrderEventFactory
from app.domain.models.order import Address, OrderSource, OrderStatus, PaymentMethod
from app.services.cart_service import get_cart_service
from app.services.order_service import OrderService
from app.utils.retry import with_retry

logger = logging.getLogger(__name__)


class OrderIntentHandler:
    """
    Handler for order-related intents from conversational channels.
    Integrates with the existing WhatsApp NLP pipeline.

    Optimized for African market with offline resilience and graceful fallbacks.
    """

    def __init__(self, tenant_id: str, user_id: Optional[str] = None, db=None):
        self.tenant_id = tenant_id
        self.user_id = user_id
        self.db = db  # Should be an AsyncSession
        self.cart_service = get_cart_service()
        self.event_bus = get_event_bus()
        self.message_builder = MessageBuilder()

    async def handle_intent(
        self, intent: ParsedIntent, context: Dict[str, Any]
    ) -> Dict[str, Any]:
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
                handler, retry_count=3, exceptions=(Exception,), args=(intent, context)
            )
        except Exception as e:
            logger.error(
                f"Error handling intent {intent_type}: {str(e)}", exc_info=True
            )
            return self.create_error_response(context)

    async def handle_checkout_intent(
        self, intent: ParsedIntent, context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Handle checkout intent from conversational interfaces
        """
        user_phone = context.get("phone_number") or context.get(
            "user", {}).get("phone")
        if not user_phone:
            return self.create_invalid_response(
                context,
                "I couldn't find your contact information. Please provide your phone number.",
            )
        cart_result = await with_retry(
            self.cart_service.get_cart_by_phone,
            retry_count=3,
            args=(user_phone, self.tenant_id),
        )
        if (
            not cart_result
            or not cart_result.get("items")
            or len(cart_result.get("items", [])) == 0
        ):
            return self.create_invalid_response(
                context,
                "Your cart is empty. Add some products first before checking out.",
            )
        customer_name = intent.entities.get("customer_name") or context.get(
            "user", {}
        ).get("name")
        if not customer_name:
            context["awaiting_customer_name"] = True
            return {
                "messages": [
                    self.message_builder.text_message(
                        "Please provide your full name to complete the checkout."
                    )
                ],
                "context": context,
            }
        shipping_address = self._extract_address_from_intent(intent, context)
        if not shipping_address:
            context["awaiting_address"] = True
            return {
                "messages": [
                    self.message_builder.text_message(
                        "Please provide your delivery address to complete the checkout."
                    )
                ],
                "context": context,
            }
        cart_items = cart_result.get("items", [])
        payment_method = intent.entities.get("payment_method")
        if payment_method:
            try:
                payment_method = PaymentMethod(payment_method.upper())
            except ValueError:
                payment_method = PaymentMethod.MOBILE_MONEY
        else:
            payment_method = PaymentMethod.MOBILE_MONEY
        service = OrderService(self.db)
        order = await service.create_order(
            product_id=cart_items[0].get("product_id"),
            seller_id=uuid.UUID(self.tenant_id),
            buyer_name=customer_name,
            buyer_phone=user_phone,
            items=cart_items,
            order_source=OrderSource.WHATSAPP,
            buyer_email=context.get("user", {}).get("email"),
            buyer_address=str(shipping_address),
            notes=intent.entities.get("notes"),
            channel_data={"whatsapp_number": user_phone},
        )
        order_number = getattr(order, "order_number", str(order.id))
        event = OrderEventFactory.create_order_created_event(order)
        await self.event_bus.publish(event)
        await self.cart_service.clear_cart(user_phone, self.tenant_id)
        response_messages = []
        response_messages.append(
            self.message_builder.text_message(
                f"🛒 Order #{order_number} created successfully!\n\n"
                f"Total: {order.total_amount} KES\n"
                f"Items: {len(cart_items)}\n"
                f"Delivery: {shipping_address.city}, {shipping_address.street}"
            )
        )
        payment_instructions = self._get_payment_instructions(
            payment_method, order.total_amount, "KES"
        )
        response_messages.append(
            self.message_builder.text_message(payment_instructions)
        )
        context["last_order_id"] = str(order.id)
        context["last_order_number"] = order_number
        return {"messages": response_messages, "context": context}

    async def handle_order_status_intent(
        self, intent: ParsedIntent, context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle order status inquiry"""
        order_id = intent.entities.get("order_id")
        order_number = intent.entities.get("order_number") or context.get(
            "last_order_number"
        )
        service = OrderService(self.db)
        order = None
        if order_id:
            order = await service.get_order(
                order_id=uuid.UUID(order_id), seller_id=uuid.UUID(self.tenant_id)
            )
        if not order and order_number:
            order = await service.get_order_by_number(
                order_number=order_number, seller_id=uuid.UUID(self.tenant_id)
            )
        if not order:
            return {
                "messages": [
                    self.message_builder.text_message(
                        "Order not found. Please provide a valid order number or ID to check the status."
                    )
                ],
                "context": context,
            }
        timeline_text = ""
        if hasattr(order, "timeline") and order.timeline:
            timeline_text = "\n".join(
                [
                    f"• {event.get('status')}: {datetime.fromisoformat(event.get('timestamp')).strftime('%I:%M %p')}"
                    for event in order.timeline
                ]
            )
        status_message = (
            f"📦 *Order #{getattr(order, 'order_number', order.id)} Status*\n\n"
            f"Current Status: *{order.status}*\n\n"
            f"Timeline:\n{timeline_text}\n\n"
            f"Total: {getattr(order, 'total_amount', 0)}"
        )
        next_steps = self._get_next_steps_for_status(order.status)
        if next_steps:
            status_message += f"\n\nNext Steps:\n{next_steps}"
        return {
            "messages": [self.message_builder.text_message(status_message)],
            "context": context,
        }

    async def handle_cancel_order_intent(
        self, intent: ParsedIntent, context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle order cancellation request"""
        order_id = intent.entities.get("order_id")
        order_number = intent.entities.get("order_number") or context.get(
            "last_order_number"
        )
        service = OrderService(self.db)
        order = None
        if order_id:
            order = await service.get_order(
                order_id=uuid.UUID(order_id), seller_id=uuid.UUID(self.tenant_id)
            )
        if not order and order_number:
            order = await service.get_order_by_number(
                order_number=order_number, seller_id=uuid.UUID(self.tenant_id)
            )
        if not order:
            return {
                "messages": [
                    self.message_builder.text_message(
                        "Order not found. Please provide a valid order number or ID to cancel."
                    )
                ],
                "context": context,
            }
        if hasattr(order, "status") and order.status in [
            OrderStatus.PENDING,
            OrderStatus.PAID,
        ]:
            await service.update_order_status(
                order_id=order.id,
                seller_id=uuid.UUID(self.tenant_id),
                status=OrderStatus.CANCELLED,
            )
            return {
                "messages": [
                    self.message_builder.text_message(
                        f"Order #{getattr(order, 'order_number', order.id)} has been cancelled."
                    )
                ],
                "context": context,
            }
        else:
            return {
                "messages": [
                    self.message_builder.text_message(
                        f"Order #{getattr(order, 'order_number', order.id)} cannot be cancelled at its current status."
                    )
                ],
                "context": context,
            }

    async def handle_track_order_intent(
        self, intent: ParsedIntent, context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle order tracking request"""
        order_id = intent.entities.get("order_id")
        order_number = intent.entities.get("order_number") or context.get(
            "last_order_number"
        )
        service = OrderService(self.db)
        order = None
        if order_id:
            order = await service.get_order(
                order_id=uuid.UUID(order_id), seller_id=uuid.UUID(self.tenant_id)
            )
        if not order and order_number:
            order = await service.get_order_by_number(
                order_number=order_number, seller_id=uuid.UUID(self.tenant_id)
            )
        if not order:
            return {
                "messages": [
                    self.message_builder.text_message(
                        "Order not found. Please provide a valid order number or ID to track."
                    )
                ],
                "context": context,
            }
        tracking_message = (
            f"📍 *Tracking for Order #{getattr(order, 'order_number', order.id)}*\n\n"
            f"Tracking Number: {getattr(order, 'tracking_number', 'N/A')}\n"
            f"Status: {getattr(order, 'status', 'N/A')}\n"
            f"Estimated Delivery: {getattr(order, 'estimated_delivery', 'N/A')}\n\n"
            f"Current Location: {getattr(order, 'current_location', 'N/A')}\n\n"
        )
        return {
            "messages": [self.message_builder.text_message(tracking_message)],
            "context": context,
        }

    async def handle_payment_confirmation_intent(
        self, intent: ParsedIntent, context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle payment confirmation from user"""
        # Extract order and payment info
        order_number = intent.entities.get("order_number") or context.get(
            "last_order_number"
        )
        transaction_id = intent.entities.get("transaction_id")
        payment_method = intent.entities.get("payment_method")

        if not order_number:
            return {
                "messages": [
                    self.message_builder.text_message(
                        "Please provide your order number to confirm payment."
                    )
                ],
                "context": context,
            }

        if not transaction_id:
            return {
                "messages": [
                    self.message_builder.text_message(
                        f"Please provide the transaction ID or reference number for your payment for order #{order_number}."
                    )
                ],
                "context": context,
            }

        # In a real implementation, this would verify the payment with the payment processor

        # For this example, just confirm receipt
        context["payment_confirmed"] = True
        context["payment_transaction_id"] = transaction_id

        return {
            "messages": [
                self.message_builder.text_message(
                    f"✅ Thank you! We've received your payment for order #{order_number}.\n\n"
                    f"Transaction ID: {transaction_id}\n\n"
                    f"Your order is now being processed. You'll receive updates as your order progresses."
                )
            ],
            "context": context,
        }

    async def handle_unknown_intent(
        self, intent: ParsedIntent, context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle unknown order-related intent"""
        return {
            "messages": [
                self.message_builder.text_message(
                    "I'm not sure what you're asking about your order. "
                    "You can check your order status, track your package, "
                    "or cancel your order if needed."
                )
            ],
            "context": context,
        }

    def create_invalid_response(
        self, context: Dict[str, Any], message: str
    ) -> Dict[str, Any]:
        """Create response for invalid requests"""
        return {
            "messages": [self.message_builder.text_message(message)],
            "context": context,
        }

    def create_error_response(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Create response for error situations"""
        return {
            "messages": [
                self.message_builder.text_message(
                    "Sorry, I encountered an error processing your order request. "
                    "Please try again later or contact customer support."
                )
            ],
            "context": context,
        }

    def _extract_address_from_intent(
        self, intent: ParsedIntent, context: Dict[str, Any]
    ) -> Optional[Address]:
        """Extract shipping address from intent or context"""
        # Try to get from intent entities
        street = intent.entities.get("address_street")
        city = intent.entities.get("address_city")
        state = intent.entities.get("address_state")
        country = intent.entities.get("address_country", "Kenya")

        # If not in intent, try to get from context
        if not street or not city:
            saved_address = context.get("user", {}).get("address", {})
            street = street or saved_address.get("street")
            city = city or saved_address.get("city")
            state = state or saved_address.get("state")
            country = country or saved_address.get("country", "Kenya")

        # If we have the minimum required fields, create address
        if street and city:
            return Address(
                street=street,
                city=city,
                state=state or city,  # Default state to city if not provided
                country=country,
                landmark=intent.entities.get("address_landmark"),
            )

        return None

    def _get_payment_instructions(
        self, payment_method: PaymentMethod, amount: float, currency: str
    ) -> str:
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
