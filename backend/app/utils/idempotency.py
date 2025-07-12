import functools
import json
import uuid
from typing import Callable

from fastapi import Depends, HTTPException, Request, status
from redis import Redis

from backend.app.dependencies import get_redis


class IdempotencyKey:
    """
    Idempotency key handler for ensuring exactly-once request processing

    This helps prevent duplicate orders or payments in case of network issues or client retries.
    """

    def __init__(self, request: Request, redis: Redis = Depends(get_redis)):
        self.request = request
        self.redis = redis
        self.key = self._extract_key()

    def _extract_key(self) -> str:
        """Extract idempotency key from request header or generate one"""
        # Try to get from header (preferred)
        key = self.request.headers.get("Idempotency-Key")

        # If not found in header, try to get from request body
        if not key and self.request.method in ("POST", "PUT", "PATCH"):
            try:
                # This will only work if the body hasn't been consumed yet
                body = self.request.scope.get("body", b"{}")
                if body:
                    data = json.loads(body)
                    key = data.get("idempotency_key")
            except (json.JSONDecodeError, ValueError, KeyError):
                pass

        # If still no key, generate one
        if not key:
            key = str(uuid.uuid4())

        return key


def ensure_idempotent(key_ttl_seconds: int = 86400):
    """
    Decorator to ensure idempotency for API endpoints

    Args:
        key_ttl_seconds (int): How long to store the idempotency key in seconds
                              (default: 24 hours)
    """

    def decorator(func: Callable):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract idempotency key and redis from kwargs
            idempotency_key = kwargs.get("idempotency_key")
            redis = kwargs.get("redis")

            if not idempotency_key or not redis:
                # If we don't have the dependencies, just call the original function
                return await func(*args, **kwargs)

            # Create redis key
            redis_key = f"idempotent:{idempotency_key.key}"

            # Check if we've seen this key before
            result = redis.get(redis_key)
            if result:
                # We've seen this request before, return the cached result
                try:
                    cached_data = json.loads(result)
                    if cached_data.get("error"):
                        # If the original request resulted in an error, re-raise it
                        raise HTTPException(
                            status_code=cached_data.get("status_code", 500),
                            detail=cached_data.get("detail", "Unknown error"),
                        )
                    return cached_data.get("response")
                except json.JSONDecodeError:
                    # If we can't decode the cached result, proceed with the request
                    pass

            # Lock key while processing to prevent race conditions
            lock_key = f"{redis_key}:lock"
            if redis.get(lock_key):
                # Another request with this key is currently being processed
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A request with this idempotency key is already being processed",
                )

            # Set lock with a short TTL to prevent deadlocks
            redis.setex(lock_key, 30, "1")

            try:
                # Process the request
                response = await func(*args, **kwargs)

                # Cache the successful result
                redis.setex(
                    redis_key, key_ttl_seconds, json.dumps({"response": response})
                )

                return response
            except HTTPException as e:
                # Cache the error
                redis.setex(
                    redis_key,
                    key_ttl_seconds,
                    json.dumps(
                        {
                            "error": True,
                            "status_code": e.status_code,
                            "detail": e.detail,
                        }
                    ),
                )
                raise
            finally:
                # Release the lock
                redis.delete(lock_key)

        return wrapper

    return decorator
