import pytest
from uuid import UUID, uuid4
from sqlalchemy import select
from app.conversation.handlers.order_handler import OrderIntentHandler
from app.conversation.nlp.intent_parser import ParsedIntent, IntentType
from app.models.order import Order
from app.models.order_channel_meta import OrderChannelMeta, ChannelType


@pytest.mark.asyncio
async def test_checkout_intent_creates_proper_channel_metadata(
    db_session, mocker, fake_product, fake_cart
):
    """Test that the checkout intent handler properly creates order with channel metadata."""
    # Arrange
    tenant_id = str(uuid4())
    handler = OrderIntentHandler(tenant_id=tenant_id, db=db_session)

    # Mock product service to return our fake product
    mocker.patch(
        "app.services.product_service.ProductService.get_product",
        return_value=fake_product,
    )

    # Mock cart service to return cart with our product
    mocker.patch(
        "app.services.cart_service.CartService.get_cart_by_phone",
        return_value=fake_cart,
    )

    intent = ParsedIntent(
        intent_type=IntentType.CHECKOUT,
        raw_text="I want to checkout my cart",
        entities={
            "customer_name": "John Doe",
        },
        confidence=0.95,
    )

    context = {
        "phone_number": "+254712345678",
        "user": {"name": "John Doe", "phone": "+254712345678"},
        "whatsapp_metadata": {
            "message_id": "wamid.test123",
            "conversation_id": "conv456",
        },
    }

    # Act
    response = await handler.handle_checkout_intent(intent, context)

    # Assert
    assert response is not None
    assert "messages" in response

    # Check if context was updated with order ID
    assert "last_order_id" in context
    order_id = UUID(context.get("last_order_id"))

    # Verify order was created
    result = await db_session.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    assert order is not None
    assert order.buyer_phone == "+254712345678"

    # Verify channel metadata
    result = await db_session.execute(
        select(OrderChannelMeta).where(OrderChannelMeta.order_id == order_id)
    )
    channel_meta = result.scalar_one_or_none()

    assert channel_meta is not None
    assert channel_meta.channel == ChannelType.whatsapp
    assert channel_meta.message_id == "wamid.test123"
    assert channel_meta.chat_session_id == "conv456"
