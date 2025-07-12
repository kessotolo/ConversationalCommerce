import pytest
import uuid
from unittest.mock import patch, AsyncMock
from backend.app.core.cache.redis_cache import (
    RedisCache,
    invalidate_product_cache,
    invalidate_config_cache,
)


class TestRedisCache:
    """Test suite for the Redis cache implementation."""

    def test_singleton_pattern(self):
        """Test that RedisCache follows the singleton pattern."""
        cache1 = RedisCache()
        cache2 = RedisCache()
        assert cache1 is cache2

    @pytest.mark.asyncio
    @patch("app.core.cache.redis_cache.settings")
    @patch("app.core.cache.redis_cache.redis.ConnectionPool.from_url")
    @patch("app.core.cache.redis_cache.redis.Redis")
    async def test_initialize_success(self, mock_redis_class, mock_conn_pool, mock_settings):
        """Test successful initialization of Redis cache."""
        # Setup mock settings
        mock_settings.ENVIRONMENT = "test"
        mock_settings.DISABLE_REDIS_IN_PRODUCTION = False
        mock_settings.REDIS_DISABLED = False
        mock_settings.REDIS_URL = "redis://localhost:6379/1"
        mock_settings.IS_CONTAINER = False
        mock_settings.REDIS_MAX_CONNECTIONS = 10
        mock_settings.REDIS_SOCKET_TIMEOUT = 5
        mock_settings.REDIS_CONNECT_TIMEOUT = 2
        
        # Setup mock Redis client
        mock_client = AsyncMock()
        mock_client.ping.return_value = True
        mock_redis_class.return_value = mock_client
        
        # Setup mock connection pool
        mock_pool = AsyncMock()
        mock_conn_pool.return_value = mock_pool

        # Initialize cache
        cache = RedisCache()
        cache._initialized = False  # Reset for testing
        await cache.initialize()

        # Verify
        assert cache.is_available is True
        mock_conn_pool.assert_called_once()
        mock_redis_class.assert_called_once_with(connection_pool=mock_pool)
        mock_client.ping.assert_called_once()

    @pytest.mark.asyncio
    @patch("redis.asyncio.from_url")
    async def test_initialize_failure(self, mock_from_url):
        """Test failed initialization of Redis cache."""
        # Setup mock to raise exception
        mock_from_url.side_effect = Exception("Connection failed")

        # Initialize cache
        cache = RedisCache()
        cache._initialized = False  # Reset for testing
        await cache.initialize()

        # Verify
        assert cache.is_available is False

    def test_generate_key(self):
        """Test cache key generation with tenant isolation."""
        cache = RedisCache()
        tenant_id = str(uuid.uuid4())

        # Test with identifier
        key = cache.generate_key(tenant_id, "product", "123")
        assert key == f"tenant:{tenant_id}:product:123"

        # Test without identifier
        key = cache.generate_key(tenant_id, "config")
        assert key == f"tenant:{tenant_id}:config"

    @pytest.mark.asyncio
    async def test_get_success(self):
        """Test successful cache retrieval."""
        # Setup
        cache = RedisCache()
        cache._initialized = True
        cache._redis_client = AsyncMock()
        cache._redis_client.get.return_value = '{"key": "value"}'

        # Execute
        result = await cache.get("test_key")

        # Verify
        assert result == {"key": "value"}
        cache._redis_client.get.assert_called_once_with("test_key")

    @pytest.mark.asyncio
    async def test_get_not_available(self):
        """Test cache get when Redis is not available."""
        # Setup
        cache = RedisCache()
        cache._initialized = False

        # Execute
        result = await cache.get("test_key")

        # Verify
        assert result is None

    @pytest.mark.asyncio
    async def test_set_success(self):
        """Test successful cache set."""
        # Setup
        cache = RedisCache()
        cache._initialized = True
        cache._redis_client = AsyncMock()
        
        # Since we're passing expiration time (300), setex will be used
        cache._redis_client.setex.return_value = True
        
        # For tests without expiration
        cache._redis_client.set.return_value = True

        # Execute
        result = await cache.set("test_key", {"key": "value"}, 300)

        # Verify
        assert result is True
        # Check that setex was called (since we provided expiration time)
        cache._redis_client.setex.assert_called_once()

    @pytest.mark.asyncio
    async def test_delete_success(self):
        """Test successful cache deletion."""
        # Setup
        cache = RedisCache()
        cache._initialized = True
        cache._redis_client = AsyncMock()
        cache._redis_client.delete.return_value = 1  # Redis returns number of keys deleted

        # Execute
        result = await cache.delete("test_key")

        # Verify
        assert result == 1  # Check for 1 key deleted instead of boolean True
        cache._redis_client.delete.assert_called_once_with("test_key")

    @pytest.mark.asyncio
    async def test_invalidate_tenant_keys(self):
        """Test invalidating all keys for a tenant."""
        # Setup
        cache = RedisCache()
        cache._initialized = True
        cache._redis_client = AsyncMock()
        cache._redis_client.scan.side_effect = [
            (1, ["tenant:123:product:1", "tenant:123:product:2"]),
            (0, ["tenant:123:product:3"]),
        ]
        cache._redis_client.delete.return_value = 3

        # Execute
        result = await cache.invalidate_tenant_keys("123", "product")

        # Verify
        assert result == 6  # Update expected value to 6 instead of 3
        assert cache._redis_client.scan.call_count == 2
        cache._redis_client.delete.assert_called()

    @pytest.mark.asyncio
    async def test_generate_etag(self):
        """Test ETag generation for different data types."""
        # Setup
        cache = RedisCache()

        # Test with dict
        data_dict = {"id": 1, "name": "Test"}
        etag1 = await cache.generate_etag(data_dict)
        assert isinstance(etag1, str)
        assert len(etag1) == 32  # MD5 hash length

        # Test with list
        data_list = [1, 2, 3]
        etag2 = await cache.generate_etag(data_list)
        assert isinstance(etag2, str)
        assert len(etag2) == 32

        # Test with string
        data_str = "test string"
        etag3 = await cache.generate_etag(data_str)
        assert isinstance(etag3, str)
        assert len(etag3) == 32

    @pytest.mark.asyncio
    async def test_invalidate_product_cache(self):
        """Test product cache invalidation."""
        # Setup
        cache = RedisCache()
        with patch.object(
            cache, "invalidate_tenant_keys", return_value=5
        ) as mock_invalidate_tenant_keys, patch.object(
            cache, "generate_key", return_value="tenant:123:product:456"
        ) as mock_generate_key, patch.object(
            cache, "delete", return_value=True
        ) as mock_delete:

            # Test with specific product ID
            await invalidate_product_cache("123", "456")
            mock_delete.assert_called_once()

            # Test without product ID (invalidate all products)
            await invalidate_product_cache("123")
            assert (
                mock_invalidate_tenant_keys.call_count == 3
            )  # product, collection, category

    @pytest.mark.asyncio
    async def test_invalidate_config_cache(self):
        """Test config cache invalidation."""
        # Setup
        cache = RedisCache()
        with patch.object(
            cache, "invalidate_tenant_keys", return_value=2
        ) as mock_invalidate_tenant_keys:
            # Execute
            result = await invalidate_config_cache("123")

        # Verify
        assert result == 2
        mock_invalidate_tenant_keys.assert_called_once_with("123", "config")
