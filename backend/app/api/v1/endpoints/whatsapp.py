from fastapi import APIRouter, Depends, HTTPException, Request, Response, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional, List
from datetime import datetime
import json
import hmac
import hashlib
import os
import requests
import logging

from app.db.session import get_db
from app.models.conversation_history import ConversationHistory, SenderType, ChannelType
from app.schemas.conversation_history import ConversationHistoryCreate
from app.schemas.conversation_event import ConversationEventCreate
from app.models.tenant import Tenant
from app.api.routers.conversation import log_conversation_event

# WhatsApp Business API settings
WHATSAPP_API_VERSION = os.getenv("WHATSAPP_API_VERSION", "v16.0")
WHATSAPP_APP_SECRET = os.getenv("WHATSAPP_APP_SECRET")
WHATSAPP_VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN")

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter()


def verify_whatsapp_signature(request_body: bytes, signature_header: str) -> bool:
    """Verify the request signature from Meta/WhatsApp"""
    if not WHATSAPP_APP_SECRET:
        # In development, you might want to bypass this check
        return True

    # Split the signature header
    elements = signature_header.split('=')
    if len(elements) != 2:
        return False

    method, signature = elements
    if method != 'sha256':
        return False

    # Calculate the expected signature
    expected_signature = hmac.new(
        WHATSAPP_APP_SECRET.encode('utf-8'),
        msg=request_body,
        digestmod=hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(signature, expected_signature)


def find_tenant_by_whatsapp(phone_number: str, db: Session) -> Optional[Tenant]:
    """Find tenant with matching WhatsApp number"""
    # Remove any '+' prefix for consistent comparison
    clean_number = phone_number.replace('+', '')

    # Try to find tenant with matching WhatsApp number
    tenant = db.query(Tenant).filter(
        Tenant.whatsapp_number.contains(clean_number)
    ).first()

    return tenant


def get_tenant_by_id(db, tenant_id):
    from app.models.tenant import Tenant
    return db.query(Tenant).filter(Tenant.id == tenant_id).first()


class WhatsAppCredential:
    """Represents credentials for a tenant's WhatsApp integration"""

    def __init__(self, tenant_id: str, whatsapp_number: str, access_token: str = None, phone_number_id: str = None):
        self.tenant_id = tenant_id
        self.whatsapp_number = whatsapp_number
        # If tenant doesn't have their own credentials, use Twilio integration
        self.access_token = access_token
        self.phone_number_id = phone_number_id
        self.use_twilio = (access_token is None) or (phone_number_id is None)


class WhatsAppMessageManager:
    """Manages sending and receiving WhatsApp messages for multiple tenants"""

    def __init__(self):
        self.credentials_cache = {}
        # Default Twilio settings from env variables
        self.twilio_account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        self.twilio_auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        self.twilio_whatsapp_number = os.getenv("TWILIO_WHATSAPP_NUMBER")

    def get_tenant_credentials(self, tenant_id: str, db: Session) -> Optional[WhatsAppCredential]:
        """Get WhatsApp credentials for a tenant from cache or database"""
        # Check cache first
        if tenant_id in self.credentials_cache:
            return self.credentials_cache[tenant_id]

        # Get from database
        tenant = get_tenant_by_id(db, tenant_id)
        if not tenant:
            return None

        # Check if tenant has WhatsApp number
        if not tenant.whatsapp_number:
            return None

        # Check if tenant has own WhatsApp Business API credentials
        # This would be stored in a separate table in a real implementation
        # For now, we'll assume they're using Twilio through the platform

        credential = WhatsAppCredential(
            tenant_id=tenant.id,
            whatsapp_number=tenant.whatsapp_number,
            # In future: get these from tenant-specific settings
            access_token=None,  # tenant.whatsapp_access_token
            phone_number_id=None  # tenant.whatsapp_phone_number_id
        )

        # Cache the credentials
        self.credentials_cache[tenant_id] = credential
        return credential

    def send_whatsapp_reply(self, tenant_id: str, to_number: str, message: str, db: Session) -> bool:
        """Send a WhatsApp reply using tenant's WhatsApp credentials"""
        credentials = self.get_tenant_credentials(tenant_id, db)
        if not credentials:
            logger.error(
                f"No WhatsApp credentials found for tenant {tenant_id}")
            return False

        if credentials.use_twilio:
            return self._send_via_twilio(credentials.whatsapp_number, to_number, message)
        else:
            return self._send_via_graph_api(credentials, to_number, message)

    def _send_via_twilio(self, from_number: str, to_number: str, message: str) -> bool:
        """Send message using Twilio API"""
        try:
            from twilio.rest import Client

            if not (self.twilio_account_sid and self.twilio_auth_token):
                logger.error("Twilio credentials not configured")
                return False

            client = Client(self.twilio_account_sid, self.twilio_auth_token)

            # If tenant has their own WhatsApp number, use it
            # Otherwise fall back to platform WhatsApp number
            from_whatsapp = from_number or self.twilio_whatsapp_number

            if not from_whatsapp:
                logger.error("No WhatsApp number available for sending")
                return False

            # Format the WhatsApp number with the whatsapp: prefix
            twilio_msg = client.messages.create(
                body=message,
                from_=f'whatsapp:{from_whatsapp}',
                to=f'whatsapp:{to_number}'
            )

            logger.info(f"Sent WhatsApp message via Twilio: {twilio_msg.sid}")
            return True
        except Exception as e:
            logger.error(f"Error sending WhatsApp via Twilio: {str(e)}")
            return False

    def _send_via_graph_api(self, credentials: WhatsAppCredential, to_number: str, message: str) -> bool:
        """Send message using Meta Graph API"""
        try:
            url = f"https://graph.facebook.com/{WHATSAPP_API_VERSION}/{credentials.phone_number_id}/messages"

            headers = {
                "Authorization": f"Bearer {credentials.access_token}",
                "Content-Type": "application/json"
            }

            data = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": to_number,
                "type": "text",
                "text": {
                    "body": message
                }
            }

            response = requests.post(url, headers=headers, json=data)
            success = response.status_code == 200

            if success:
                logger.info(
                    f"Sent WhatsApp message via Graph API to {to_number}")
            else:
                logger.error(
                    f"Failed to send WhatsApp via Graph API: {response.text}")

            return success
        except Exception as e:
            logger.error(f"Error sending WhatsApp via Graph API: {str(e)}")
            return False


# Initialize the WhatsApp message manager
whatsapp_manager = WhatsAppMessageManager()


@router.get("/webhook")
async def verify_webhook(
    hub_mode: str = Query(..., alias="hub.mode"),
    hub_challenge: str = Query(..., alias="hub.challenge"),
    hub_verify_token: str = Query(..., alias="hub.verify_token"),
):
    """
    Handle the WhatsApp webhook verification request from Meta
    This is required to verify your webhook URL when setting up the WhatsApp Business API
    """
    verify_token = os.getenv("WHATSAPP_VERIFY_TOKEN")

    if not verify_token:
        raise HTTPException(
            status_code=500, detail="WHATSAPP_VERIFY_TOKEN not configured")

    if hub_verify_token != verify_token:
        raise HTTPException(
            status_code=403, detail="Verification token mismatch")

    if hub_mode == "subscribe":
        return Response(content=hub_challenge)
    else:
        raise HTTPException(status_code=400, detail="Invalid hub mode")


@router.post("/webhook")
async def webhook(request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Handle incoming WhatsApp messages
    Processes messages using the existing NLP cart management functionality
    """
    # Get the raw request body
    body = await request.body()

    # Verify signature if in production
    signature = request.headers.get("X-Hub-Signature-256")
    if signature and not verify_whatsapp_signature(body, signature):
        raise HTTPException(status_code=403, detail="Invalid signature")

    # Parse the JSON body
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    # Process webhook event
    if "object" not in data or data["object"] != "whatsapp_business_account":
        return {"success": True}  # Ignore non-WhatsApp events

    # Process each entry
    responses = []
    for entry in data.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})

            # Check if this is a message
            if "messages" not in value:
                continue

            for message in value.get("messages", []):
                if message.get("type") != "text":
                    continue  # Only process text messages for now

                # Get message details
                customer_number = message.get("from")
                # The business number that received the message
                to_number = message.get("to")
                timestamp = datetime.fromtimestamp(
                    int(message.get("timestamp")))
                message_body = message.get("text", {}).get("body", "")

                # Find associated tenant by WhatsApp number that received the message
                tenant = find_tenant_by_whatsapp(to_number, db)
                if not tenant:
                    # This can happen if a message is sent to a number not registered in the platform
                    logger.warning(
                        f"Received message to unknown WhatsApp number: {to_number}")
                    # No response since we don't know which business this is for
                    continue

                # Create conversation history record
                conversation = ConversationHistory(
                    message=message_body,
                    sender_type=SenderType.CUSTOMER,
                    channel=ChannelType.WHATSAPP,
                    timestamp=timestamp,
                    tenant_id=tenant.id
                )
                db.add(conversation)
                db.commit()
                db.refresh(conversation)

                # Process with NLP by creating a conversation event
                # This leverages your existing NLP cart management code
                event = ConversationEventCreate(
                    conversation_id=conversation.id,
                    event_type="message_sent",
                    tenant_id=tenant.id,
                    payload={
                        "content": message_body,
                        "phone_number": customer_number,
                    },
                    event_metadata={
                        "channel": "whatsapp",
                        "phone_number": customer_number,
                        "business_number": to_number
                    }
                )

                # Use the existing NLP processing function
                result = log_conversation_event(event, db)

                # Send the response back to WhatsApp using the tenant's credentials
                response = result.payload.get(
                    "chat_response", "I received your message.")
                if response:
                    # Send response in background to avoid blocking the webhook
                    background_tasks.add_task(
                        whatsapp_manager.send_whatsapp_reply,
                        tenant.id,
                        customer_number,
                        response,
                        db
                    )
                    responses.append(response)

    return {"success": True, "processed": len(responses)}
