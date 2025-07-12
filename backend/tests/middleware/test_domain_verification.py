import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi import Response
import uuid
import socket
from backend.app.middleware.domain_verification import (
    DomainVerificationMiddleware,
    DomainVerificationService,
    SSL_STATUS_VALID,
    SSL_STATUS_UNKNOWN,
)


class TestDomainVerificationMiddleware:
    """Test suite for the domain verification middleware."""

    @pytest.mark.asyncio
    async def test_dispatch_excluded_path(self):
        """Test that middleware skips excluded paths."""
        # Setup
        app = AsyncMock()
        middleware = DomainVerificationMiddleware(app, exclude_paths=["/api/"])

        # Create mock request with excluded path
        request = MagicMock()
        request.url.path = "/api/v1/products"

        # Create mock call_next function
        async def call_next(request):
            return Response()

        # Execute
        response = await middleware.dispatch(request, call_next)

        # Verify app was called without verification
        assert isinstance(response, Response)
        app.assert_not_called()

    @pytest.mark.asyncio
    async def test_dispatch_localhost(self):
        """Test that middleware skips localhost requests."""
        # Setup
        app = AsyncMock()
        middleware = DomainVerificationMiddleware(app)

        # Create mock request with localhost
        request = MagicMock()
        request.url.path = "/storefront"
        request.headers = {"host": "localhost:8000"}

        # Create mock call_next function
        async def call_next(request):
            return Response()

        # Execute
        response = await middleware.dispatch(request, call_next)

        # Verify app was called without verification
        assert isinstance(response, Response)
        app.assert_not_called()

    @pytest.mark.asyncio
    @patch.object(DomainVerificationMiddleware, "_verify_domain_if_needed")
    async def test_dispatch_custom_domain(self, mock_verify):
        """Test that middleware verifies custom domains."""
        # Setup
        app = AsyncMock()
        middleware = DomainVerificationMiddleware(app)

        # Create mock request with custom domain
        request = MagicMock()
        request.url.path = "/products"
        request.headers = {"host": "shop.example.com"}
        request.state.tenant_context = {
            "tenant_id": str(uuid.uuid4()),
            "custom_domain": "shop.example.com",
        }

        # Create mock call_next function
        async def call_next(request):
            return Response()

        # Execute
        response = await middleware.dispatch(request, call_next)

        # Verify domain verification was triggered
        mock_verify.assert_called_once_with(
            "shop.example.com", request.state.tenant_context["tenant_id"]
        )

    @pytest.mark.asyncio
    @patch("app.middleware.domain_verification.verify_domain_dns")
    async def test_verify_dns(self, mock_verify_dns):
        """Test DNS verification."""
        # Setup
        middleware = DomainVerificationMiddleware(AsyncMock())
        mock_verify_dns.return_value = (True, None)

        # Execute
        result, error = await middleware._verify_dns("example.com", "tenant-123")

        # Verify
        assert result is True
        assert error is None
        mock_verify_dns.assert_called_once()

    @pytest.mark.asyncio
    @patch("socket.create_connection")
    @patch("ssl.create_default_context")
    async def test_verify_ssl_valid(self, mock_create_context, mock_create_connection):
        """Test valid SSL verification."""
        # Setup
        middleware = DomainVerificationMiddleware(AsyncMock())

        # Mock socket and SSL context
        mock_sock = MagicMock()
        mock_ssock = MagicMock()
        mock_create_connection.return_value.__enter__.return_value = mock_sock
        mock_context = MagicMock()
        mock_create_context.return_value = mock_context
        mock_context.wrap_socket.return_value.__enter__.return_value = mock_ssock

        # Mock certificate with future expiration
        import datetime

        future_date = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(
            days=30
        )
        mock_ssock.getpeercert.return_value = {
            "notAfter": future_date.strftime("%b %d %H:%M:%S %Y %Z")
        }

        # Execute
        status, error = await middleware._verify_ssl("example.com")

        # Verify
        assert status == SSL_STATUS_VALID
        assert error is None
        mock_create_connection.assert_called_once_with(("example.com", 443))
        mock_context.wrap_socket.assert_called_once()

    @pytest.mark.asyncio
    @patch("socket.create_connection")
    async def test_verify_ssl_connection_error(self, mock_create_connection):
        """Test SSL verification with connection error."""
        # Setup
        middleware = DomainVerificationMiddleware(AsyncMock())
        mock_create_connection.side_effect = socket.error("Connection refused")

        # Execute
        status, error = await middleware._verify_ssl("example.com")

        # Verify
        assert status == SSL_STATUS_UNKNOWN
        assert "Connection error" in error
        mock_create_connection.assert_called_once()


class TestDomainVerificationService:
    """Test suite for the domain verification service."""

    @pytest.mark.asyncio
    @patch("asyncio.create_task")
    async def test_start(self, mock_create_task):
        """Test starting the verification service."""
        # Setup
        service = DomainVerificationService()

        # Execute
        await service.start()

        # Verify
        assert service._running is True
        mock_create_task.assert_called_once()

    @pytest.mark.asyncio
    @patch("asyncio.sleep", return_value=None)
    async def test_stop(self, mock_sleep):
        """Test stopping the verification service."""
        # Setup
        service = DomainVerificationService()
        service._running = True
        service._task = AsyncMock()
        service._task.cancel = MagicMock()

        # Execute
        await service.stop()

        # Verify
        assert service._running is False
        service._task.cancel.assert_called_once()

    @pytest.mark.asyncio
    @patch("app.middleware.domain_verification.SessionLocal")
    @patch.object(DomainVerificationService, "_verify_dns")
    @patch.object(DomainVerificationService, "_verify_ssl")
    async def test_verify_all_domains(
        self, mock_verify_ssl, mock_verify_dns, mock_session_local
    ):
        """Test verifying all domains."""
        # Setup
        service = DomainVerificationService()
        service._running = True

        # Mock database session
        mock_db = MagicMock()
        mock_session_local.return_value = mock_db

        # Mock StorefrontConfig query
        mock_config1 = MagicMock()
        mock_config1.custom_domain = "shop1.example.com"
        mock_config1.tenant_id = uuid.uuid4()

        mock_config2 = MagicMock()
        mock_config2.custom_domain = "shop2.example.com"
        mock_config2.tenant_id = uuid.uuid4()

        mock_db.query.return_value.filter.return_value.all.return_value = [
            mock_config1,
            mock_config2,
        ]

        # Mock verification results
        mock_verify_dns.return_value = (True, None)
        mock_verify_ssl.return_value = (SSL_STATUS_VALID, None)

        # Execute
        await service._verify_all_domains()

        # Verify
        assert mock_verify_dns.call_count == 2
        assert mock_verify_ssl.call_count == 2
        mock_db.close.assert_called_once()
