from sqlalchemy.orm import Session

from app.app.models.alert_config import AlertConfig
from app.app.models.conversation_event import ConversationEvent
from app.app.models.tenant import Tenant
from app.app.services.whatsapp_alert_service import send_whatsapp_alert


def maybe_trigger_alert(db: Session, event: ConversationEvent) -> None:
    configs = (
        db.query(AlertConfig)
        .filter_by(tenant_id=event.tenant_id, event_type=event.event_type, enabled=True)
        .all()
    )
    for config in configs:
        # WhatsApp alerting
        seller = db.query(Tenant).filter_by(id=event.tenant_id).first()
        if seller and seller.whatsapp_number:
            msg = f"[ALERT] {event.event_type} for tenant {event.tenant_id}\nDetails: {event.payload}"
            send_whatsapp_alert(seller.whatsapp_number, msg)
        print(
            f"[ALERT] Tenant {event.tenant_id}: {event.event_type} triggered an alert!"
        )
        # FUTURE: Integrate with notification channels (email, SMS, WhatsApp). See issue #124 for tracking.
