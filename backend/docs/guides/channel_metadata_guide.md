# Channel Metadata Model Guide

## Overview

The Channel Metadata Model in the Conversational Commerce platform allows for flexible storage and handling of channel-specific data (WhatsApp, Instagram, TikTok, etc.) while maintaining a clean core data model. This guide explains how the model works, how to use it with existing channels, and how to extend it for new conversation channels.

## Architecture

The channel metadata architecture follows these principles:

1. **Clean Core Model**: Core entities (Order, Customer) remain channel-agnostic
2. **Channel-Specific Extensions**: Channel data stored in related models
3. **Polymorphic Design**: Common interface across different channel types
4. **Type Safety**: Strong typing for channel-specific attributes
5. **Easy Extension**: Simple pattern for adding new channels

## Core Components

### Base Channel Model

The `ChannelMetadata` base model provides common fields:

```python
class ChannelMetadata(Base):
    __tablename__ = "channel_metadata"
    __table_args__ = {"schema": "commerce"}

    id = Column(Integer, primary_key=True)
    channel_type = Column(String, nullable=False)  # whatsapp, instagram, etc.
    entity_type = Column(String, nullable=False)   # order, customer, etc.
    entity_id = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Polymorphic identity column
    __mapper_args__ = {
        "polymorphic_on": channel_type
    }
```

### Channel-Specific Models

Each channel has its own model that inherits from the base:

```python
class WhatsAppOrderMetadata(ChannelMetadata):
    __tablename__ = "whatsapp_order_metadata"
    __table_args__ = {"schema": "commerce"}

    id = Column(Integer, ForeignKey("commerce.channel_metadata.id"), primary_key=True)
    wa_message_id = Column(String)
    wa_phone = Column(String)
    wa_business_account_id = Column(String)
    wa_conversation_id = Column(String)
    wa_context = Column(JSONB)

    __mapper_args__ = {
        "polymorphic_identity": "whatsapp"
    }
```

## Using Channel Metadata

### Creating Order with Channel Metadata

```python
async def create_order_with_channel_metadata(db: AsyncSession, order_data: OrderCreate, channel_data: dict):
    """Create an order with associated channel metadata."""

    # Create the order
    order_service = OrderService(db)
    order = await order_service.create_order(order_data)

    # Determine channel type
    channel_type = channel_data.get("channel_type")

    if channel_type == "whatsapp":
        # Create WhatsApp metadata
        whatsapp_metadata = WhatsAppOrderMetadata(
            entity_type="order",
            entity_id=order.id,
            wa_message_id=channel_data.get("message_id"),
            wa_phone=channel_data.get("phone"),
            wa_business_account_id=channel_data.get("business_account_id"),
            wa_conversation_id=channel_data.get("conversation_id"),
            wa_context=channel_data.get("context", {})
        )
        db.add(whatsapp_metadata)
        await db.commit()
    elif channel_type == "instagram":
        # Create Instagram metadata
        instagram_metadata = InstagramOrderMetadata(
            entity_type="order",
            entity_id=order.id,
            ig_user_id=channel_data.get("user_id"),
            ig_thread_id=channel_data.get("thread_id"),
            ig_message_id=channel_data.get("message_id")
        )
        db.add(instagram_metadata)
        await db.commit()

    return order
```

### Retrieving Channel Metadata

```python
async def get_order_channel_metadata(db: AsyncSession, order_id: int, channel_type: str):
    """Get channel-specific metadata for an order."""

    if channel_type == "whatsapp":
        query = select(WhatsAppOrderMetadata).where(
            WhatsAppOrderMetadata.entity_type == "order",
            WhatsAppOrderMetadata.entity_id == order_id
        )
        result = await db.execute(query)
        metadata = result.scalars().first()
        return metadata
    elif channel_type == "instagram":
        query = select(InstagramOrderMetadata).where(
            InstagramOrderMetadata.entity_type == "order",
            InstagramOrderMetadata.entity_id == order_id
        )
        result = await db.execute(query)
        metadata = result.scalars().first()
        return metadata

    return None
```

### Generic Metadata Query

For querying without knowing the specific channel type:

```python
async def get_any_channel_metadata(db: AsyncSession, entity_type: str, entity_id: int):
    """Get any channel metadata for an entity."""

    query = select(ChannelMetadata).where(
        ChannelMetadata.entity_type == entity_type,
        ChannelMetadata.entity_id == entity_id
    )
    result = await db.execute(query)
    metadata = result.scalars().first()
    return metadata
```

## Extending for New Channels

### Adding a New Channel Model

To support a new channel (e.g., TikTok), follow these steps:

1. Create a new model:

```python
class TikTokOrderMetadata(ChannelMetadata):
    __tablename__ = "tiktok_order_metadata"
    __table_args__ = {"schema": "commerce"}

    id = Column(Integer, ForeignKey("commerce.channel_metadata.id"), primary_key=True)
    tt_user_id = Column(String)
    tt_video_id = Column(String, nullable=True)
    tt_comment_id = Column(String, nullable=True)
    tt_message_id = Column(String, nullable=True)
    tt_shop_id = Column(String)
    tt_context = Column(JSONB)

    __mapper_args__ = {
        "polymorphic_identity": "tiktok"
    }
```

2. Create a database migration:

```bash
alembic revision --autogenerate -m "Add TikTok order metadata model"
```

3. Update the metadata service:

```python
async def create_tiktok_order_metadata(
    db: AsyncSession,
    order_id: int,
    tt_user_id: str,
    tt_shop_id: str,
    tt_message_id: Optional[str] = None,
    tt_video_id: Optional[str] = None,
    tt_comment_id: Optional[str] = None,
    tt_context: Optional[dict] = None
):
    """Create TikTok metadata for an order."""

    metadata = TikTokOrderMetadata(
        entity_type="order",
        entity_id=order_id,
        tt_user_id=tt_user_id,
        tt_shop_id=tt_shop_id,
        tt_message_id=tt_message_id,
        tt_video_id=tt_video_id,
        tt_comment_id=tt_comment_id,
        tt_context=tt_context or {}
    )
    db.add(metadata)
    await db.commit()
    await db.refresh(metadata)
    return metadata
```

### Channel Factory Pattern

Consider implementing a factory pattern for channel metadata creation:

```python
class ChannelMetadataFactory:
    @staticmethod
    async def create_metadata(
        db: AsyncSession,
        channel_type: str,
        entity_type: str,
        entity_id: int,
        metadata: dict
    ):
        """Create channel-specific metadata."""

        if channel_type == "whatsapp":
            return await ChannelMetadataFactory._create_whatsapp_metadata(
                db, entity_type, entity_id, metadata
            )
        elif channel_type == "instagram":
            return await ChannelMetadataFactory._create_instagram_metadata(
                db, entity_type, entity_id, metadata
            )
        elif channel_type == "tiktok":
            return await ChannelMetadataFactory._create_tiktok_metadata(
                db, entity_type, entity_id, metadata
            )
        else:
            raise ValueError(f"Unsupported channel type: {channel_type}")

    @staticmethod
    async def _create_whatsapp_metadata(
        db: AsyncSession,
        entity_type: str,
        entity_id: int,
        metadata: dict
    ):
        whatsapp_metadata = WhatsAppOrderMetadata(
            entity_type=entity_type,
            entity_id=entity_id,
            wa_message_id=metadata.get("message_id"),
            wa_phone=metadata.get("phone"),
            wa_business_account_id=metadata.get("business_account_id"),
            wa_conversation_id=metadata.get("conversation_id"),
            wa_context=metadata.get("context", {})
        )
        db.add(whatsapp_metadata)
        await db.commit()
        await db.refresh(whatsapp_metadata)
        return whatsapp_metadata

    # Other channel creation methods...
```

## Using Channel Metadata in Services

### In Order Service

```python
async def create_order_from_channel(
    self,
    order_data: OrderCreate,
    channel_type: str,
    channel_metadata: dict
):
    """Create an order from a specific channel with metadata."""

    # Create the order
    order = await self.create_order(order_data)

    # Add channel metadata
    await ChannelMetadataFactory.create_metadata(
        self.db,
        channel_type=channel_type,
        entity_type="order",
        entity_id=order.id,
        metadata=channel_metadata
    )

    return order
```

### In Customer Service

```python
async def create_customer_from_channel(
    self,
    customer_data: CustomerCreate,
    channel_type: str,
    channel_metadata: dict
):
    """Create a customer from a specific channel with metadata."""

    # Create the customer
    customer = await self.create_customer(customer_data)

    # Add channel metadata
    await ChannelMetadataFactory.create_metadata(
        self.db,
        channel_type=channel_type,
        entity_type="customer",
        entity_id=customer.id,
        metadata=channel_metadata
    )

    return customer
```

## Best Practices

1. **Keep Core Models Clean**: Don't add channel-specific fields to core models
2. **Strong Typing**: Use specific models for each channel type
3. **Consistent Naming**: Use prefixes for each channel (wa*, ig*, tt\_)
4. **Channel Factory**: Use factory methods for metadata creation
5. **Service Integration**: Add channel-aware methods to services
6. **Migration Planning**: Create database migrations for each new channel

## Testing Channel Metadata

### Unit Tests

```python
async def test_create_whatsapp_order_metadata():
    async with AsyncSession(engine) as session:
        # Create order
        order = await create_test_order(session)

        # Create WhatsApp metadata
        metadata = WhatsAppOrderMetadata(
            entity_type="order",
            entity_id=order.id,
            wa_message_id="test-message-id",
            wa_phone="+254712345678",
            wa_business_account_id="12345",
            wa_conversation_id="conv-123",
            wa_context={"flow_id": "checkout-flow"}
        )
        session.add(metadata)
        await session.commit()

        # Retrieve and verify
        query = select(WhatsAppOrderMetadata).where(
            WhatsAppOrderMetadata.entity_id == order.id
        )
        result = await session.execute(query)
        retrieved = result.scalars().first()

        assert retrieved is not None
        assert retrieved.wa_phone == "+254712345678"
        assert retrieved.wa_message_id == "test-message-id"
```

### Factory Test

```python
async def test_channel_metadata_factory():
    async with AsyncSession(engine) as session:
        # Create order
        order = await create_test_order(session)

        # Use factory to create metadata
        await ChannelMetadataFactory.create_metadata(
            session,
            channel_type="whatsapp",
            entity_type="order",
            entity_id=order.id,
            metadata={
                "message_id": "factory-message-id",
                "phone": "+254712345678",
                "business_account_id": "12345",
                "conversation_id": "conv-123",
                "context": {"factory_test": True}
            }
        )

        # Verify creation
        query = select(WhatsAppOrderMetadata).where(
            WhatsAppOrderMetadata.entity_id == order.id
        )
        result = await session.execute(query)
        metadata = result.scalars().first()

        assert metadata is not None
        assert metadata.wa_message_id == "factory-message-id"
        assert metadata.wa_context["factory_test"] is True
```
