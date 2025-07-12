import asyncio
import logging
from typing import Awaitable, Callable, Dict, List, Optional, TypeVar

from backend.app.domain.events.order_events import DomainEvent

logger = logging.getLogger(__name__)

# Type definitions for event handlers
T = TypeVar("T", bound=DomainEvent)
EventHandler = Callable[[T], Awaitable[None]]


class EventBus:
    """
    Event bus for publishing and subscribing to domain events
    Implements the observer pattern to decouple publishers and subscribers
    """

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(EventBus, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        self._handlers: Dict[str, List[EventHandler]] = {}
        self._event_history: List[DomainEvent] = []
        self._max_history_size = 1000  # Limit to prevent memory issues

    async def publish(self, event: DomainEvent) -> None:
        """
        Publish an event to all subscribers
        Executes handlers asynchronously
        """
        event_type = event.event_type

        # Store in event history (with size limit)
        self._event_history.append(event)
        if len(self._event_history) > self._max_history_size:
            self._event_history = self._event_history[-self._max_history_size :]

        # Log the event
        logger.info(
            f"Event published: {event_type} - {event.event_id} - tenant: {event.tenant_id}"
        )

        if event_type not in self._handlers:
            logger.debug(f"No handlers registered for event type: {event_type}")
            return

        # Execute all handlers concurrently
        handlers = self._handlers[event_type]
        tasks = [self._execute_handler(handler, event) for handler in handlers]

        if tasks:
            await asyncio.gather(*tasks)

    async def _execute_handler(self, handler: EventHandler, event: DomainEvent) -> None:
        """Execute a single event handler with error handling"""
        try:
            await handler(event)
        except Exception as e:
            logger.error(
                f"Error in event handler for {event.event_type}: {str(e)}",
                exc_info=True,
            )

    def subscribe(self, event_type: str, handler: EventHandler) -> Callable[[], None]:
        """
        Subscribe a handler to a specific event type
        Returns an unsubscribe function
        """
        if event_type not in self._handlers:
            self._handlers[event_type] = []

        self._handlers[event_type].append(handler)
        logger.debug(f"Handler subscribed to event type: {event_type}")

        # Return unsubscribe function
        def unsubscribe():
            if event_type in self._handlers and handler in self._handlers[event_type]:
                self._handlers[event_type].remove(handler)
                logger.debug(f"Handler unsubscribed from event type: {event_type}")

        return unsubscribe

    def subscribe_to_all(self, handler: EventHandler) -> Callable[[], None]:
        """
        Subscribe to all event types
        Returns a function to unsubscribe from all
        """
        unsubscribe_functions = []
        for event_type in set(self._handlers.keys()):
            unsubscribe = self.subscribe(event_type, handler)
            unsubscribe_functions.append(unsubscribe)

        # Return combined unsubscribe function
        def unsubscribe_all():
            for unsubscribe in unsubscribe_functions:
                unsubscribe()

        return unsubscribe_all

    def get_recent_events(
        self, limit: int = 100, event_type: Optional[str] = None
    ) -> List[DomainEvent]:
        """
        Get recent events from history, optionally filtered by event type
        Useful for debugging and admin panels
        """
        if event_type:
            filtered_events = [
                e for e in self._event_history if e.event_type == event_type
            ]
            return filtered_events[-limit:]

        return self._event_history[-limit:]

    def clear_handlers(self) -> None:
        """Clear all event handlers (mainly for testing)"""
        self._handlers = {}
        logger.debug("All event handlers cleared")


# Singleton instance
_event_bus = None


def get_event_bus() -> EventBus:
    """Get the singleton event bus instance"""
    global _event_bus
    if _event_bus is None:
        _event_bus = EventBus()
    return _event_bus
