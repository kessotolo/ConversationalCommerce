import pytest
from fastapi.testclient import TestClient
from app.main import app
from unittest.mock import patch

client = TestClient(app)

# Test M-Pesa payment initialization (mock Daraja API)


def test_mpesa_initialize_payment():
    with patch(
        "app.services.payment.payment_provider.MpesaProvider._get_access_token",
        return_value="mock_token",
    ), patch("requests.post") as mock_post:
        mock_post.return_value.json.return_value = {
            "CheckoutRequestID": "mock_checkout_id"
        }
        mock_post.return_value.raise_for_status = lambda: None
        payload = {
            "order_id": "order123",
            "provider": "MPESA",
            "amount": {"value": 100, "currency": "KES"},
            "customer_phone": "+254700000000",
            "redirect_url": "https://example.com/callback",
            "customer_email": "test@example.com",
            "customer_name": "Test User",
            "metadata": {},
        }
        response = client.post("/api/v1/payments/initialize", json=payload)
        assert response.status_code == 200
        assert "ussd_code" in response.json()["payment"]["metadata"]


# Test M-Pesa webhook callback (mock request)


def test_mpesa_webhook():
    payload = {"CheckoutRequestID": "mock_checkout_id"}
    response = client.post("/api/v1/payments/webhook/mpesa", json=payload)
    assert response.status_code == 200
    assert response.json()["success"]


# Test payment status mapping for all providers


def test_payment_status_mapping():
    from app.services.payment.payment_service import PaymentService

    service = PaymentService(None)
    assert service.map_provider_status_to_internal("paystack", "success") == "COMPLETED"
    assert (
        service.map_provider_status_to_internal("flutterwave", "successful")
        == "COMPLETED"
    )
    assert service.map_provider_status_to_internal("mpesa", "Success") == "COMPLETED"
    assert service.map_provider_status_to_internal("paystack", "failed") == "FAILED"
    assert service.map_provider_status_to_internal("mpesa", "Pending") == "PENDING"


# Test USSD fallback in payment initialization


def test_mpesa_ussd_fallback():
    with patch(
        "app.services.payment.payment_provider.MpesaProvider._get_access_token",
        return_value="mock_token",
    ), patch("requests.post") as mock_post:
        mock_post.return_value.json.return_value = {
            "CheckoutRequestID": "mock_checkout_id"
        }
        mock_post.return_value.raise_for_status = lambda: None
        payload = {
            "order_id": "order123",
            "provider": "MPESA",
            "amount": {"value": 100, "currency": "KES"},
            "customer_phone": "+254700000000",
            "redirect_url": "https://example.com/callback",
            "customer_email": "test@example.com",
            "customer_name": "Test User",
            "metadata": {},
        }
        response = client.post("/api/v1/payments/initialize", json=payload)
        assert response.status_code == 200
        assert "ussd_code" in response.json()["payment"]["metadata"]


# Test mock Paystack and Flutterwave callbacks (simulate success)


def test_paystack_webhook():
    payload = {"event": "charge.success", "data": {"reference": "mock_ref"}}
    response = client.post("/api/v1/payments/webhook/paystack", json=payload)
    assert response.status_code == 200
    assert response.json()["success"]


def test_flutterwave_webhook():
    payload = {"event": "charge.completed", "data": {"tx_ref": "mock_ref"}}
    response = client.post("/api/v1/payments/webhook/flutterwave", json=payload)
    assert response.status_code == 200
    assert response.json()["success"]


# Test Stripe payment initialization (mock Stripe API)


def test_stripe_initialize_payment():
    with patch("app.services.payment.payment_provider.requests.post") as mock_post:
        mock_post.return_value.json.return_value = {
            "id": "pi_123",
            "client_secret": "secret_abc",
        }
        mock_post.return_value.raise_for_status = lambda: None
        payload = {
            "order_id": "order123",
            "provider": "stripe",
            "amount": {"value": 100, "currency": "USD"},
            "customer_email": "test@example.com",
            "customer_name": "Test User",
            "metadata": {},
        }
        response = client.post("/api/v1/payments/initialize", json=payload)
        assert response.status_code == 200
        assert "client_secret" in response.json()["payment"]["metadata"]


# Test Stripe webhook callback (mock request)


def test_stripe_webhook():
    payload = {"type": "payment_intent.succeeded", "data": {"object": {"id": "pi_123"}}}
    response = client.post("/api/v1/payments/webhook/stripe", json=payload)
    assert response.status_code == 200
    assert response.json()["success"]


# Test Stripe status mapping


def test_stripe_status_mapping():
    from app.services.payment.payment_service import PaymentService

    service = PaymentService(None)
    assert service.map_provider_status_to_internal("stripe", "succeeded") == "COMPLETED"
    assert service.map_provider_status_to_internal("stripe", "canceled") == "FAILED"
    assert service.map_provider_status_to_internal("stripe", "processing") == "PENDING"
