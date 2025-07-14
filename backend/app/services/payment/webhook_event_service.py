import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.db.models.webhook_event import WebhookEvent
from app.core.logging import logger


class WebhookEventService:
    """Service for tracking and managing webhook events to ensure idempotency"""

    async def is_webhook_processed(
        self, 
        db: AsyncSession, 
        event_id: str, 
        provider: str
    ) -> bool:
        """
        Check if a webhook event has already been processed
        
        Args:
            db: Database session
            event_id: Unique ID of the event from the provider
            provider: Name of the payment provider (paystack, mpesa, etc.)
            
        Returns:
            True if the event has already been processed, False otherwise
        """
        query = select(WebhookEvent).where(
            WebhookEvent.event_id == event_id,
            WebhookEvent.provider == provider
        )
        
        result = await db.execute(query)
        event = result.scalars().first()
        
        return event is not None
    
    async def record_webhook_event(
        self, 
        db: AsyncSession, 
        event_id: str, 
        provider: str, 
        event_type: str, 
        payload: dict = None
    ) -> bool:
        """
        Record a processed webhook event to ensure it's not processed again
        
        Args:
            db: Database session
            event_id: Unique ID of the event from the provider
            provider: Name of the payment provider (paystack, mpesa, etc.)
            event_type: Type of the event (charge.success, etc.)
            payload: Optional JSON payload of the event
            
        Returns:
            True if recording was successful, False otherwise
        """
        try:
            webhook_event = WebhookEvent(
                provider=provider,
                event_id=event_id,
                event_type=event_type,
                payload=json.dumps(payload) if payload else None
            )
            
            db.add(webhook_event)
            await db.commit()
            return True
            
        except IntegrityError:
            # If the event already exists (unique constraint violation)
            await db.rollback()
            logger.warning(f"Webhook event already exists: {provider}:{event_id}")
            return False
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Error recording webhook event: {str(e)}")
            return False
