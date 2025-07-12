import json
import hmac
import hashlib
from datetime import datetime
import uuid
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.v1.endpoints.webhooks import router as webhook_router
from backend.app.core.config.settings import get_settings
from backend.app.services.payment.webhook_event_service import WebhookEventService
from backend.app.services.payment.payment_service import PaymentService
from backend.app.db.models.webhook_event import WebhookEvent


@pytest.fixture
def app():
    app = FastAPI()
    app.include_router(webhook_router, prefix="/api/v1/webhooks")
    return app


@pytest.fixture
def client(app):
    return TestClient(app)


@pytest.fixture
def mock_db():
    return AsyncMock(spec=AsyncSession)


@pytest.fixture
def mock_webhook_event_service():
    return MagicMock(spec=WebhookEventService)


@pytest.fixture
def mock_payment_service():
    return MagicMock(spec=PaymentService)


@pytest.fixture
def valid_paystack_payload():
    return {
        "event": "charge.success",
        "data": {
            "id": 12345,
            "reference": "TEST_REFERENCE",
            "amount": 10000,
            "status": "success",
            "customer": {
                "email": "customer@example.com"
            }
        },
        "id": str(uuid.uuid4())
    }


@pytest.fixture
def valid_mpesa_payload():
    return {
        "Body": {
            "stkCallback": {
                "MerchantRequestID": "12345",
                "CheckoutRequestID": str(uuid.uuid4()),
                "ResultCode": 0,
                "ResultDesc": "The service request is processed successfully.",
                "CallbackMetadata": {
                    "Item": [
                        {"Name": "Amount", "Value": 1000.00},
                        {"Name": "MpesaReceiptNumber", "Value": "RECEIPT123"},
                        {"Name": "TransactionDate", "Value": 20250626185430},
                        {"Name": "PhoneNumber", "Value": "254712345678"}
                    ]
                }
            }
        }
    }


def generate_paystack_signature(payload, secret="test_secret"):
    """Generate a valid Paystack signature for testing"""
    return hmac.new(
        secret.encode("utf-8"),
        json.dumps(payload).encode("utf-8"),
        digestmod=hashlib.sha512
    ).hexdigest()


@pytest.mark.asyncio
@patch("app.api.v1.endpoints.webhooks.get_db")
@patch("app.api.v1.endpoints.webhooks.verify_paystack_signature")
@patch("app.services.payment.webhook_event_service.WebhookEventService.is_webhook_processed")
@patch("app.services.payment.webhook_event_service.WebhookEventService.record_webhook_event")
@patch("app.api.v1.endpoints.webhooks.PaymentService")
async def test_paystack_webhook_success(
    mock_payment_service_cls,
    mock_record_webhook_event,
    mock_is_webhook_processed,
    mock_verify_signature,
    mock_get_db,
    client,
    mock_db,
    valid_paystack_payload
):
    # Setup mocks
    mock_get_db.return_value = mock_db
    mock_verify_signature.return_value = True
    mock_is_webhook_processed.return_value = False
    mock_record_webhook_event.return_value = True
    mock_payment_service = mock_payment_service_cls.return_value
    mock_payment_service.process_successful_payment = AsyncMock()
    
    # Create signature
    signature = generate_paystack_signature(valid_paystack_payload)
    
    # Send request
    response = client.post(
        "/api/v1/webhooks/paystack",
        json=valid_paystack_payload,
        headers={"X-Paystack-Signature": signature}
    )
    
    # Assert response
    assert response.status_code == 200
    assert response.json() == {"status": "success", "message": "Webhook processed"}
    
    # Assert mocks called correctly
    mock_verify_signature.assert_called_once()
    mock_is_webhook_processed.assert_called_once_with(
        mock_db, valid_paystack_payload["id"], "paystack"
    )
    mock_payment_service.process_successful_payment.assert_called_once_with(
        mock_db,
        payment_data=valid_paystack_payload["data"],
        provider="paystack",
        event_id=valid_paystack_payload["id"]
    )


@pytest.mark.asyncio
@patch("app.api.v1.endpoints.webhooks.get_db")
@patch("app.api.v1.endpoints.webhooks.verify_paystack_signature")
async def test_paystack_webhook_invalid_signature(
    mock_verify_signature,
    mock_get_db,
    client,
    mock_db,
    valid_paystack_payload
):
    # Setup mocks
    mock_get_db.return_value = mock_db
    mock_verify_signature.return_value = False
    
    # Send request
    response = client.post(
        "/api/v1/webhooks/paystack",
        json=valid_paystack_payload,
        headers={"X-Paystack-Signature": "invalid_signature"}
    )
    
    # Assert response
    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid signature"}


@pytest.mark.asyncio
@patch("app.api.v1.endpoints.webhooks.get_db")
@patch("app.services.payment.webhook_event_service.WebhookEventService.is_webhook_processed")
async def test_paystack_webhook_idempotency(
    mock_is_webhook_processed,
    mock_get_db,
    client,
    mock_db,
    valid_paystack_payload
):
    # Setup mocks
    mock_get_db.return_value = mock_db
    
    # Mock that event was already processed
    mock_is_webhook_processed.return_value = True
    
    # Override verify_paystack_signature for testing
    with patch("app.api.v1.endpoints.webhooks.verify_paystack_signature", return_value=True):
        response = client.post(
            "/api/v1/webhooks/paystack",
            json=valid_paystack_payload,
            headers={"X-Paystack-Signature": "valid_signature"}
        )
    
    # Assert response indicates event was already processed
    assert response.status_code == 200
    assert response.json() == {"status": "skipped", "message": "Event already processed"}


@pytest.mark.asyncio
@patch("app.api.v1.endpoints.webhooks.get_db")
@patch("app.services.payment.webhook_event_service.WebhookEventService.is_webhook_processed")
@patch("app.services.payment.webhook_event_service.WebhookEventService.record_webhook_event")
@patch("app.api.v1.endpoints.webhooks.PaymentService")
async def test_mpesa_webhook_success(
    mock_payment_service_cls,
    mock_record_webhook_event,
    mock_is_webhook_processed,
    mock_get_db,
    client,
    mock_db,
    valid_mpesa_payload
):
    # Setup mocks
    mock_get_db.return_value = mock_db
    mock_is_webhook_processed.return_value = False
    mock_record_webhook_event.return_value = True
    mock_payment_service = mock_payment_service_cls.return_value
    mock_payment_service.process_successful_payment = AsyncMock()
    
    # Disable IP validation for testing
    with patch("app.api.v1.endpoints.webhooks.settings") as mock_settings:
        mock_settings.VALIDATE_WEBHOOK_IPS = False
        
        response = client.post(
            "/api/v1/webhooks/mpesa",
            json=valid_mpesa_payload
        )
    
    # Assert response
    assert response.status_code == 200
    assert response.json() == {"status": "success", "message": "Webhook processed"}
    
    # Assert mocks called correctly
    event_id = valid_mpesa_payload["Body"]["stkCallback"]["CheckoutRequestID"]
    mock_is_webhook_processed.assert_called_once_with(mock_db, event_id, "mpesa")
    mock_payment_service.process_successful_payment.assert_called_once_with(
        mock_db,
        payment_data=valid_mpesa_payload["Body"]["stkCallback"],
        provider="mpesa",
        event_id=event_id
    )
