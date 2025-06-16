import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi import Response
import uuid
from app.middleware.subdomain import SubdomainMiddleware, get_tenant_context


class TestSubdomainMiddleware:
    """Test suite for the subdomain middleware."""

    @pytest.mark.asyncio
    async def test_dispatch_excluded_path(self):
        """Test that middleware skips excluded paths."""
        # Setup
        app = AsyncMock()
        middleware = SubdomainMiddleware(app, exclude_paths=["/api/"])

        # Create mock request with excluded path
        request = MagicMock()
        request.url.path = "/api/v1/products"

        # Create mock call_next function
        async def call_next(request):
            return Response()

        # Execute
        response = await middleware.dispatch(request, call_next)

        # Verify that tenant context wasn't set
        assert not hasattr(request.state, "tenant_context")

    @pytest.mark.asyncio
    async def test_dispatch_localhost(self):
        """Test that middleware handles localhost correctly."""
        # Setup
        app = AsyncMock()
        middleware = SubdomainMiddleware(app)

        # Create mock request with localhost
        request = MagicMock()
        request.url.path = "/products"
        request.headers = {"host": "localhost:8000"}

        # Create mock call_next function
        async def call_next(request):
            return Response()

        # Execute
        response = await middleware.dispatch(request, call_next)

        # Verify default tenant context
        assert hasattr(request.state, "tenant_context")
        assert request.state.tenant_context["tenant_id"] is None

    @pytest.mark.asyncio
    @patch("app.middleware.subdomain.SessionLocal")
    async def test_extract_subdomain(self, mock_session_local):
        """Test subdomain extraction."""
        # Setup
        app = AsyncMock()
        middleware = SubdomainMiddleware(app, base_domain="example.com")

        # Test valid subdomain
        result = middleware._extract_subdomain("shop.example.com")
        assert result == "shop"

        # Test base domain without subdomain
        result = middleware._extract_subdomain("example.com")
        assert result is None

        # Test invalid domain
        result = middleware._extract_subdomain("invalid-domain.com")
        assert result is None

    @pytest.mark.asyncio
    @patch("app.middleware.subdomain.SessionLocal")
    @patch("app.middleware.subdomain.redis_cache")
    async def test_get_tenant_by_subdomain(self, mock_redis_cache, mock_session_local):
        """Test tenant lookup by subdomain."""
        # Setup
        app = AsyncMock()
        middleware = SubdomainMiddleware(app)

        # Mock redis cache
        mock_redis_cache.is_available = True
        mock_redis_cache.get.return_value = None
        mock_redis_cache.set.return_value = True

        # Mock database session
        mock_db = MagicMock()
        mock_session_local.return_value = mock_db

        # Mock StorefrontConfig and Tenant
        tenant_id = uuid.uuid4()
        mock_tenant = MagicMock()
        mock_tenant.name = "Test Tenant"

        mock_config = MagicMock()
        mock_config.tenant_id = tenant_id
        mock_config.subdomain = "shop"
        mock_config.tenant = mock_tenant
        mock_config.theme = "default"

        # Set up query mock
        mock_query = MagicMock()
        mock_db.query.return_value = mock_query
        mock_query.join.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = mock_config

        # Execute
        result = await middleware._get_tenant_by_subdomain("shop")

        # Verify
        assert result["tenant_id"] == str(tenant_id)
        assert result["subdomain"] == "shop"
        assert result["is_active"] is True
        assert result["theme"] == "default"
        mock_db.close.assert_called_once()

    @pytest.mark.asyncio
    @patch("app.middleware.subdomain.SessionLocal")
    @patch("app.middleware.subdomain.redis_cache")
    async def test_get_tenant_by_custom_domain(
        self, mock_redis_cache, mock_session_local
    ):
        """Test tenant lookup by custom domain."""
        # Setup
        app = AsyncMock()
        middleware = SubdomainMiddleware(app)

        # Mock redis cache
        mock_redis_cache.is_available = True
        mock_redis_cache.get.return_value = None
        mock_redis_cache.set.return_value = True

        # Mock database session
        mock_db = MagicMock()
        mock_session_local.return_value = mock_db

        # Mock StorefrontConfig and Tenant
        tenant_id = uuid.uuid4()
        mock_tenant = MagicMock()
        mock_tenant.name = "Test Tenant"

        mock_config = MagicMock()
        mock_config.tenant_id = tenant_id
        mock_config.subdomain = "shop"
        mock_config.custom_domain = "shop.example.com"
        mock_config.tenant = mock_tenant
        mock_config.theme = "default"

        # Set up query mock
        mock_query = MagicMock()
        mock_db.query.return_value = mock_query
        mock_query.join.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = mock_config

        # Execute
        result = await middleware._get_tenant_by_custom_domain("shop.example.com")

        # Verify
        assert result["tenant_id"] == str(tenant_id)
        assert result["subdomain"] == "shop"
        assert result["custom_domain"] == "shop.example.com"
        assert result["is_active"] is True
        assert result["theme"] == "default"
        mock_db.close.assert_called_once()

    def test_get_tenant_context(self):
        """Test the get_tenant_context helper function."""
        # Setup
        request = MagicMock()
        tenant_context = {
            "tenant_id": str(uuid.uuid4()),
            "subdomain": "shop",
            "is_active": True,
        }
        request.state.tenant_context = tenant_context

        # Execute
        result = get_tenant_context(request)

        # Verify
        assert result == tenant_context

        # Test with no tenant context
        request = MagicMock()
        # Explicitly set tenant_context to an empty dict, not a MagicMock
        request.state.tenant_context = {}
        result = get_tenant_context(request)
        assert isinstance(result, dict)
        assert len(result) == 0
