"""
Merchant Cache Manager Service.

Handles merchant-specific caching strategies with Redis integration,
cache warming, and intelligent invalidation.

Business Context:
- Each merchant (business customer) has isolated cached data identified by tenant_id
- Cache strategies optimize frequently accessed merchant data (products, orders, analytics)
- Different cache TTL and warming strategies based on merchant subscription tier
- Cache isolation ensures one merchant's cache operations don't affect others
"""

import asyncio
import json
import time
import uuid
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum

import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload, joinedload

from app.core.config.settings import get_settings
from app.models.tenant import Tenant
from app.models.product import Product
from app.models.order import Order

logger = logging.getLogger(__name__)
settings = get_settings()


class CacheStrategy(str, Enum):
    """Cache strategies for different data types."""
    WRITE_THROUGH = "write_through"
    WRITE_BEHIND = "write_behind"
    CACHE_ASIDE = "cache_aside"
    REFRESH_AHEAD = "refresh_ahead"


@dataclass
class CacheConfig:
    """Configuration for cache optimization."""
    ttl: int = 300  # Time to live in seconds
    strategy: CacheStrategy = CacheStrategy.CACHE_ASIDE
    compression: bool = False
    encryption: bool = False
    auto_refresh: bool = True
    warm_on_startup: bool = False


class MerchantCacheManager:
    """
    Merchant-specific cache management with Redis integration.

    Features:
    - Multi-level caching strategies
    - Intelligent cache warming
    - Automatic invalidation
    - Performance metrics tracking
    """

    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        self.cache_configs: Dict[str, CacheConfig] = {}
        self.cache_warm_queue: asyncio.Queue = asyncio.Queue()

    async def initialize(self) -> None:
        """Initialize Redis connection and cache configurations."""
        try:
            # Initialize Redis connection
            self.redis_client = redis.Redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                max_connections=20
            )
            await self.redis_client.ping()
            logger.info("Cache manager Redis connection established")

            # Setup default cache configurations
            self._setup_default_configs()

        except Exception as e:
            logger.error(f"Failed to initialize cache manager: {e}")
            raise

    def _setup_default_configs(self) -> None:
        """Setup default cache configurations."""
        self.cache_configs.update({
            "products": CacheConfig(
                ttl=600,  # 10 minutes
                strategy=CacheStrategy.CACHE_ASIDE,
                compression=True,
                auto_refresh=True,
                warm_on_startup=True
            ),
            "orders": CacheConfig(
                ttl=300,  # 5 minutes
                strategy=CacheStrategy.WRITE_THROUGH,
                compression=False,
                auto_refresh=False
            ),
            "analytics": CacheConfig(
                ttl=3600,  # 1 hour
                strategy=CacheStrategy.REFRESH_AHEAD,
                compression=True,
                auto_refresh=True
            ),
            "sessions": CacheConfig(
                ttl=1800,  # 30 minutes
                strategy=CacheStrategy.WRITE_BEHIND,
                compression=False,
                encryption=True
            )
        })

    async def cache_merchant_products(
        self,
        tenant_id: uuid.UUID,
        force_refresh: bool = False
    ) -> Dict[str, Any]:
        """Cache merchant products with intelligent prefetching."""
        cache_key = f"merchant:products:{tenant_id}"
        config = self.cache_configs.get("products", CacheConfig())

        try:
            # Check cache first
            if not force_refresh:
                cached_data = await self._get_from_cache(cache_key)
                if cached_data:
                    return {
                        "status": "cache_hit",
                        "data": cached_data,
                        "source": "redis"
                    }

            # This would integrate with database session
            # For now, return mock data structure
            products_data = await self._fetch_products_from_db(tenant_id)

            # Cache the data
            await self._set_in_cache(cache_key, products_data, config)

            return {
                "status": "cache_miss",
                "data": products_data,
                "source": "database",
                "product_count": len(products_data)
            }

        except Exception as e:
            logger.error(
                f"Error caching merchant products for {tenant_id}: {e}")
            raise

    async def cache_merchant_analytics(
        self,
        tenant_id: uuid.UUID,
        date_range: Tuple[datetime, datetime],
        force_refresh: bool = False
    ) -> Dict[str, Any]:
        """Cache merchant analytics data with aggregations."""
        start_date, end_date = date_range
        cache_key = f"merchant:analytics:{tenant_id}:{start_date.date()}:{end_date.date()}"
        config = self.cache_configs.get("analytics", CacheConfig())

        try:
            # Check cache first
            if not force_refresh:
                cached_data = await self._get_from_cache(cache_key)
                if cached_data:
                    return {
                        "status": "cache_hit",
                        "data": cached_data,
                        "source": "redis"
                    }

            # Fetch analytics data
            analytics_data = await self._fetch_analytics_from_db(tenant_id, date_range)

            # Cache the analytics
            await self._set_in_cache(cache_key, analytics_data, config)

            return {
                "status": "cache_miss",
                "data": analytics_data,
                "source": "database"
            }

        except Exception as e:
            logger.error(
                f"Error caching merchant analytics for {tenant_id}: {e}")
            raise

    async def warm_cache_for_tenant(self, tenant_id: uuid.UUID) -> Dict[str, Any]:
        """Warm cache with frequently accessed data for a tenant."""
        try:
            warming_results = {}

            # Warm products cache
            products_result = await self.cache_merchant_products(tenant_id, force_refresh=True)
            warming_results["products"] = products_result["status"]

            # Warm recent analytics
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=7)
            analytics_result = await self.cache_merchant_analytics(
                tenant_id, (start_date, end_date), force_refresh=True
            )
            warming_results["analytics"] = analytics_result["status"]

            return {
                "tenant_id": str(tenant_id),
                "warming_results": warming_results,
                "status": "completed"
            }

        except Exception as e:
            logger.error(f"Error warming cache for tenant {tenant_id}: {e}")
            return {"error": str(e)}

    async def invalidate_tenant_cache(
        self,
        tenant_id: uuid.UUID,
        cache_types: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Invalidate cache for specific tenant and cache types."""
        try:
            invalidated = []
            cache_types = cache_types or ["products", "analytics", "orders"]

            for cache_type in cache_types:
                pattern = f"merchant:{cache_type}:{tenant_id}*"
                keys = await self.redis_client.keys(pattern)

                if keys:
                    await self.redis_client.delete(*keys)
                    invalidated.extend(keys)

            return {
                "tenant_id": str(tenant_id),
                "invalidated_keys": len(invalidated),
                "cache_types": cache_types
            }

        except Exception as e:
            logger.error(
                f"Error invalidating cache for tenant {tenant_id}: {e}")
            return {"error": str(e)}

    async def get_cache_stats(self, tenant_id: uuid.UUID) -> Dict[str, Any]:
        """Get cache statistics for a specific tenant."""
        try:
            stats = {}

            for cache_type in ["products", "analytics", "orders"]:
                pattern = f"merchant:{cache_type}:{tenant_id}*"
                keys = await self.redis_client.keys(pattern)

                stats[cache_type] = {
                    "key_count": len(keys),
                    "total_memory": 0  # Would calculate actual memory usage
                }

            # Get Redis info
            redis_info = await self.redis_client.info("stats")
            global_stats = {
                "hit_ratio": float(redis_info.get("keyspace_hits", 0)) / max(
                    float(redis_info.get("keyspace_hits", 0)) +
                    float(redis_info.get("keyspace_misses", 1)), 1
                ),
                "total_commands": redis_info.get("total_commands_processed", 0)
            }

            return {
                "tenant_id": str(tenant_id),
                "cache_stats": stats,
                "global_stats": global_stats
            }

        except Exception as e:
            logger.error(
                f"Error getting cache stats for tenant {tenant_id}: {e}")
            return {"error": str(e)}

    # Helper Methods

    async def _get_from_cache(self, key: str) -> Optional[Any]:
        """Get data from Redis cache."""
        try:
            if self.redis_client:
                data = await self.redis_client.get(key)
                if data:
                    return json.loads(data)
            return None
        except Exception as e:
            logger.error(f"Error getting from cache: {e}")
            return None

    async def _set_in_cache(self, key: str, data: Any, config: CacheConfig) -> None:
        """Set data in Redis cache with configuration."""
        try:
            if self.redis_client:
                serialized_data = json.dumps(data, default=str)

                if config.compression:
                    import gzip
                    serialized_data = gzip.compress(serialized_data.encode())

                await self.redis_client.setex(key, config.ttl, serialized_data)
        except Exception as e:
            logger.error(f"Error setting cache: {e}")

    async def _fetch_products_from_db(self, tenant_id: uuid.UUID) -> List[Dict[str, Any]]:
        """Fetch products from database (mock implementation)."""
        # This would integrate with actual database session
        return [
            {
                "id": str(uuid.uuid4()),
                "name": f"Product for tenant {tenant_id}",
                "price": 100.0,
                "stock_quantity": 50,
                "created_at": datetime.utcnow().isoformat()
            }
        ]

    async def _fetch_analytics_from_db(
        self,
        tenant_id: uuid.UUID,
        date_range: Tuple[datetime, datetime]
    ) -> Dict[str, Any]:
        """Fetch analytics from database (mock implementation)."""
        start_date, end_date = date_range
        return {
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            },
            "metrics": {
                "total_orders": 150,
                "total_revenue": 15000.0,
                "avg_order_value": 100.0
            }
        }

    async def cleanup(self) -> None:
        """Cleanup Redis connection."""
        try:
            if self.redis_client:
                await self.redis_client.close()
            logger.info("Cache manager cleanup completed")
        except Exception as e:
            logger.error(f"Error during cache manager cleanup: {e}")
