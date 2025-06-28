"""
Mocking-related fixtures for tests.
"""
import logging
import sys
from unittest.mock import MagicMock, patch

import pytest

# Setup logging
logger = logging.getLogger(__name__)

# Apply patches to avoid heavy model loading during tests
@pytest.fixture(scope="session", autouse=True)
def patch_content_analysis():
    """
    Patch the content analysis service to avoid loading heavy ML models during tests.
    This significantly speeds up test execution.
    """
    logger.info("Applying content analysis patches for tests")
    
    # Mock content_analysis_service global object
    with patch("app.core.content.content_analysis.content_analysis_service") as mock_service:
        # Configure the mock service
        mock_service.analyze_content.return_value = MagicMock(
            status="APPROVED",
            flagged=False,
            rejected=False,
            rule_matches=[],
            content_id="test-content-id",
            content_type="test-content-type",
            field="text",
            tenant_id="test-tenant-id"
        )
        
        # Mock analyze_content_async function
        with patch("app.core.content.content_analysis.analyze_content_async") as mock_async:
            mock_async.return_value = MagicMock(
                status="APPROVED",
                flagged=False,
                rejected=False,
                rule_matches=[],
                content_id="test-content-id",
                content_type="test-content-type",
                field="text",
                tenant_id="test-tenant-id"
            )
            
            logger.info("Content analysis patches applied successfully")
            yield
            logger.info("Content analysis patches removed")


@pytest.fixture(scope="function")
def mock_s3_client():
    """
    Mock the AWS S3 client for testing file uploads without hitting 
    actual AWS services.
    """
    with patch("boto3.client") as mock_boto3_client:
        mock_client = MagicMock()
        
        # Configure S3 client methods
        mock_client.upload_fileobj.return_value = None
        mock_client.generate_presigned_url.return_value = "https://example.com/presigned-url"
        
        mock_boto3_client.return_value = mock_client
        yield mock_client


@pytest.fixture(scope="function")
def mock_payment_client():
    """
    Mock the payment provider clients (Paystack and M-Pesa) for testing 
    payment operations without hitting actual payment APIs.
    """
    with patch("app.services.payment.PaystackClient") as mock_paystack:
        with patch("app.services.payment.MPesaClient") as mock_mpesa:
            # Configure Paystack mock
            mock_paystack_instance = MagicMock()
            mock_paystack_instance.initialize_transaction.return_value = {
                "status": True, 
                "data": {
                    "authorization_url": "https://checkout.paystack.com/test-transaction",
                    "access_code": "test-access-code",
                    "reference": "test-reference",
                }
            }
            mock_paystack_instance.verify_transaction.return_value = {
                "status": True,
                "data": {
                    "status": "success",
                    "amount": 10000,
                    "currency": "NGN",
                    "transaction_date": "2025-06-27T08:00:00Z",
                    "reference": "test-reference",
                }
            }
            mock_paystack.return_value = mock_paystack_instance
            
            # Configure M-Pesa mock
            mock_mpesa_instance = MagicMock()
            mock_mpesa_instance.stk_push.return_value = {
                "ResponseCode": "0",
                "ResponseDescription": "Success. Request accepted for processing",
                "CheckoutRequestID": "test-checkout-id",
            }
            mock_mpesa_instance.query_transaction.return_value = {
                "ResponseCode": "0",
                "ResponseDescription": "The service request is processed successfully.",
                "ResultCode": "0",
                "ResultDesc": "The service request is processed successfully.",
            }
            mock_mpesa.return_value = mock_mpesa_instance
            
            yield {
                "paystack": mock_paystack_instance,
                "mpesa": mock_mpesa_instance,
            }


@pytest.fixture(scope="function")
def mock_sms_client():
    """
    Mock the Twilio SMS client for testing SMS operations without 
    hitting actual Twilio API.
    """
    with patch("app.services.notifications.TwilioClient") as mock_twilio:
        mock_instance = MagicMock()
        mock_instance.send_sms.return_value = {
            "sid": "test-message-sid",
            "status": "queued",
        }
        mock_twilio.return_value = mock_instance
        yield mock_instance
