"""
Service: Conversation Event to Audit Log Bridge

This service transforms relevant conversation events into audit log entries for compliance, monitoring, and alerting.
Follows all Enwhe.io backend standards (type safety, extensibility, modularity).
"""

from typing import Set

from sqlalchemy.orm import Session

from app.models.conversation_event import ConversationEvent
from app.services.audit_service import create_audit_log

# Define which event types should be audit-logged (extensible)
AUDIT_EVENT_TYPES: Set[str] = {
    "conversation_started",
    "user_joined",
    "user_left",
    "conversation_closed",
    "product_clicked",
    "order_placed",
}


def log_event_to_audit(db: Session, event: ConversationEvent) -> None:
    """
    Transform a ConversationEvent into an AuditLog entry if it matches configured types.
    Args:
        db: SQLAlchemy session
        event: ConversationEvent instance (already persisted)
    """
    if event.event_type in AUDIT_EVENT_TYPES:
        create_audit_log(
            db=db,
            user_id=event.user_id,
            action=event.event_type,
            resource_type="conversation",
            resource_id=event.conversation_id or "unknown",
            details=event.payload,
            request=None,  # Optionally pass request for IP/user agent
        )
