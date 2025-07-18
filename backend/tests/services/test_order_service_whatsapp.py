import pytest
from uuid import UUID, uuid4
from sqlalchemy import select
from backend.app.schemas.order import ModernOrderCreate
from backend.app.models.order import OrderSource, Order
from backend.app.models.order_channel_meta import OrderChannelMeta, ChannelType
from backend.app.services.order_service import OrderService


@pytest.mark.asyncio
async def test_whatsapp_order_creation_channel_metadata(db_session, fake_product):
    """Test that WhatsApp orders correctly create associated channel metadata with WhatsApp details."""
    # Arrange
    order_service = OrderService(db_session)
    product_id = fake_product.id
    seller_id = fake_product.seller_id

    order_in = ModernOrderCreate(
        product_id=product_id,
        buyer_name="WhatsApp Customer",
        buyer_phone="+254712345678",
        quantity=1,
        total_amount=1000.0,
        order_source=OrderSource.whatsapp,
        shipping={
            "address": {
                "street": "123 Test St",
                "city": "Nairobi",
                "state": "Nairobi",
                "country": "Kenya"
            },
            "method": "Standard",
            "shipping_cost": {"amount": 500, "currency": "KES"}
        },
        channel_metadata={
            "whatsapp_number": "+254712345678",
            "message_id": "test_message_123",
            "conversation_id": "test_conv_456"
        }
    )

    # Act
    order = await order_service.create_whatsapp_order(order_in, seller_id)

    # Assert
    assert order is not None
    assert order.order_source == OrderSource.whatsapp

    # Verify channel metadata was created
    result = await db_session.execute(
        select(OrderChannelMeta).where(OrderChannelMeta.order_id == order.id)
    )
    channel_meta = result.scalar_one_or_none()

    assert channel_meta is not None
    assert channel_meta.channel == ChannelType.whatsapp
    assert channel_meta.message_id == "test_message_123"
    assert channel_meta.chat_session_id == "test_conv_456"
