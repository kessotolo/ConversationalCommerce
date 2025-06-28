# Event System & Hooks Guide

## Overview

The Conversational Commerce platform uses an event-driven architecture to enable loose coupling between components, scalability, and extensibility. This document explains how the event system works, how to create new events and handlers, and best practices for working with the event system.

## Architecture

The event system consists of:

1. **Events**: Domain objects representing something that happened
2. **Event Bus**: Central component that distributes events to registered handlers
3. **Event Handlers**: Components that react to specific events
4. **Event Factory**: Creates standardized event objects

```
┌────────────┐     ┌───────────┐     ┌─────────────────┐
│            │     │           │     │ NotificationHandler
│ OrderService├────►Event Bus  ├────►│ InventoryHandler │
│            │     │           │     │ AnalyticsHandler │
└────────────┘     └───────────┘     └─────────────────┘
```

## Event Types

### Core Event Classes

```python
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, Optional


@dataclass
class Event:
    """Base class for all events"""
    event_id: str
    event_type: str
    timestamp: datetime
    data: Dict[str, Any]


@dataclass
class OrderEvent(Event):
    """Base class for order-related events"""
    order_id: str
    tenant_id: int
    customer_id: Optional[int] = None
```

### Available Order Events

The system currently supports these order events:

| Event Class               | Description                    | When Emitted               |
| ------------------------- | ------------------------------ | -------------------------- |
| `OrderCreatedEvent`       | New order created              | After order creation       |
| `OrderStatusChangedEvent` | Order status updated           | After any status change    |
| `OrderPaidEvent`          | Order payment received         | When status → PAID         |
| `OrderCancelledEvent`     | Order cancelled                | When status → CANCELLED    |
| `OrderShippedEvent`       | Order shipped                  | When status → SHIPPED      |
| `OrderDeliveredEvent`     | Order delivered                | When status → DELIVERED    |
| `OrderReturnedEvent`      | Order returned                 | When status → RETURNED     |
| `OrderRefundedEvent`      | Order refunded                 | When status → REFUNDED     |
| `PaymentProcessedEvent`   | Payment processed successfully | After payment verification |

## Event Bus

The Event Bus is implemented as a singleton that maintains a registry of event handlers:

```python
from app.domain.events.event_bus import get_event_bus

# Get the global event bus instance
event_bus = get_event_bus()
```

## Creating Events

Use the OrderEventFactory to create standardized events:

```python
from app.domain.events.order_events import OrderEventFactory

# Create a status changed event
event = OrderEventFactory.create_status_changed_event(
    order,
    old_status=old_status,
    new_status=new_status
)

# Create a payment processed event
event = OrderEventFactory.create_payment_processed_event(order, payment)
```

## Publishing Events

Events are published to the event bus:

```python
import asyncio
from app.domain.events.event_bus import get_event_bus

# Publish event asynchronously
asyncio.create_task(get_event_bus().publish(event))

# Or within an async function
await get_event_bus().publish(event)
```

## Creating Event Handlers

Event handlers implement the `EventHandler` interface and register for specific event types:

```python
from app.domain.events.event_handler import EventHandler
from app.domain.events.event_bus import get_event_bus

class OrderNotificationHandler(EventHandler):
    """Handler for sending notifications on order events"""

    async def handle(self, event):
        if event.event_type == "order.status_changed":
            # Send notification based on new status
            await self._send_status_notification(event)
        elif event.event_type == "order.created":
            # Send order confirmation
            await self._send_order_confirmation(event)

    async def _send_status_notification(self, event):
        # Implementation details...
        pass

    async def _send_order_confirmation(self, event):
        # Implementation details...
        pass
```

## Registering Event Handlers

Handlers must be registered with the event bus:

```python
# In app startup code
from app.domain.events.event_bus import get_event_bus
from app.domain.events.order_event_handlers import (
    OrderNotificationHandler,
    InventoryHandler,
    AnalyticsHandler
)

def setup_event_handlers():
    event_bus = get_event_bus()

    # Register handlers
    event_bus.register_handler("order.created", OrderNotificationHandler())
    event_bus.register_handler("order.status_changed", OrderNotificationHandler())
    event_bus.register_handler("order.status_changed", InventoryHandler())
    event_bus.register_handler("order.created", AnalyticsHandler())
    event_bus.register_handler("order.status_changed", AnalyticsHandler())
```

## Best Practices

### Event Design

1. **Event Immutability**: Events should be immutable once created
2. **Rich Event Data**: Include all information handlers might need
3. **Standardized Structure**: Use consistent naming and structure
4. **Event Versioning**: Consider including version in event data

### Handler Design

1. **Single Responsibility**: Each handler should do one thing well
2. **Fault Isolation**: Errors in one handler shouldn't affect others
3. **Idempotency**: Handlers should be idempotent (safe to execute multiple times)
4. **Async Implementation**: Use async/await for all handler methods
5. **Error Handling**: Catch and log errors, don't let exceptions propagate to the event bus

### Performance Considerations

1. **Fire-and-Forget**: Use `asyncio.create_task()` for non-critical handlers
2. **Timeout Handling**: Implement timeouts for external service calls
3. **Backpressure**: Consider rate limiting or batching for high-volume events

## Debugging Event Flows

1. **Event Logging**: All events are logged automatically
2. **Handler Tracing**: Enable debug logging to trace event handling
3. **Monitoring**: Use Prometheus metrics to monitor event processing

## Common Use Cases

### Adding New Event Types

1. Create a new event class in `app/domain/events/order_events.py`
2. Add a factory method in `OrderEventFactory`
3. Emit the event where appropriate
4. Create handlers that subscribe to the new event type

### Creating a Notification Handler

```python
class WhatsAppNotificationHandler(EventHandler):
    """Handler for sending WhatsApp notifications"""

    async def handle(self, event):
        if event.event_type == "order.status_changed":
            # Extract customer phone from event data
            customer_phone = event.data.get("customer", {}).get("phone")
            new_status = event.data.get("new_status")

            if customer_phone and new_status:
                template = self._get_template_for_status(new_status)
                await self._send_whatsapp_notification(
                    phone=customer_phone,
                    template=template,
                    params={
                        "order_id": event.order_id,
                        "status": new_status
                    }
                )
```

### Creating an Analytics Handler

```python
class OrderAnalyticsHandler(EventHandler):
    """Handler for logging analytics events"""

    async def handle(self, event):
        # Extract relevant data
        event_data = {
            "timestamp": event.timestamp.isoformat(),
            "event_type": event.event_type,
            "order_id": event.order_id,
            "tenant_id": event.tenant_id
        }

        # Add event-specific data
        if event.event_type == "order.status_changed":
            event_data.update({
                "old_status": event.data.get("old_status"),
                "new_status": event.data.get("new_status")
            })

        # Log to analytics service
        await self._log_analytics_event(event_data)
```

## Troubleshooting

### Common Issues

1. **Events Not Being Processed**: Check handler registration
2. **Handler Exceptions**: Check error logs for handler failures
3. **Missing Event Data**: Make sure events include all necessary data
4. **Performance Issues**: Consider async batch processing for high-volume events

### Monitoring Event Processing

All event processing is monitored with Prometheus metrics:

- `events_published_total`: Counter of events published by type
- `event_processing_duration_seconds`: Histogram of event processing time
- `event_handler_errors_total`: Counter of handler errors by type
