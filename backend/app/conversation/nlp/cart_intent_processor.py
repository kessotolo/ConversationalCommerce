import logging
import re
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID
from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.orm import selectinload

from app.models.cart import Cart, CartItem
from app.models.product import Product
from app.models.customer import Customer
from app.models.order import Order, OrderStatus, OrderSource
from app.models.order_item import OrderItem
from app.models.order_channel_meta import OrderChannelMeta
from app.models.conversation_history import ChannelType
from app.services.order_creation_service import OrderCreationService
from app.services.order_exceptions import OrderValidationError
from app.core.exceptions import AppError

logger = logging.getLogger(__name__)


class CartIntentProcessor:
    """
    Processor for cart-related intents in conversational interfaces.
    Handles cart creation, updates, item management, and checkout initiation.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def process_cart_intent(
        self,
        message_body: str,
        tenant_id: str,
        customer_number: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Process cart-related intents from conversational flows.

        Args:
            message_body: The customer's message text
            tenant_id: Tenant/seller ID
            customer_number: Customer's phone number
            context: Conversation context

        Returns:
            Response dictionary with messages and updated context
        """
        try:
            # Parse the intent from message
            intent_data = self._parse_cart_intent(message_body)

            if not intent_data:
                return self._create_help_response(context)

            # Get or create customer
            customer = await self._get_or_create_customer(customer_number, tenant_id)

            # Get or create cart
            cart = await self._get_or_create_cart(customer.id, tenant_id, customer_number)

            # Process the specific intent
            intent_type = intent_data.get('intent')

            if intent_type == 'add_to_cart':
                return await self._handle_add_to_cart(cart, intent_data, context)
            elif intent_type == 'remove_from_cart':
                return await self._handle_remove_from_cart(cart, intent_data, context)
            elif intent_type == 'update_cart':
                return await self._handle_update_cart(cart, intent_data, context)
            elif intent_type == 'view_cart':
                return await self._handle_view_cart(cart, context)
            elif intent_type == 'clear_cart':
                return await self._handle_clear_cart(cart, context)
            elif intent_type == 'checkout':
                return await self._handle_checkout(cart, customer, context)
            else:
                return self._create_help_response(context)

        except Exception as e:
            logger.error(f"Error processing cart intent: {str(e)}")
            return self._create_error_response(str(e), context)

    def _parse_cart_intent(self, message_body: str) -> Optional[Dict[str, Any]]:
        """
        Parse cart-related intent from message text.

        Args:
            message_body: The customer's message

        Returns:
            Dictionary containing parsed intent data or None
        """
        message = message_body.lower().strip()

        # Add to cart patterns
        add_patterns = [
            r'add (\d+)?\s*(.+?)\s*to\s*cart',
            r'add\s*(.+?)\s*to\s*cart',
            r'buy\s*(\d+)?\s*(.+)',
            r'order\s*(\d+)?\s*(.+)',
            r'get\s*(\d+)?\s*(.+)',
            r'i\s*want\s*(\d+)?\s*(.+)',
            r'i\s*need\s*(\d+)?\s*(.+)',
            r'(\d+)?\s*(.+?)\s*please'
        ]

        for pattern in add_patterns:
            match = re.search(pattern, message, re.IGNORECASE)
            if match:
                groups = match.groups()
                if len(groups) == 2:
                    quantity_str, product_name = groups
                    quantity = int(
                        quantity_str) if quantity_str and quantity_str.isdigit() else 1
                    product_name = product_name.strip()
                else:
                    quantity = 1
                    product_name = groups[0].strip() if groups else ""

                if product_name:
                    return {
                        'intent': 'add_to_cart',
                        'product_name': product_name,
                        'quantity': quantity
                    }

        # Remove from cart patterns
        remove_patterns = [
            r'remove\s*(.+?)\s*from\s*cart',
            r'delete\s*(.+?)\s*from\s*cart',
            r'take\s*out\s*(.+?)\s*from\s*cart',
            r'cancel\s*(.+?)\s*from\s*cart'
        ]

        for pattern in remove_patterns:
            match = re.search(pattern, message, re.IGNORECASE)
            if match:
                product_name = match.group(1).strip()
                if product_name:
                    return {
                        'intent': 'remove_from_cart',
                        'product_name': product_name
                    }

        # Update cart quantity patterns
        update_patterns = [
            r'change\s*(.+?)\s*to\s*(\d+)',
            r'update\s*(.+?)\s*to\s*(\d+)',
            r'make\s*(.+?)\s*(\d+)',
            r'set\s*(.+?)\s*to\s*(\d+)'
        ]

        for pattern in update_patterns:
            match = re.search(pattern, message, re.IGNORECASE)
            if match:
                product_name = match.group(1).strip()
                quantity = int(match.group(2))
                if product_name:
                    return {
                        'intent': 'update_cart',
                        'product_name': product_name,
                        'quantity': quantity
                    }

        # View cart patterns
        view_patterns = [
            r'show\s*cart',
            r'view\s*cart',
            r'my\s*cart',
            r'what\'?s\s*in\s*my\s*cart',
            r'cart\s*items',
            r'check\s*cart',
            r'cart\s*status'
        ]

        for pattern in view_patterns:
            if re.search(pattern, message, re.IGNORECASE):
                return {'intent': 'view_cart'}

        # Clear cart patterns
        clear_patterns = [
            r'clear\s*cart',
            r'empty\s*cart',
            r'remove\s*all\s*items',
            r'delete\s*everything',
            r'start\s*over'
        ]

        for pattern in clear_patterns:
            if re.search(pattern, message, re.IGNORECASE):
                return {'intent': 'clear_cart'}

        # Checkout patterns
        checkout_patterns = [
            r'checkout',
            r'buy\s*all',
            r'order\s*all',
            r'purchase\s*all',
            r'complete\s*order',
            r'place\s*order',
            r'proceed\s*to\s*payment',
            r'pay\s*now',
            r'i\'m\s*ready\s*to\s*buy',
            r'let\'s\s*finish\s*this'
        ]

        for pattern in checkout_patterns:
            if re.search(pattern, message, re.IGNORECASE):
                return {'intent': 'checkout'}

        return None

    async def _get_or_create_customer(self, phone_number: str, tenant_id: str) -> Customer:
        """Get or create customer record"""
        try:
            # Try to find existing customer
            query = select(Customer).where(
                and_(
                    Customer.phone == phone_number,
                    Customer.tenant_id == UUID(tenant_id)
                )
            )
            result = await self.db.execute(query)
            customer = result.scalar_one_or_none()

            if not customer:
                # Create new customer
                customer = Customer(
                    phone=phone_number,
                    tenant_id=UUID(tenant_id),
                    name=f"Customer {phone_number}",  # Default name
                    created_at=datetime.utcnow()
                )
                self.db.add(customer)
                await self.db.flush()

            return customer

        except Exception as e:
            logger.error(f"Error getting/creating customer: {str(e)}")
            raise AppError(f"Failed to get customer: {str(e)}")

    async def _get_or_create_cart(self, customer_id: UUID, tenant_id: str, phone_number: str) -> Cart:
        """Get or create cart for customer"""
        try:
            # Try to find existing cart
            query = select(Cart).options(
                selectinload(Cart.items)
            ).where(
                and_(
                    Cart.tenant_id == UUID(tenant_id),
                    or_(
                        Cart.user_id == customer_id,
                        Cart.phone_number == phone_number
                    )
                )
            )
            result = await self.db.execute(query)
            cart = result.scalar_one_or_none()

            if not cart:
                # Create new cart
                cart = Cart(
                    user_id=customer_id,
                    phone_number=phone_number,
                    tenant_id=UUID(tenant_id),
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                self.db.add(cart)
                await self.db.flush()

            return cart

        except Exception as e:
            logger.error(f"Error getting/creating cart: {str(e)}")
            raise AppError(f"Failed to get cart: {str(e)}")

    async def _find_product_by_name(self, product_name: str, tenant_id: str) -> Optional[Product]:
        """Find product by name with fuzzy matching"""
        try:
            # Try exact match first
            query = select(Product).where(
                and_(
                    Product.tenant_id == UUID(tenant_id),
                    Product.name.ilike(f"%{product_name}%")
                )
            ).limit(1)

            result = await self.db.execute(query)
            product = result.scalar_one_or_none()

            if product:
                return product

            # Try broader search
            words = product_name.split()
            if len(words) > 1:
                # Search for products containing any of the words
                conditions = []
                for word in words:
                    if len(word) > 2:  # Only search for words longer than 2 characters
                        conditions.append(Product.name.ilike(f"%{word}%"))

                if conditions:
                    query = select(Product).where(
                        and_(
                            Product.tenant_id == UUID(tenant_id),
                            or_(*conditions)
                        )
                    ).limit(1)

                    result = await self.db.execute(query)
                    product = result.scalar_one_or_none()

            return product

        except Exception as e:
            logger.error(f"Error finding product: {str(e)}")
            return None

    async def _handle_add_to_cart(self, cart: Cart, intent_data: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle add to cart intent"""
        try:
            product_name = intent_data.get('product_name', '')
            quantity = intent_data.get('quantity', 1)

            # Find product
            product = await self._find_product_by_name(product_name, str(cart.tenant_id))

            if not product:
                return {
                    'messages': [
                        {
                            'type': 'text',
                            'text': f"Sorry, I couldn't find a product matching '{product_name}'. Could you try a different name or check our product list?"
                        }
                    ],
                    'context': context
                }

            # Check if item already exists in cart
            existing_item = None
            for item in cart.items:
                if item.product_id == product.id:
                    existing_item = item
                    break

            if existing_item:
                # Update existing item
                existing_item.quantity += quantity
                existing_item.updated_at = datetime.utcnow()
            else:
                # Add new item
                cart_item = CartItem(
                    cart_id=cart.id,
                    product_id=product.id,
                    quantity=quantity,
                    price_at_add=product.price,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                self.db.add(cart_item)
                cart.items.append(cart_item)

            cart.updated_at = datetime.utcnow()
            await self.db.commit()

            # Calculate total
            total_amount = sum(
                item.quantity * item.price_at_add for item in cart.items)

            return {
                'messages': [
                    {
                        'type': 'text',
                        'text': f"✅ Added {quantity}x {product.name} to your cart!\n\n"
                        f"💰 Price: KES {product.price:.2f} each\n"
                        f"🛒 Cart total: KES {total_amount:.2f}\n\n"
                        f"Type 'checkout' to place your order or 'view cart' to see all items."
                    }
                ],
                'context': context
            }

        except Exception as e:
            logger.error(f"Error adding to cart: {str(e)}")
            return self._create_error_response("Failed to add item to cart", context)

    async def _handle_remove_from_cart(self, cart: Cart, intent_data: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle remove from cart intent"""
        try:
            product_name = intent_data.get('product_name', '')

            # Find product
            product = await self._find_product_by_name(product_name, str(cart.tenant_id))

            if not product:
                return {
                    'messages': [
                        {
                            'type': 'text',
                            'text': f"Sorry, I couldn't find a product matching '{product_name}' in your cart."
                        }
                    ],
                    'context': context
                }

            # Find and remove item from cart
            item_to_remove = None
            for item in cart.items:
                if item.product_id == product.id:
                    item_to_remove = item
                    break

            if not item_to_remove:
                return {
                    'messages': [
                        {
                            'type': 'text',
                            'text': f"{product.name} is not in your cart."
                        }
                    ],
                    'context': context
                }

            # Remove item
            cart.items.remove(item_to_remove)
            await self.db.delete(item_to_remove)
            cart.updated_at = datetime.utcnow()
            await self.db.commit()

            # Calculate new total
            total_amount = sum(
                item.quantity * item.price_at_add for item in cart.items)

            return {
                'messages': [
                    {
                        'type': 'text',
                        'text': f"✅ Removed {product.name} from your cart.\n\n"
                        f"🛒 Cart total: KES {total_amount:.2f}\n\n"
                        f"Type 'view cart' to see remaining items."
                    }
                ],
                'context': context
            }

        except Exception as e:
            logger.error(f"Error removing from cart: {str(e)}")
            return self._create_error_response("Failed to remove item from cart", context)

    async def _handle_update_cart(self, cart: Cart, intent_data: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle update cart quantity intent"""
        try:
            product_name = intent_data.get('product_name', '')
            new_quantity = intent_data.get('quantity', 1)

            # Find product
            product = await self._find_product_by_name(product_name, str(cart.tenant_id))

            if not product:
                return {
                    'messages': [
                        {
                            'type': 'text',
                            'text': f"Sorry, I couldn't find a product matching '{product_name}' in your cart."
                        }
                    ],
                    'context': context
                }

            # Find item in cart
            cart_item = None
            for item in cart.items:
                if item.product_id == product.id:
                    cart_item = item
                    break

            if not cart_item:
                return {
                    'messages': [
                        {
                            'type': 'text',
                            'text': f"{product.name} is not in your cart. Would you like to add it?"
                        }
                    ],
                    'context': context
                }

            # Update quantity
            if new_quantity <= 0:
                # Remove item if quantity is 0 or negative
                cart.items.remove(cart_item)
                await self.db.delete(cart_item)
                message = f"✅ Removed {product.name} from your cart."
            else:
                cart_item.quantity = new_quantity
                cart_item.updated_at = datetime.utcnow()
                message = f"✅ Updated {product.name} quantity to {new_quantity}."

            cart.updated_at = datetime.utcnow()
            await self.db.commit()

            # Calculate new total
            total_amount = sum(
                item.quantity * item.price_at_add for item in cart.items)

            return {
                'messages': [
                    {
                        'type': 'text',
                        'text': f"{message}\n\n"
                        f"🛒 Cart total: KES {total_amount:.2f}\n\n"
                        f"Type 'view cart' to see all items."
                    }
                ],
                'context': context
            }

        except Exception as e:
            logger.error(f"Error updating cart: {str(e)}")
            return self._create_error_response("Failed to update cart", context)

    async def _handle_view_cart(self, cart: Cart, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle view cart intent"""
        try:
            if not cart.items:
                return {
                    'messages': [
                        {
                            'type': 'text',
                            'text': "🛒 Your cart is empty.\n\n"
                            "Try adding items by saying something like:\n"
                            "• 'Add blue jeans to cart'\n"
                            "• 'I want 2 t-shirts'\n"
                            "• 'Order running shoes'"
                        }
                    ],
                    'context': context
                }

            # Build cart summary
            cart_lines = ["🛒 Your Cart:"]
            total_amount = 0

            for item in cart.items:
                # Get product details
                product_query = select(Product).where(
                    Product.id == item.product_id)
                product_result = await self.db.execute(product_query)
                product = product_result.scalar_one_or_none()

                if product:
                    item_total = item.quantity * item.price_at_add
                    total_amount += item_total
                    cart_lines.append(
                        f"• {item.quantity}x {product.name} - KES {item.price_at_add:.2f} each = KES {item_total:.2f}"
                    )

            cart_lines.append(f"\n💰 Total: KES {total_amount:.2f}")
            cart_lines.append("\n📝 Options:")
            cart_lines.append("• Type 'checkout' to place your order")
            cart_lines.append("• Type 'clear cart' to remove all items")
            cart_lines.append("• Say 'remove [item]' to remove specific items")

            return {
                'messages': [
                    {
                        'type': 'text',
                        'text': '\n'.join(cart_lines)
                    }
                ],
                'context': context
            }

        except Exception as e:
            logger.error(f"Error viewing cart: {str(e)}")
            return self._create_error_response("Failed to view cart", context)

    async def _handle_clear_cart(self, cart: Cart, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle clear cart intent"""
        try:
            if not cart.items:
                return {
                    'messages': [
                        {
                            'type': 'text',
                            'text': "🛒 Your cart is already empty."
                        }
                    ],
                    'context': context
                }

            # Remove all items
            for item in cart.items:
                await self.db.delete(item)

            cart.items.clear()
            cart.updated_at = datetime.utcnow()
            await self.db.commit()

            return {
                'messages': [
                    {
                        'type': 'text',
                        'text': "✅ Your cart has been cleared.\n\n"
                        "Ready to start fresh! Add items by saying something like:\n"
                        "• 'Add blue jeans to cart'\n"
                        "• 'I want 2 t-shirts'"
                    }
                ],
                'context': context
            }

        except Exception as e:
            logger.error(f"Error clearing cart: {str(e)}")
            return self._create_error_response("Failed to clear cart", context)

    async def _handle_checkout(self, cart: Cart, customer: Customer, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle checkout intent"""
        try:
            if not cart.items:
                return {
                    'messages': [
                        {
                            'type': 'text',
                            'text': "🛒 Your cart is empty. Add some items first before checking out!"
                        }
                    ],
                    'context': context
                }

            # Calculate totals
            subtotal = sum(item.quantity *
                           item.price_at_add for item in cart.items)
            tax = subtotal * 0.16  # 16% VAT
            shipping = 500.0  # Fixed shipping cost
            total = subtotal + tax + shipping

            # Create order using OrderCreationService
            order_creation_service = OrderCreationService(self.db)

            # Prepare order items
            order_items = []
            for cart_item in cart.items:
                product_query = select(Product).where(
                    Product.id == cart_item.product_id)
                product_result = await self.db.execute(product_query)
                product = product_result.scalar_one_or_none()

                if product:
                    order_items.append({
                        'product_id': product.id,
                        'quantity': cart_item.quantity,
                        'price': cart_item.price_at_add,
                        'subtotal': cart_item.quantity * cart_item.price_at_add
                    })

            # Create order
            order = await order_creation_service.create_order_internal(
                product_id=order_items[0]['product_id'],  # Primary product
                seller_id=cart.tenant_id,
                buyer_name=customer.name,
                buyer_phone=customer.phone,
                total_amount=total,
                order_source=OrderSource.whatsapp,
                items=order_items,
                channel_data={
                    'channel': 'whatsapp',
                    'conversation_id': context.get('conversation_id'),
                    'message_id': context.get('message_id'),
                    'whatsapp_number': customer.phone
                }
            )

            # Clear cart after successful order creation
            for item in cart.items:
                await self.db.delete(item)
            cart.items.clear()
            cart.updated_at = datetime.utcnow()
            await self.db.commit()

            # Create order summary
            order_lines = [
                f"🎉 Order #{order.id} created successfully!",
                "",
                "📋 Order Summary:",
            ]

            for item_data in order_items:
                product_query = select(Product).where(
                    Product.id == item_data['product_id'])
                product_result = await self.db.execute(product_query)
                product = product_result.scalar_one_or_none()

                if product:
                    order_lines.append(
                        f"• {item_data['quantity']}x {product.name} - KES {item_data['price']:.2f}"
                    )

            order_lines.extend([
                "",
                f"💰 Subtotal: KES {subtotal:.2f}",
                f"🚚 Shipping: KES {shipping:.2f}",
                f"🏷️ Tax (16%): KES {tax:.2f}",
                f"💸 Total: KES {total:.2f}",
                "",
                "📱 Next Steps:",
                "• You'll receive payment instructions shortly",
                "• We'll send order updates to this number",
                "• Expected delivery: 2-3 business days"
            ])

            return {
                'messages': [
                    {
                        'type': 'text',
                        'text': '\n'.join(order_lines)
                    }
                ],
                'context': {
                    **context,
                    'order_id': str(order.id),
                    'checkout_completed': True
                }
            }

        except Exception as e:
            logger.error(f"Error processing checkout: {str(e)}")
            return self._create_error_response("Failed to process checkout", context)

    def _create_help_response(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Create help response for unrecognized intents"""
        return {
            'messages': [
                {
                    'type': 'text',
                    'text': "🛒 Cart Commands:\n\n"
                    "📝 Add items:\n"
                    "• 'Add blue jeans to cart'\n"
                    "• 'I want 2 t-shirts'\n"
                    "• 'Order running shoes'\n\n"
                    "👀 View cart:\n"
                    "• 'View cart' or 'My cart'\n\n"
                    "✏️ Update items:\n"
                    "• 'Remove jeans from cart'\n"
                    "• 'Change t-shirts to 3'\n"
                    "• 'Clear cart'\n\n"
                    "💳 Checkout:\n"
                    "• 'Checkout' or 'Place order'\n\n"
                    "What would you like to do?"
                }
            ],
            'context': context
        }

    def _create_error_response(self, error_message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Create error response"""
        return {
            'messages': [
                {
                    'type': 'text',
                    'text': f"⚠️ Sorry, something went wrong: {error_message}\n\n"
                    "Please try again or contact support if the problem persists."
                }
            ],
            'context': context
        }


# Backwards compatibility function
async def process_cart_intent(
    message_body: str, tenant_id: str, customer_number: str, context: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Backwards compatibility function for the existing cart intent processing.
    """
    # This would need a database session - in a real implementation,
    # this would be injected from the calling context
    # For now, return a response that indicates the new system is available

    processor = CartIntentProcessor(None)  # db session would be injected

    # Parse basic intent
    intent_data = processor._parse_cart_intent(message_body)

    if intent_data:
        return {
            'messages': [
                {
                    'type': 'text',
                    'text': f"🛒 I understood you want to {intent_data['intent']}.\n\n"
                    "The new cart system is now available! "
                    "Please use the full cart functionality through the main conversation handler."
                }
            ],
            'context': context
        }

    return {
        'messages': [
            {
                'type': 'text',
                'text': "🛒 Cart features are now available!\n\n"
                "Try saying:\n"
                "• 'Add [product] to cart'\n"
                "• 'View my cart'\n"
                "• 'Checkout'\n\n"
                "What would you like to do?"
            }
        ],
        'context': context
    }
