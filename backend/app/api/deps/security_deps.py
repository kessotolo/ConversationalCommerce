import re
from datetime import datetime

import redis.asyncio as redis
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.app.core.auth import get_current_active_user
from app.app.core.config.settings import get_settings
from app.app.core.logging import logger
from app.app.api.deps import get_db

# Redis client for distributed rate limiting
redis_client = redis.from_url(settings.REDIS_URL)

# Rate limiting configuration
RATE_LIMIT_CONFIG = {
    # 10 requests per minute
    "payment:initialize": {"limit": 10, "window": 60},
    # 20 requests per minute
    "payment:verify": {"limit": 20, "window": 60},
    # 100 requests per minute (higher for webhooks)
    "payment:webhook": {"limit": 100, "window": 60},
    # 20 requests per minute
    "payment:settings": {"limit": 20, "window": 60},
    # Default 50 requests per minute
    "default": {"limit": 50, "window": 60},
}

# IP blacklist (normally this would be in a database or cache)
IP_BLACKLIST = set()

# Sensitive parameter patterns to redact from logs
SENSITIVE_PARAMS = [
    re.compile(r"card[_-]?number", re.I),
    re.compile(r"cvv|cvc|cv[cv]2", re.I),
    re.compile(r"expir[ey]", re.I),
    re.compile(r"secret[_-]?key", re.I),
    re.compile(r"password", re.I),
    re.compile(r"authorization", re.I),
    re.compile(r"api[_-]?key", re.I),
    re.compile(r"account[_-]?number", re.I),
    re.compile(r"token", re.I),
    re.compile(r"private[_-]?key", re.I),
    re.compile(r"access[_-]?token", re.I),
    re.compile(r"refresh[_-]?token", re.I),
    re.compile(r"client[_-]?secret", re.I),
    re.compile(r"encryption[_-]?key", re.I),
    re.compile(r"signature", re.I),
]

settings = get_settings()


async def verify_payment_api_key(
    api_key: str = None, request: Request = None, db: AsyncSession = Depends(get_db)
):
    """Verify a payment API key for external services (e.g. webhooks)"""
    if request and not api_key:
        # Try to get from header
        api_key = request.headers.get("X-API-Key")

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key is required",
            headers={"WWW-Authenticate": "ApiKey"},
        )

    # In a real implementation, validate against stored API keys
    # This is a simplified placeholder
    valid_api_key = settings.PAYMENT_API_KEY

    if api_key != valid_api_key:
        # Log potential API key abuse attempts
        logger.warning(
            f"Invalid API key attempt from IP: "
            f"{request.client.host if request else 'unknown'}"
        )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
            headers={"WWW-Authenticate": "ApiKey"},
        )

    return True


async def check_ip_blacklist(request: Request):
    """Check if IP address is blacklisted"""
    client_ip = request.client.host

    if client_ip in IP_BLACKLIST:
        logger.warning(f"Blocked request from blacklisted IP: {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Access denied"
        )

    # Check if IP is suspicious (e.g., Tor exit nodes, known proxy IPs)
    # In a real implementation, integrate with IP reputation services

    return True


async def check_rate_limit(
    request: Request, endpoint_key: str, db: AsyncSession = Depends(get_db)
) -> bool:
    """
    Check if the request exceeds rate limits using Redis-based rate limiting.

    Args:
        request: FastAPI request object
        endpoint_key: Key identifying the endpoint
        db: Database session

    Returns:
        bool: True if request is allowed, False otherwise

    Raises:
        HTTPException: If rate limit is exceeded
    """
    client_ip = request.client.host
    user_id = getattr(request.state, "user_id", None)

    # Get rate limit config
    config = RATE_LIMIT_CONFIG.get(endpoint_key, RATE_LIMIT_CONFIG["default"])
    limit = config["limit"]
    window = config["window"]

    # Check IP blacklist in Redis
    is_blacklisted = await redis_client.sismember("ip_blacklist", client_ip)
    if is_blacklisted:
        logger.warning(f"Blocked request from blacklisted IP: {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Access denied"
        )

    # Create rate limit key
    key = f"rate_limit:{endpoint_key}:{client_ip}:{user_id}"

    # Use Redis for distributed rate limiting
    current = await redis_client.get(key)
    if current is None:
        # First request in window
        await redis_client.setex(key, window, 1)
    else:
        current = int(current)
        if current >= limit:
            # Rate limit exceeded
            if current >= limit * 3:  # 3x over limit
                # Add to blacklist with expiration
                await redis_client.sadd("ip_blacklist", client_ip)
                # 1 hour blacklist
                await redis_client.expire("ip_blacklist", 3600)
                logger.warning(
                    f"IP blacklisted due to excessive requests: {client_ip}")

            logger.warning(
                f"Rate limit exceeded for {endpoint_key}: "
                f"IP={client_ip}, User={user_id}, Count={current}/{limit}"
            )

            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Try again in {window} seconds.",
            )

        # Increment counter
        await redis_client.incr(key)

    return True


def payment_security_checks(endpoint_key: str):
    """Combines multiple security checks for payment endpoints"""

    def security_dependency(request: Request, db: AsyncSession = Depends(get_db)):
        # Run security checks
        check_ip_blacklist(request)
        check_rate_limit(request, endpoint_key, db)

        # Log the request with sensitive data redacted
        log_payment_request(request, endpoint_key)

        return True

    return security_dependency


def log_payment_request(request: Request, endpoint_key: str):
    """Log payment request details with sensitive data redacted"""
    try:
        # Basic request info
        log_data = {
            "endpoint": endpoint_key,
            "method": request.method,
            "path": request.url.path,
            "ip": request.client.host,
            "user_agent": request.headers.get("user-agent", ""),
            "timestamp": datetime.utcnow().isoformat(),
        }

        # Redact sensitive headers
        headers = {}
        for key, value in request.headers.items():
            redacted = False
            for pattern in SENSITIVE_PARAMS:
                if pattern.search(key):
                    headers[key] = "****REDACTED****"
                    redacted = True
                    break

            if not redacted:
                headers[key] = value

        log_data["headers"] = headers

        # Log with appropriate level based on endpoint
        if endpoint_key.startswith("payment:webhook"):
            logger.info(f"Payment webhook request: {log_data}")
        else:
            logger.info(f"Payment request: {log_data}")

    except Exception as e:
        # Don't let logging failure impact the request
        logger.error(f"Error logging payment request: {str(e)}")


def verify_payment_signature(provider: str):
    """Verify webhook signature based on provider"""

    async def signature_check(request: Request):
        # payload = await request.body()  # Uncomment when implementing verification
        signature = None

        if provider.lower() == "paystack":
            signature = request.headers.get("x-paystack-signature")
            # Add signature verification logic for Paystack

        elif provider.lower() == "flutterwave":
            signature = request.headers.get("verif-hash")
            # Add signature verification logic for Flutterwave

        if not signature:
            logger.warning(f"Missing signature in {provider} webhook")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing webhook signature",
            )

        # In actual implementation, call provider-specific verification
        # from app.core.security.payment_security import verify_paystack_signature
        # result = verify_paystack_signature(payload, signature)

        # For demo, we're returning True
        # In production, do proper verification
        return True

    return signature_check


def requires_payment_admin(current_user=Depends(get_current_active_user)):
    """Check if user has payment admin privileges"""
    if not current_user.is_superuser and "payment_admin" not in current_user.roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions for payment administration",
        )
    return current_user
