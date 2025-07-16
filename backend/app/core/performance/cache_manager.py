"""
Advanced Caching Manager for Merchant Services.

Provides:
- Redis-based caching with TTL
- Multi-level cache hierarchy
- Cache invalidation strategies
- Performance monitoring
- Tenant-aware caching
"""

import json
import uuid
import hashlib
import asyncio
from typing import Any, Dict, List, Optional, Union, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import redis.asyncio as redis
from fastapi import BackgroundTasks
import logging

logger = logging.getLogger(__name__)


class CacheLevel(str, Enum):
    """Cache levels for different data types."""
    L1_MEMORY = "l1_memory"      # In-process memory cache
    L2_REDIS = "l2_redis"        # Redis cache
    L3_DATABASE = "l3_database"  # Database with caching layer


class CacheStrategy(str, Enum):
    """Cache strategies for different use cases."""
    WRITE_THROUGH = "write_through"    # Write to cache and DB simultaneously
    WRITE_BACK = "write_back"          # Write to cache, DB later
    WRITE_AROUND = "write_around"      # Write to DB, invalidate cache
    READ_THROUGH = "read_through"      # Read from cache, fallback to DB


@dataclass
class CacheConfig:
    """Configuration for cache entries."""
    ttl_seconds: int = 300  # 5 minutes default
    max_size: int = 1000
    strategy: CacheStrategy = CacheStrategy.READ_THROUGH
    tenant_scoped: bool = True
    auto_refresh: bool = False
    compression: bool = False


@dataclass
class CacheMetrics:
    """Cache performance metrics."""
    hits: int = 0
    misses: int = 0
    sets: int = 0
    deletes: int = 0
    evictions: int = 0
    hit_rate: float = 0.0
    avg_response_time: float = 0.0


class MerchantCacheManager:
    """
    Advanced caching manager optimized for merchant services.

    Features:
    - Tenant-aware caching with automatic namespacing
    - Multi-level cache hierarchy (memory -> Redis -> DB)
    - Intelligent cache invalidation
    - Performance monitoring and metrics
    - Automatic cache warming for frequently accessed data
    """

    def __init__(
        self,
        redis_url: str = "redis://localhost:6379",
        default_ttl: int = 300,
        max_memory_cache_size: int = 1000
    ):
        self.redis_url = redis_url
        self.default_ttl = default_ttl
        self.max_memory_cache_size = max_memory_cache_size

        # Redis connection pool
        self._redis_pool: Optional[redis.Redis] = None

        # In-memory L1 cache
        self._memory_cache: Dict[str, Dict[str, Any]] = {}
        self._memory_cache_access: Dict[str, datetime] = {}

        # Cache configurations by key pattern
        self._cache_configs: Dict[str, CacheConfig] = {}

        # Performance metrics
        self._metrics: Dict[str, CacheMetrics] = {}

        # Background tasks for cache maintenance
        self._maintenance_tasks: List[asyncio.Task] = []

    async def initialize(self) -> None:
        """Initialize cache manager and connections."""
        try:
            # Initialize Redis connection
            self._redis_pool = redis.Redis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True,
                max_connections=20
            )

            # Test Redis connection
            await self._redis_pool.ping()
            logger.info("Redis cache connection established")

            # Start background maintenance tasks
            await self._start_maintenance_tasks()

        except Exception as e:
            logger.error(f"Failed to initialize cache manager: {e}")
            raise

    async def _start_maintenance_tasks(self) -> None:
        """Start background maintenance tasks."""
        # Memory cache cleanup task
        cleanup_task = asyncio.create_task(self._memory_cache_cleanup())
        self._maintenance_tasks.append(cleanup_task)

        # Cache metrics collection task
        metrics_task = asyncio.create_task(self._collect_metrics())
        self._maintenance_tasks.append(metrics_task)

    def configure_cache(self, key_pattern: str, config: CacheConfig) -> None:
        """Configure caching for specific key patterns."""
        self._cache_configs[key_pattern] = config
        logger.info(f"Configured cache for pattern '{key_pattern}': {config}")

    def _get_cache_config(self, key: str) -> CacheConfig:
        """Get cache configuration for a key."""
        for pattern, config in self._cache_configs.items():
            if pattern in key:
                return config
        return CacheConfig()  # Default config

    def _generate_cache_key(
        self,
        namespace: str,
        key: str,
        tenant_id: Optional[uuid.UUID] = None
    ) -> str:
        """Generate cache key with proper namespacing."""
        components = ["merchant_cache", namespace]

        if tenant_id:
            components.append(f"tenant:{tenant_id}")

        components.append(key)
        return ":".join(components)

    def _hash_key(self, key: str) -> str:
        """Hash long keys for efficient storage."""
        if len(key) > 250:  # Redis key length limit
            return hashlib.sha256(key.encode()).hexdigest()
        return key

    async def get(
        self,
        namespace: str,
        key: str,
        tenant_id: Optional[uuid.UUID] = None,
        fallback_fn: Optional[Callable] = None
    ) -> Optional[Any]:
        """
        Get value from cache with multi-level lookup.

        Args:
            namespace: Cache namespace (e.g., 'merchant_auth', 'product_catalog')
            key: Cache key
            tenant_id: Tenant ID for tenant-scoped caching
            fallback_fn: Function to call if cache miss
        """
        cache_key = self._generate_cache_key(namespace, key, tenant_id)
        hashed_key = self._hash_key(cache_key)
        config = self._get_cache_config(cache_key)

        start_time = datetime.utcnow()

        try:
            # L1: Check memory cache first
            if hashed_key in self._memory_cache:
                self._record_hit(namespace)
                self._update_access_time(hashed_key)
                value = self._memory_cache[hashed_key]["value"]
                logger.debug(f"L1 cache hit: {cache_key}")
                return self._deserialize_value(value)

            # L2: Check Redis cache
            if self._redis_pool:
                redis_value = await self._redis_pool.get(hashed_key)
                if redis_value:
                    self._record_hit(namespace)

                    # Store in L1 cache for faster future access
                    await self._set_memory_cache(hashed_key, redis_value, config.ttl_seconds)

                    logger.debug(f"L2 cache hit: {cache_key}")
                    return self._deserialize_value(redis_value)

            # Cache miss - use fallback if provided
            self._record_miss(namespace)

            if fallback_fn:
                logger.debug(f"Cache miss, executing fallback: {cache_key}")
                value = await fallback_fn() if asyncio.iscoroutinefunction(fallback_fn) else fallback_fn()

                if value is not None:
                    # Store in cache for future requests
                    await self.set(namespace, key, value, tenant_id, config.ttl_seconds)

                return value

            return None

        except Exception as e:
            logger.error(f"Cache get error for {cache_key}: {e}")
            self._record_miss(namespace)
            return None

        finally:
            # Record response time
            response_time = (datetime.utcnow() - start_time).total_seconds()
            self._record_response_time(namespace, response_time)

    async def set(
        self,
        namespace: str,
        key: str,
        value: Any,
        tenant_id: Optional[uuid.UUID] = None,
        ttl_seconds: Optional[int] = None
    ) -> bool:
        """Set value in cache with multi-level storage."""
        cache_key = self._generate_cache_key(namespace, key, tenant_id)
        hashed_key = self._hash_key(cache_key)
        config = self._get_cache_config(cache_key)

        ttl = ttl_seconds or config.ttl_seconds
        serialized_value = self._serialize_value(value)

        try:
            # Store in L1 memory cache
            await self._set_memory_cache(hashed_key, serialized_value, ttl)

            # Store in L2 Redis cache
            if self._redis_pool:
                await self._redis_pool.setex(hashed_key, ttl, serialized_value)

            self._record_set(namespace)
            logger.debug(f"Cache set: {cache_key} (TTL: {ttl}s)")
            return True

        except Exception as e:
            logger.error(f"Cache set error for {cache_key}: {e}")
            return False

    async def delete(
        self,
        namespace: str,
        key: str,
        tenant_id: Optional[uuid.UUID] = None
    ) -> bool:
        """Delete value from all cache levels."""
        cache_key = self._generate_cache_key(namespace, key, tenant_id)
        hashed_key = self._hash_key(cache_key)

        try:
            # Remove from L1 memory cache
            if hashed_key in self._memory_cache:
                del self._memory_cache[hashed_key]
                del self._memory_cache_access[hashed_key]

            # Remove from L2 Redis cache
            if self._redis_pool:
                await self._redis_pool.delete(hashed_key)

            self._record_delete(namespace)
            logger.debug(f"Cache delete: {cache_key}")
            return True

        except Exception as e:
            logger.error(f"Cache delete error for {cache_key}: {e}")
            return False

    async def invalidate_pattern(
        self,
        namespace: str,
        pattern: str,
        tenant_id: Optional[uuid.UUID] = None
    ) -> int:
        """Invalidate all cache entries matching a pattern."""
        cache_pattern = self._generate_cache_key(namespace, pattern, tenant_id)
        deleted_count = 0

        try:
            # Invalidate from memory cache
            keys_to_delete = []
            for key in self._memory_cache.keys():
                if pattern in key:
                    keys_to_delete.append(key)

            for key in keys_to_delete:
                del self._memory_cache[key]
                del self._memory_cache_access[key]
                deleted_count += 1

            # Invalidate from Redis cache
            if self._redis_pool:
                redis_keys = await self._redis_pool.keys(f"*{pattern}*")
                if redis_keys:
                    deleted_count += await self._redis_pool.delete(*redis_keys)

            logger.info(
                f"Invalidated {deleted_count} cache entries for pattern: {cache_pattern}")
            return deleted_count

        except Exception as e:
            logger.error(
                f"Cache invalidation error for pattern {cache_pattern}: {e}")
            return 0

    async def invalidate_tenant(self, tenant_id: uuid.UUID) -> int:
        """Invalidate all cache entries for a specific tenant."""
        return await self.invalidate_pattern("", f"tenant:{tenant_id}")

    async def warm_cache(
        self,
        namespace: str,
        warm_data: Dict[str, Any],
        tenant_id: Optional[uuid.UUID] = None
    ) -> None:
        """Warm cache with frequently accessed data."""
        logger.info(f"Warming cache for namespace: {namespace}")

        for key, value in warm_data.items():
            await self.set(namespace, key, value, tenant_id)

        logger.info(f"Cache warmed with {len(warm_data)} entries")

    async def _set_memory_cache(self, key: str, value: str, ttl: int) -> None:
        """Set value in L1 memory cache with size limits."""
        # Check cache size limit
        if len(self._memory_cache) >= self.max_memory_cache_size:
            await self._evict_lru_memory_cache()

        expiry = datetime.utcnow() + timedelta(seconds=ttl)
        self._memory_cache[key] = {
            "value": value,
            "expiry": expiry
        }
        self._memory_cache_access[key] = datetime.utcnow()

    async def _evict_lru_memory_cache(self) -> None:
        """Evict least recently used entries from memory cache."""
        if not self._memory_cache:
            return

        # Find least recently used key
        lru_key = min(
            self._memory_cache_access.keys(),
            key=lambda k: self._memory_cache_access[k]
        )

        # Remove LRU entry
        del self._memory_cache[lru_key]
        del self._memory_cache_access[lru_key]

        logger.debug(f"Evicted LRU cache entry: {lru_key}")

    async def _memory_cache_cleanup(self) -> None:
        """Background task to clean up expired memory cache entries."""
        while True:
            try:
                current_time = datetime.utcnow()
                expired_keys = []

                for key, data in self._memory_cache.items():
                    if current_time > data["expiry"]:
                        expired_keys.append(key)

                for key in expired_keys:
                    del self._memory_cache[key]
                    del self._memory_cache_access[key]

                if expired_keys:
                    logger.debug(
                        f"Cleaned up {len(expired_keys)} expired cache entries")

                # Sleep for 60 seconds before next cleanup
                await asyncio.sleep(60)

            except Exception as e:
                logger.error(f"Memory cache cleanup error: {e}")
                await asyncio.sleep(60)

    async def _collect_metrics(self) -> None:
        """Background task to collect cache metrics."""
        while True:
            try:
                # Calculate hit rates for all namespaces
                for namespace, metrics in self._metrics.items():
                    total_requests = metrics.hits + metrics.misses
                    if total_requests > 0:
                        metrics.hit_rate = metrics.hits / total_requests

                # Log metrics every 5 minutes
                await asyncio.sleep(300)
                await self._log_metrics()

            except Exception as e:
                logger.error(f"Metrics collection error: {e}")
                await asyncio.sleep(300)

    async def _log_metrics(self) -> None:
        """Log cache performance metrics."""
        for namespace, metrics in self._metrics.items():
            logger.info(
                f"Cache metrics for {namespace}: "
                f"hits={metrics.hits}, misses={metrics.misses}, "
                f"hit_rate={metrics.hit_rate:.2%}, "
                f"avg_response_time={metrics.avg_response_time:.3f}s"
            )

    def _serialize_value(self, value: Any) -> str:
        """Serialize value for cache storage."""
        try:
            return json.dumps(value, default=str)
        except (TypeError, ValueError) as e:
            logger.warning(f"Cache serialization failed: {e}")
            return str(value)

    def _deserialize_value(self, value: str) -> Any:
        """Deserialize value from cache storage."""
        try:
            return json.loads(value)
        except (TypeError, ValueError):
            return value

    def _record_hit(self, namespace: str) -> None:
        """Record cache hit for metrics."""
        if namespace not in self._metrics:
            self._metrics[namespace] = CacheMetrics()
        self._metrics[namespace].hits += 1

    def _record_miss(self, namespace: str) -> None:
        """Record cache miss for metrics."""
        if namespace not in self._metrics:
            self._metrics[namespace] = CacheMetrics()
        self._metrics[namespace].misses += 1

    def _record_set(self, namespace: str) -> None:
        """Record cache set for metrics."""
        if namespace not in self._metrics:
            self._metrics[namespace] = CacheMetrics()
        self._metrics[namespace].sets += 1

    def _record_delete(self, namespace: str) -> None:
        """Record cache delete for metrics."""
        if namespace not in self._metrics:
            self._metrics[namespace] = CacheMetrics()
        self._metrics[namespace].deletes += 1

    def _record_response_time(self, namespace: str, response_time: float) -> None:
        """Record response time for metrics."""
        if namespace not in self._metrics:
            self._metrics[namespace] = CacheMetrics()

        # Calculate rolling average
        current_avg = self._metrics[namespace].avg_response_time
        self._metrics[namespace].avg_response_time = (
            current_avg + response_time) / 2

    def _update_access_time(self, key: str) -> None:
        """Update access time for LRU tracking."""
        self._memory_cache_access[key] = datetime.utcnow()

    async def get_metrics(self) -> Dict[str, CacheMetrics]:
        """Get cache performance metrics."""
        return self._metrics.copy()

    async def cleanup(self) -> None:
        """Cleanup cache manager resources."""
        # Cancel background tasks
        for task in self._maintenance_tasks:
            task.cancel()

        # Close Redis connection
        if self._redis_pool:
            await self._redis_pool.close()

        # Clear memory cache
        self._memory_cache.clear()
        self._memory_cache_access.clear()

        logger.info("Cache manager cleaned up")


# Global cache manager instance
cache_manager = MerchantCacheManager()


# Cache decorators for easy integration
def cached(
    namespace: str,
    ttl_seconds: int = 300,
    tenant_scoped: bool = True
):
    """Decorator for caching function results."""
    def decorator(func):
        async def async_wrapper(*args, **kwargs):
            # Generate cache key from function name and arguments
            key_data = {
                "func": func.__name__,
                "args": str(args),
                "kwargs": str(sorted(kwargs.items()))
            }
            cache_key = hashlib.md5(str(key_data).encode()).hexdigest()

            # Extract tenant_id if tenant_scoped
            tenant_id = None
            if tenant_scoped and "tenant_id" in kwargs:
                tenant_id = kwargs["tenant_id"]

            # Try to get from cache
            cached_result = await cache_manager.get(
                namespace,
                cache_key,
                tenant_id,
                fallback_fn=lambda: func(*args, **kwargs)
            )

            return cached_result

        def sync_wrapper(*args, **kwargs):
            # For sync functions, we can't use async cache directly
            # This would need to be handled differently in a real implementation
            return func(*args, **kwargs)

        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper

    return decorator


def cache_invalidate(namespace: str, pattern: str = "*"):
    """Decorator for cache invalidation after function execution."""
    def decorator(func):
        async def async_wrapper(*args, **kwargs):
            result = await func(*args, **kwargs)

            # Extract tenant_id if available
            tenant_id = kwargs.get("tenant_id")

            # Invalidate cache
            await cache_manager.invalidate_pattern(namespace, pattern, tenant_id)

            return result

        def sync_wrapper(*args, **kwargs):
            result = func(*args, **kwargs)
            # For sync functions, invalidation would need to be handled differently
            return result

        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper

    return decorator
