"""
API Resilience Module for handling offline/low-connectivity scenarios.

Provides retry mechanisms, graceful error handling, and fallback strategies
for robust API operations in African market conditions.
"""

import asyncio
import logging
from typing import Any, Callable, Optional, TypeVar, Union
from functools import wraps
from datetime import datetime, timedelta
import time

from fastapi import HTTPException, status
from sqlalchemy.exc import OperationalError, DisconnectionError
from redis.exceptions import RedisError
import httpx

logger = logging.getLogger(__name__)

T = TypeVar('T')


class ResilienceConfig:
    """Configuration for API resilience strategies."""

    def __init__(
        self,
        max_retries: int = 3,
        base_delay: float = 1.0,
        max_delay: float = 30.0,
        exponential_backoff: bool = True,
        jitter: bool = True,
        timeout: float = 30.0
    ):
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.exponential_backoff = exponential_backoff
        self.jitter = jitter
        self.timeout = timeout


class APIRetrier:
    """
    Retry mechanism for API operations with exponential backoff.

    Designed for African market conditions with intermittent connectivity.
    """

    def __init__(self, config: ResilienceConfig):
        self.config = config

    async def retry_async(
        self,
        operation: Callable[..., Any],
        *args,
        **kwargs
    ) -> Any:
        """
        Retry an async operation with exponential backoff.

        Args:
            operation: The async function to retry
            *args: Arguments for the operation
            **kwargs: Keyword arguments for the operation

        Returns:
            Result of the operation

        Raises:
            HTTPException: If all retries fail
        """
        last_exception = None

        for attempt in range(self.config.max_retries + 1):
            try:
                # Add timeout to the operation
                return await asyncio.wait_for(
                    operation(*args, **kwargs),
                    timeout=self.config.timeout
                )

            except asyncio.TimeoutError:
                last_exception = HTTPException(
                    status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                    detail="Operation timed out"
                )
                logger.warning(f"Operation timed out on attempt {attempt + 1}")

            except (OperationalError, DisconnectionError) as e:
                last_exception = HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Database connection error"
                )
                logger.warning(f"Database error on attempt {attempt + 1}: {e}")

            except RedisError as e:
                last_exception = HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Cache service unavailable"
                )
                logger.warning(f"Cache error on attempt {attempt + 1}: {e}")

            except httpx.TimeoutException as e:
                last_exception = HTTPException(
                    status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                    detail="External service timeout"
                )
                logger.warning(
                    f"External service timeout on attempt {attempt + 1}: {e}")

            except httpx.ConnectError as e:
                last_exception = HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="External service unavailable"
                )
                logger.warning(
                    f"External service connection error on attempt {attempt + 1}: {e}")

            except Exception as e:
                last_exception = HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Unexpected error: {str(e)}"
                )
                logger.error(f"Unexpected error on attempt {attempt + 1}: {e}")

            # If this was the last attempt, raise the exception
            if attempt == self.config.max_retries:
                break

            # Calculate delay for next attempt
            delay = self._calculate_delay(attempt)
            logger.info(f"Retrying in {delay} seconds...")
            await asyncio.sleep(delay)

        # All retries failed
        raise last_exception

    def _calculate_delay(self, attempt: int) -> float:
        """Calculate delay for retry with exponential backoff and jitter."""
        if self.config.exponential_backoff:
            delay = min(
                self.config.base_delay * (2 ** attempt),
                self.config.max_delay
            )
        else:
            delay = self.config.base_delay

        if self.config.jitter:
            # Add random jitter to prevent thundering herd
            import random
            jitter = random.uniform(0, 0.1 * delay)
            delay += jitter

        return delay


def resilient_api(
    max_retries: int = 3,
    base_delay: float = 1.0,
    timeout: float = 30.0
):
    """
    Decorator for making API endpoints resilient to connectivity issues.

    Args:
        max_retries: Maximum number of retry attempts
        base_delay: Base delay between retries in seconds
        timeout: Operation timeout in seconds
    """
    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            config = ResilienceConfig(
                max_retries=max_retries,
                base_delay=base_delay,
                timeout=timeout
            )
            retrier = APIRetrier(config)

            return await retrier.retry_async(func, *args, **kwargs)

        return wrapper
    return decorator


class GracefulFallback:
    """
    Provides graceful fallback mechanisms for API operations.

    Handles scenarios where primary operations fail but
    alternative responses can be provided.
    """

    @staticmethod
    async def with_fallback(
        primary_operation: Callable[..., Any],
        fallback_operation: Callable[..., Any],
        *args,
        **kwargs
    ) -> Any:
        """
        Execute primary operation with fallback if it fails.

        Args:
            primary_operation: The main operation to try
            fallback_operation: The fallback operation if primary fails
            *args: Arguments for operations
            **kwargs: Keyword arguments for operations

        Returns:
            Result from primary or fallback operation
        """
        try:
            return await primary_operation(*args, **kwargs)
        except Exception as e:
            logger.warning(f"Primary operation failed, using fallback: {e}")
            try:
                return await fallback_operation(*args, **kwargs)
            except Exception as fallback_error:
                logger.error(
                    f"Fallback operation also failed: {fallback_error}")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Service temporarily unavailable"
                )

    @staticmethod
    def cached_fallback(
        cache_key: str,
        cache_ttl: int = 300  # 5 minutes
    ):
        """
        Decorator for providing cached fallback responses.

        Args:
            cache_key: Key for caching the response
            cache_ttl: Time-to-live for cached data in seconds
        """
        def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
            @wraps(func)
            async def wrapper(*args, **kwargs):
                try:
                    # Try primary operation
                    result = await func(*args, **kwargs)

                    # Cache successful result
                    try:
                        from app.app.core.cache.redis_cache import redis_cache
                        await redis_cache.set(
                            cache_key,
                            result,
                            expire=cache_ttl
                        )
                    except Exception as cache_error:
                        logger.warning(
                            f"Failed to cache result: {cache_error}")

                    return result

                except Exception as e:
                    logger.warning(
                        f"Primary operation failed, checking cache: {e}")

                    # Try to get cached result
                    try:
                        from app.app.core.cache.redis_cache import redis_cache
                        cached_result = await redis_cache.get(cache_key)
                        if cached_result:
                            logger.info("Returning cached result")
                            return cached_result
                    except Exception as cache_error:
                        logger.warning(
                            f"Failed to get cached result: {cache_error}")

                    # No cache available, re-raise original error
                    raise
            return wrapper
        return decorator


class NetworkStatusMonitor:
    """
    Monitors network connectivity and provides status information.

    Used for adaptive API behavior based on network conditions.
    """

    def __init__(self):
        self.last_check = None
        self.is_online = True
        self.latency = 0.0

    async def check_connectivity(self) -> bool:
        """
        Check current network connectivity.

        Returns:
            True if network is available, False otherwise
        """
        try:
            # Simple connectivity check
            async with httpx.AsyncClient(timeout=5.0) as client:
                start_time = time.time()
                response = await client.get("https://httpbin.org/status/200")
                self.latency = time.time() - start_time

                self.is_online = response.status_code == 200
                self.last_check = datetime.utcnow()

                return self.is_online

        except Exception as e:
            logger.warning(f"Connectivity check failed: {e}")
            self.is_online = False
            self.last_check = datetime.utcnow()
            return False

    def get_network_status(self) -> dict:
        """
        Get current network status information.

        Returns:
            Dictionary with network status details
        """
        return {
            "is_online": self.is_online,
            "latency": self.latency,
            "last_check": self.last_check.isoformat() if self.last_check else None
        }


# Global instances
network_monitor = NetworkStatusMonitor()
default_retrier = APIRetrier(ResilienceConfig())
