import json
import hashlib
import logging
from typing import Any, Optional, Dict, List, Callable, Union
import asyncio
from datetime import datetime, timedelta
import redis.asyncio as redis
from fastapi import Request, Response
import uuid

from app.core.config.settings import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

# Default cache expiration times in seconds
DEFAULT_EXPIRATION = 300  # 5 minutes
PRODUCT_EXPIRATION = 600  # 10 minutes
CONFIG_EXPIRATION = 3600  # 1 hour
LAYOUT_EXPIRATION = 7200  # 2 hours

class RedisCache:
    """Redis-based cache implementation for multi-tenant storefront data."""
    
    _instance = None
    _redis_client = None
    
    def __new__(cls):
        """Singleton pattern to ensure only one cache instance."""
        if cls._instance is None:
            cls._instance = super(RedisCache, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    async def initialize(self):
        """Initialize the Redis connection."""
        if self._initialized:
            return
        
        try:
            # Get Redis settings from environment
            redis_url = settings.REDIS_URL if hasattr(settings, "REDIS_URL") else "redis://localhost:6379/0"
            
            # Check if REDIS_DISABLED is set
            redis_disabled = getattr(settings, "REDIS_DISABLED", False)
            if redis_disabled:
                logger.info("Redis cache is disabled by configuration")
                self._initialized = False
                return
                
            # Create Redis client with timeout
            self._redis_client = redis.from_url(
                redis_url, 
                encoding="utf-8", 
                decode_responses=True,
                socket_connect_timeout=3.0,  # 3 second timeout for connection
                socket_keepalive=True
            )
            
            try:
                # Test connection with timeout
                await asyncio.wait_for(self._redis_client.ping(), timeout=2.0)
                logger.info("Redis cache initialized successfully")
                self._initialized = True
            except asyncio.TimeoutError:
                logger.warning("Redis connection timed out - continuing without cache")
                self._initialized = False
                self._redis_client = None
            except Exception as e:
                logger.warning(f"Redis ping failed - continuing without cache: {str(e)}")
                self._initialized = False
                self._redis_client = None
        except Exception as e:
            logger.warning(f"Failed to initialize Redis cache - continuing without cache: {str(e)}")
            self._initialized = False
            self._redis_client = None
    
    @property
    def is_available(self) -> bool:
        """Check if Redis cache is available."""
        return self._initialized and self._redis_client is not None
    
    def generate_key(self, tenant_id: str, prefix: str, identifier: str = None) -> str:
        """
        Generate a cache key with tenant isolation.
        
        Args:
            tenant_id: Tenant ID for isolation
            prefix: Key prefix (e.g., 'product', 'config')
            identifier: Optional specific identifier
            
        Returns:
            Cache key string
        """
        if identifier:
            return f"tenant:{tenant_id}:{prefix}:{identifier}"
        return f"tenant:{tenant_id}:{prefix}"
    
    async def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache.
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None if not found
        """
        if not self.is_available:
            return None
        
        try:
            value = await self._redis_client.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            logger.error(f"Redis cache get error: {str(e)}")
            return None
    
    async def set(self, key: str, value: Any, expiration: int = DEFAULT_EXPIRATION) -> bool:
        """
        Set value in cache.
        
        Args:
            key: Cache key
            value: Value to cache
            expiration: Expiration time in seconds
            
        Returns:
            True if successful, False otherwise
        """
        if not self.is_available:
            return False
        
        try:
            serialized_value = json.dumps(value)
            await self._redis_client.set(key, serialized_value, ex=expiration)
            return True
        except Exception as e:
            logger.error(f"Redis cache set error: {str(e)}")
            return False
    
    async def delete(self, key: str) -> bool:
        """
        Delete value from cache.
        
        Args:
            key: Cache key
            
        Returns:
            True if successful, False otherwise
        """
        if not self.is_available:
            return False
        
        try:
            await self._redis_client.delete(key)
            return True
        except Exception as e:
            logger.error(f"Redis cache delete error: {str(e)}")
            return False
    
    async def invalidate_tenant_keys(self, tenant_id: str, prefix: Optional[str] = None) -> int:
        """
        Invalidate all keys for a specific tenant.
        
        Args:
            tenant_id: Tenant ID
            prefix: Optional prefix to limit invalidation scope
            
        Returns:
            Number of keys invalidated
        """
        if not self.is_available:
            return 0
        
        try:
            pattern = f"tenant:{tenant_id}:{prefix}*" if prefix else f"tenant:{tenant_id}:*"
            cursor = 0
            total_deleted = 0
            
            while True:
                cursor, keys = await self._redis_client.scan(cursor, match=pattern, count=100)
                if keys:
                    deleted = await self._redis_client.delete(*keys)
                    total_deleted += deleted
                
                if cursor == 0:
                    break
            
            return total_deleted
        except Exception as e:
            logger.error(f"Redis cache invalidation error: {str(e)}")
            return 0
    
    async def generate_etag(self, data: Any) -> str:
        """
        Generate ETag for response data.
        
        Args:
            data: Data to generate ETag for
            
        Returns:
            ETag string
        """
        if isinstance(data, dict) or isinstance(data, list):
            data_str = json.dumps(data, sort_keys=True)
        else:
            data_str = str(data)
        
        return hashlib.md5(data_str.encode()).hexdigest()


# Create singleton instance
redis_cache = RedisCache()


async def get_cache_key_from_request(request: Request, prefix: str) -> str:
    """
    Generate cache key from request context.
    
    Args:
        request: FastAPI request
        prefix: Key prefix
        
    Returns:
        Cache key string
    """
    # Get tenant ID from request state
    tenant_context = getattr(request.state, "tenant_context", None)
    tenant_id = tenant_context.get("tenant_id", "default") if tenant_context else "default"
    
    # Generate cache key based on request path and query params
    path = request.url.path
    query_string = request.url.query
    
    # Create identifier from path and query
    identifier = f"{path}"
    if query_string:
        identifier += f"?{query_string}"
    
    # Hash the identifier to keep keys manageable length
    identifier_hash = hashlib.md5(identifier.encode()).hexdigest()
    
    return redis_cache.generate_key(tenant_id, prefix, identifier_hash)


def cached_response(
    prefix: str,
    expiration: int = DEFAULT_EXPIRATION,
    include_request_headers: bool = False
):
    """
    Decorator for caching API responses with tenant isolation.
    
    Args:
        prefix: Cache key prefix
        expiration: Cache expiration time in seconds
        include_request_headers: Whether to include request headers in cache key
        
    Returns:
        Decorator function
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Get request from args or kwargs
            request = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            
            if not request and 'request' in kwargs:
                request = kwargs['request']
            
            if not request:
                # Can't cache without request context
                return await func(*args, **kwargs)
            
            # Get response from kwargs if present
            response = kwargs.get('response', None)
            
            # Generate cache key
            cache_key = await get_cache_key_from_request(request, prefix)
            
            # Include headers in cache key if specified
            if include_request_headers:
                headers_dict = dict(request.headers.items())
                headers_str = json.dumps(headers_dict, sort_keys=True)
                headers_hash = hashlib.md5(headers_str.encode()).hexdigest()
                cache_key += f":{headers_hash}"
            
            # Check if we have cached response
            if redis_cache.is_available:
                cached_data = await redis_cache.get(cache_key)
                if cached_data:
                    # Check if this is a conditional request
                    if_none_match = request.headers.get("if-none-match")
                    if if_none_match and "etag" in cached_data:
                        if if_none_match == cached_data["etag"]:
                            # Return 304 Not Modified
                            if response:
                                response.status_code = 304
                                return None
                    
                    # Return cached response with ETag
                    result = cached_data["data"]
                    if response and "etag" in cached_data:
                        response.headers["ETag"] = cached_data["etag"]
                        response.headers["Cache-Control"] = f"max-age={expiration}"
                    
                    return result
            
            # Execute the original function
            result = await func(*args, **kwargs)
            
            # Cache the result if available
            if redis_cache.is_available and result is not None:
                # Generate ETag
                etag = await redis_cache.generate_etag(result)
                
                # Set ETag header in response
                if response:
                    response.headers["ETag"] = etag
                    response.headers["Cache-Control"] = f"max-age={expiration}"
                
                # Cache the result with ETag
                await redis_cache.set(
                    cache_key,
                    {
                        "data": result,
                        "etag": etag,
                        "cached_at": str(datetime.now())
                    },
                    expiration
                )
            
            return result
        
        return wrapper
    
    return decorator


async def invalidate_tenant_cache(tenant_id: str, prefix: Optional[str] = None) -> int:
    """
    Invalidate cache for a specific tenant.
    
    Args:
        tenant_id: Tenant ID
        prefix: Optional prefix to limit invalidation scope
        
    Returns:
        Number of keys invalidated
    """
    return await redis_cache.invalidate_tenant_keys(tenant_id, prefix)


async def invalidate_product_cache(tenant_id: str, product_id: Optional[str] = None) -> int:
    """
    Invalidate product cache for a specific tenant.
    
    Args:
        tenant_id: Tenant ID
        product_id: Optional product ID to invalidate specific product
        
    Returns:
        Number of keys invalidated
    """
    prefix = "product"
    if product_id:
        key = redis_cache.generate_key(tenant_id, prefix, product_id)
        await redis_cache.delete(key)
        return 1
    
    # Also invalidate collections and categories since they're affected by product changes
    await redis_cache.invalidate_tenant_keys(tenant_id, "collection")
    await redis_cache.invalidate_tenant_keys(tenant_id, "category")
    
    return await redis_cache.invalidate_tenant_keys(tenant_id, prefix)


async def invalidate_config_cache(tenant_id: str) -> int:
    """
    Invalidate configuration cache for a specific tenant.
    
    Args:
        tenant_id: Tenant ID
        
    Returns:
        Number of keys invalidated
    """
    return await redis_cache.invalidate_tenant_keys(tenant_id, "config")
