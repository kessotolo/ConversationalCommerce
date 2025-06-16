from enum import Enum
from typing import Optional

from pydantic import BaseModel


class IntentType(str, Enum):
    ORDER = "order"
    CANCEL = "cancel"
    HELP = "help"
    UNKNOWN = "unknown"
    CHECKOUT = "checkout"
    ORDER_STATUS = "order_status"
    CANCEL_ORDER = "cancel_order"
    TRACK_ORDER = "track_order"
    PAYMENT_CONFIRMATION = "payment_confirmation"


class ParsedIntent(BaseModel):
    intent: IntentType
    confidence: float
    message: str
    entity: Optional[str] = None


def parse_intent(message: str) -> ParsedIntent:
    """A simple rule-based intent parser. Replace with ML model as needed."""
    msg = message.lower()
    if any(word in msg for word in ["order", "buy", "purchase"]):
        return ParsedIntent(intent=IntentType.ORDER, confidence=0.9, message=message)
    elif any(word in msg for word in ["cancel", "stop", "abort"]):
        return ParsedIntent(intent=IntentType.CANCEL, confidence=0.9, message=message)
    elif any(word in msg for word in ["help", "support", "assist"]):
        return ParsedIntent(intent=IntentType.HELP, confidence=0.9, message=message)
    else:
        return ParsedIntent(intent=IntentType.UNKNOWN, confidence=0.5, message=message)
