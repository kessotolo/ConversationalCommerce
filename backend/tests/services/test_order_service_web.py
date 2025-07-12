import pytest
from uuid import UUID, uuid4
from sqlalchemy import select
from backend.app.schemas.order import OrderCreate
from backend.app.models.order import OrderSource, Order
from backend.app.models.order_channel_meta import OrderChannelMeta, ChannelType
from backend.app.services.order_service import OrderService


@pytest.mark.asyncio
async def test_web_order_creation_channel_metadata(db_session, fake_product):
    """Test that web orders correctly create associated channel metadata."""
    # Arrange
    order_service = OrderService(db_session)
    product_id = fake_product.id
    seller_id = fake_product.seller_id

    order_in = OrderCreate(
        product_id=product_id,
        buyer_name="Web Customer",
        buyer_phone="+254712345678",
        buyer_email="customer@example.com",  # Required for web orders
        quantity=1,
        total_amount=1000.0,
        order_source=OrderSource.website,
    )

    # Act
    order = await order_service.create_order(order_in, seller_id)

    # Assert
    assert order is not None
    assert order.order_source == OrderSource.website

    # Verify channel metadata was created
    result = await db_session.execute(
        select(OrderChannelMeta).where(OrderChannelMeta.order_id == order.id)
    )
    channel_meta = result.scalar_one_or_none()

    assert channel_meta is not None
    assert channel_meta.channel == ChannelType.storefront
    assert channel_meta.order_id == order.id
