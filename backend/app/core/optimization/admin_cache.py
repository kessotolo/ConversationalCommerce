import logging
from functools import wraps
from typing import Any, Dict, List, Optional, Set, Callable, Awaitable
import hashlib
import json
import inspect
from datetime import datetime

from fastapi import Request, Response, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.app.core.cache.redis_cache import redis_cache
from app.app.db.async_session import get_async_session_local

logger = logging.getLogger(__name__)

# Admin-specific cache expiration times in seconds
ADMIN_DASHBOARD_EXPIRATION = 120  # 2 minutes
ADMIN_CONFIG_EXPIRATION = 600  # 10 minutes
ADMIN_METRICS_EXPIRATION = 60  # 1 minute
ADMIN_USER_DATA_EXPIRATION = 300  # 5 minutes


class AdminCacheManager:
    """
    Specialized caching manager for admin dashboard and operations
    with specialized invalidation strategies for cross-tenant data.
    """
    
    # Cache key prefixes for different types of admin data
    DASHBOARD_PREFIX = "admin:dashboard"
    CONFIG_PREFIX = "admin:config"
    METRICS_PREFIX = "admin:metrics"
    USER_DATA_PREFIX = "admin:user_data"
    
    @staticmethod
    def _generate_cache_key(prefix: str, *args, **kwargs) -> str:
        """
        Generate a deterministic cache key based on function arguments.
        
        Args:
            prefix: Cache key prefix
            *args, **kwargs: Function arguments
            
        Returns:
            Cache key string
        """
        # Convert args and kwargs to a sortable representation
        key_parts = [str(arg) for arg in args]
        key_parts.extend([f"{k}:{v}" for k, v in sorted(kwargs.items())])
        
        # Create a hash of the arguments
        args_hash = hashlib.md5(json.dumps(key_parts).encode()).hexdigest()
        
        return f"{prefix}:{args_hash}"
    
    @staticmethod
    def cached_admin_dashboard(
        expiration: int = ADMIN_DASHBOARD_EXPIRATION,
    ) -> Callable:
        """
        Decorator for caching admin dashboard data.
        
        Args:
            expiration: Cache expiration time in seconds
            
        Returns:
            Decorator function
        """
        def decorator(func: Callable[..., Awaitable[Any]]) -> Callable[..., Awaitable[Any]]:
            @wraps(func)
            async def wrapper(*args, **kwargs):
                # Generate cache key based on function name and arguments
                cache_key = AdminCacheManager._generate_cache_key(
                    f"{AdminCacheManager.DASHBOARD_PREFIX}:{func.__name__}",
                    *args,
                    **{k: v for k, v in kwargs.items() if k != 'db'}
                )
                
                # Try to get from cache
                cached_result = await redis_cache.get(cache_key)
                if cached_result is not None:
                    logger.debug(f"Retrieved admin dashboard data from cache: {cache_key}")
                    return cached_result
                
                # Execute original function
                result = await func(*args, **kwargs)
                
                # Cache result
                await redis_cache.set(cache_key, result, expiration=expiration)
                logger.debug(f"Cached admin dashboard data: {cache_key}")
                
                return result
            return wrapper
        return decorator
    
    @staticmethod
    def cached_admin_metrics(
        expiration: int = ADMIN_METRICS_EXPIRATION,
    ) -> Callable:
        """
        Decorator for caching admin metrics data with short expiration.
        
        Args:
            expiration: Cache expiration time in seconds
            
        Returns:
            Decorator function
        """
        def decorator(func: Callable[..., Awaitable[Any]]) -> Callable[..., Awaitable[Any]]:
            @wraps(func)
            async def wrapper(*args, **kwargs):
                # Generate cache key based on function name and arguments
                cache_key = AdminCacheManager._generate_cache_key(
                    f"{AdminCacheManager.METRICS_PREFIX}:{func.__name__}",
                    *args,
                    **{k: v for k, v in kwargs.items() if k != 'db'}
                )
                
                # Add current timestamp with minute precision to ensure frequent refresh
                timestamp = datetime.now().strftime("%Y-%m-%d-%H-%M")
                cache_key = f"{cache_key}:{timestamp}"
                
                # Try to get from cache
                cached_result = await redis_cache.get(cache_key)
                if cached_result is not None:
                    logger.debug(f"Retrieved admin metrics data from cache: {cache_key}")
                    return cached_result
                
                # Execute original function
                result = await func(*args, **kwargs)
                
                # Cache result
                await redis_cache.set(cache_key, result, expiration=expiration)
                logger.debug(f"Cached admin metrics data: {cache_key}")
                
                return result
            return wrapper
        return decorator
    
    @staticmethod
    async def invalidate_dashboard_cache():
        """
        Invalidate all admin dashboard cache entries.
        
        Returns:
            Number of keys invalidated
        """
        return await redis_cache.delete_by_pattern(f"{AdminCacheManager.DASHBOARD_PREFIX}*")
    
    @staticmethod
    async def invalidate_metrics_cache():
        """
        Invalidate all admin metrics cache entries.
        
        Returns:
            Number of keys invalidated
        """
        return await redis_cache.delete_by_pattern(f"{AdminCacheManager.METRICS_PREFIX}*")
    
    @staticmethod
    async def invalidate_user_data_cache(user_id: str = None):
        """
        Invalidate admin user data cache entries.
        
        Args:
            user_id: Optional user ID to limit invalidation scope
            
        Returns:
            Number of keys invalidated
        """
        pattern = f"{AdminCacheManager.USER_DATA_PREFIX}"
        if user_id:
            pattern = f"{pattern}*{user_id}*"
        else:
            pattern = f"{pattern}*"
        
        return await redis_cache.delete_by_pattern(pattern)


# Create singleton instance
admin_cache = AdminCacheManager()
