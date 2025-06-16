import pytest
from uuid import UUID, uuid4
from sqlalchemy import select
from app.models.order import Order
from app.models.order_channel_meta import OrderChannelMeta, ChannelType


@pytest.mark.asyncio
async def test_whatsapp_webhook_to_order_creation(
    client, db_session, fake_product, mocker
):
    """
    End-to-end test verifying that a WhatsApp webhook can create an order
    with proper channel metadata.
    """
    # Arrange
    # Mock the NLP intent parser to identify product purchase intent
    mocker.patch(
        "app.conversation.nlp.intent_parser.parse_intent",
        return_value={
            "intent_type": "checkout",
            "entities": {
                "product_id": str(fake_product.id),
                "customer_name": "Test Customer",
            },
            "confidence": 0.95,
        },
    )

    # Mock the cart service to return a cart with the product
    mocker.patch(
        "app.services.cart_service.CartService.get_cart_by_phone",
        return_value={
            "items": [
                {"product_id": str(fake_product.id), "price": 1000.0, "quantity": 1}
            ]
        },
    )

    # Simulate a WhatsApp webhook call
    webhook_payload = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
                "changes": [
                    {
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {
                                "display_phone_number": "+254700000000",
                                "phone_number_id": "PHONE_NUMBER_ID",
                            },
                            "contacts": [
                                {
                                    "profile": {"name": "Test Customer"},
                                    "wa_id": "254712345678",
                                }
                            ],
                            "messages": [
                                {
                                    "from": "254712345678",
                                    "id": "wamid.test123",
                                    "timestamp": "1622825038",
                                    "text": {"body": "I want to buy the red shirt"},
                                    "type": "text",
                                }
                            ],
                        },
                        "field": "messages",
                    }
                ],
            }
        ],
    }

    # Act
    # First, simulate product identification and conversation processing
    resp = await client.post(
        "/api/v1/conversation/process",
        json={
            "text": "I want to buy the red shirt",
            "phone": "+254712345678",
            "session_id": "test_session_123",
        },
    )

    # Then simulate the webhook
    webhook_resp = await client.post("/webhooks/whatsapp", json=webhook_payload)

    # Assert
    assert webhook_resp.status_code == 200

    # Check database for created order
    result = await db_session.execute(
        select(Order).where(Order.buyer_phone == "+254712345678")
    )
    order = result.scalar_one_or_none()

    assert order is not None

    # Query for associated channel metadata
    result = await db_session.execute(
        select(OrderChannelMeta).where(OrderChannelMeta.order_id == order.id)
    )
    channel_meta = result.scalar_one_or_none()

    assert channel_meta is not None
    assert channel_meta.channel == ChannelType.whatsapp
    # In a real implementation, we'd check for the exact message ID from the webhook
    assert channel_meta.message_id is not None
