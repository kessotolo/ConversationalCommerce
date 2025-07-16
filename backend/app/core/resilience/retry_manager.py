"""
Advanced Retry and Error Recovery Manager for Merchant Services.

Provides:
- Exponential backoff with jitter
- Circuit breaker pattern
- Graceful degradation
- Error classification and handling
- Retry policies per operation type
"""

import asyncio
import random
import time
import logging
from typing import Any, Callable, Dict, List, Optional, Type, Union
from dataclasses import dataclass
from enum import Enum
from functools import wraps
import traceback

logger = logging.getLogger(__name__)


class RetryStrategy(str, Enum):
    """Retry strategies for different scenarios."""
    EXPONENTIAL_BACKOFF = "exponential_backoff"
    LINEAR_BACKOFF = "linear_backoff"
    FIXED_DELAY = "fixed_delay"
    IMMEDIATE = "immediate"


class ErrorSeverity(str, Enum):
    """Error severity levels for classification."""
    CRITICAL = "critical"       # System-wide issues
    HIGH = "high"              # Service degradation
    MEDIUM = "medium"          # Recoverable errors
    LOW = "low"                # Minor issues


class CircuitState(str, Enum):
    """Circuit breaker states."""
    CLOSED = "closed"          # Normal operation
    OPEN = "open"              # Failing fast
    HALF_OPEN = "half_open"    # Testing recovery


@dataclass
class RetryConfig:
    """Configuration for retry behavior."""
    max_attempts: int = 3
    base_delay: float = 1.0
    max_delay: float = 60.0
    backoff_multiplier: float = 2.0
    jitter: bool = True
    strategy: RetryStrategy = RetryStrategy.EXPONENTIAL_BACKOFF
    retryable_exceptions: List[Type[Exception]] = None
    non_retryable_exceptions: List[Type[Exception]] = None


@dataclass
class CircuitBreakerConfig:
    """Configuration for circuit breaker."""
    failure_threshold: int = 5
    success_threshold: int = 3
    timeout: float = 60.0
    half_open_max_calls: int = 3


@dataclass
class ErrorContext:
    """Context information for error handling."""
    operation_name: str
    tenant_id: Optional[str] = None
    user_id: Optional[str] = None
    request_id: Optional[str] = None
    timestamp: float = None
    attempt_number: int = 1
    total_attempts: int = 1
    error_details: Dict[str, Any] = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = time.time()
        if self.error_details is None:
            self.error_details = {}


class MerchantRetryManager:
    """
    Advanced retry and error recovery manager for merchant services.

    Features:
    - Multiple retry strategies with configurable policies
    - Circuit breaker pattern for failing services
    - Error classification and severity assessment
    - Graceful degradation and fallback mechanisms
    - Comprehensive error logging and metrics
    """

    def __init__(self):
        # Retry configurations for different operations
        self._retry_configs: Dict[str, RetryConfig] = {}

        # Circuit breaker configurations
        self._circuit_configs: Dict[str, CircuitBreakerConfig] = {}
        self._circuit_states: Dict[str, CircuitState] = {}
        self._circuit_failures: Dict[str, int] = {}
        self._circuit_successes: Dict[str, int] = {}
        self._circuit_last_failure: Dict[str, float] = {}

        # Error statistics
        self._error_counts: Dict[str, int] = {}
        self._error_rates: Dict[str, float] = {}

        # Default configurations
        self._setup_default_configs()

    def _setup_default_configs(self) -> None:
        """Setup default retry and circuit breaker configurations."""
        # Default retry configurations for different operation types
        self._retry_configs.update({
            "database": RetryConfig(
                max_attempts=3,
                base_delay=0.1,
                max_delay=5.0,
                strategy=RetryStrategy.EXPONENTIAL_BACKOFF,
                retryable_exceptions=[
                    ConnectionError,
                    TimeoutError,
                    # Add database-specific exceptions
                ]
            ),
            "external_api": RetryConfig(
                max_attempts=5,
                base_delay=1.0,
                max_delay=30.0,
                strategy=RetryStrategy.EXPONENTIAL_BACKOFF,
                retryable_exceptions=[
                    ConnectionError,
                    TimeoutError,
                    # Add HTTP-specific exceptions
                ]
            ),
            "cache": RetryConfig(
                max_attempts=2,
                base_delay=0.05,
                max_delay=1.0,
                strategy=RetryStrategy.FIXED_DELAY,
                retryable_exceptions=[
                    ConnectionError,
                    TimeoutError,
                ]
            ),
            "auth": RetryConfig(
                max_attempts=2,
                base_delay=0.5,
                max_delay=2.0,
                strategy=RetryStrategy.LINEAR_BACKOFF,
                retryable_exceptions=[
                    ConnectionError,
                    TimeoutError,
                ]
            )
        })

        # Default circuit breaker configurations
        self._circuit_configs.update({
            "database": CircuitBreakerConfig(
                failure_threshold=3,
                success_threshold=2,
                timeout=30.0
            ),
            "external_api": CircuitBreakerConfig(
                failure_threshold=5,
                success_threshold=3,
                timeout=60.0
            ),
            "cache": CircuitBreakerConfig(
                failure_threshold=2,
                success_threshold=1,
                timeout=10.0
            )
        })

    def configure_retry(self, operation_type: str, config: RetryConfig) -> None:
        """Configure retry behavior for an operation type."""
        self._retry_configs[operation_type] = config
        logger.info(f"Configured retry for {operation_type}: {config}")

    def configure_circuit_breaker(self, service_name: str, config: CircuitBreakerConfig) -> None:
        """Configure circuit breaker for a service."""
        self._circuit_configs[service_name] = config
        self._circuit_states[service_name] = CircuitState.CLOSED
        self._circuit_failures[service_name] = 0
        self._circuit_successes[service_name] = 0
        logger.info(f"Configured circuit breaker for {service_name}: {config}")

    async def execute_with_retry(
        self,
        operation: Callable,
        operation_type: str = "default",
        context: Optional[ErrorContext] = None,
        fallback: Optional[Callable] = None,
        **kwargs
    ) -> Any:
        """
        Execute operation with retry logic and error handling.

        Args:
            operation: Function to execute
            operation_type: Type of operation for configuration lookup
            context: Error context for logging and metrics
            fallback: Fallback function if all retries fail
            **kwargs: Arguments to pass to the operation
        """
        config = self._retry_configs.get(operation_type, RetryConfig())

        if context is None:
            context = ErrorContext(
                operation_name=operation.__name__,
                total_attempts=config.max_attempts
            )

        last_exception = None

        for attempt in range(1, config.max_attempts + 1):
            context.attempt_number = attempt

            try:
                # Check circuit breaker
                if not self._is_circuit_closed(operation_type):
                    raise CircuitOpenError(
                        f"Circuit breaker open for {operation_type}")

                # Execute operation
                if asyncio.iscoroutinefunction(operation):
                    result = await operation(**kwargs)
                else:
                    result = operation(**kwargs)

                # Record success
                self._record_success(operation_type)

                # Log recovery if this was a retry
                if attempt > 1:
                    logger.info(
                        f"Operation {context.operation_name} succeeded on attempt {attempt}"
                    )

                return result

            except Exception as e:
                last_exception = e

                # Check if exception is retryable
                if not self._is_retryable_exception(e, config):
                    logger.error(f"Non-retryable exception: {e}")
                    self._record_failure(operation_type, context, e)
                    break

                # Record failure
                self._record_failure(operation_type, context, e)

                # Check if we should retry
                if attempt < config.max_attempts:
                    delay = self._calculate_delay(attempt, config)

                    logger.warning(
                        f"Operation {context.operation_name} failed (attempt {attempt}/{config.max_attempts}): {e}. "
                        f"Retrying in {delay:.2f}s"
                    )

                    await asyncio.sleep(delay)
                else:
                    logger.error(
                        f"Operation {context.operation_name} failed after {config.max_attempts} attempts: {e}"
                    )

        # All retries failed - try fallback
        if fallback:
            try:
                logger.info(f"Executing fallback for {context.operation_name}")
                if asyncio.iscoroutinefunction(fallback):
                    return await fallback(**kwargs)
                else:
                    return fallback(**kwargs)
            except Exception as fallback_error:
                logger.error(f"Fallback failed: {fallback_error}")

        # Raise the last exception
        if last_exception:
            raise last_exception

    def _is_retryable_exception(self, exception: Exception, config: RetryConfig) -> bool:
        """Check if an exception is retryable based on configuration."""
        # Check non-retryable exceptions first
        if config.non_retryable_exceptions:
            for exc_type in config.non_retryable_exceptions:
                if isinstance(exception, exc_type):
                    return False

        # Check retryable exceptions
        if config.retryable_exceptions:
            for exc_type in config.retryable_exceptions:
                if isinstance(exception, exc_type):
                    return True
            return False  # Not in retryable list

        # Default behavior: retry on common transient errors
        retryable_types = (
            ConnectionError,
            TimeoutError,
            OSError,
        )

        return isinstance(exception, retryable_types)

    def _calculate_delay(self, attempt: int, config: RetryConfig) -> float:
        """Calculate delay before next retry attempt."""
        if config.strategy == RetryStrategy.EXPONENTIAL_BACKOFF:
            delay = config.base_delay * \
                (config.backoff_multiplier ** (attempt - 1))
        elif config.strategy == RetryStrategy.LINEAR_BACKOFF:
            delay = config.base_delay * attempt
        elif config.strategy == RetryStrategy.FIXED_DELAY:
            delay = config.base_delay
        else:  # IMMEDIATE
            delay = 0

        # Apply maximum delay limit
        delay = min(delay, config.max_delay)

        # Add jitter to prevent thundering herd
        if config.jitter and delay > 0:
            jitter = random.uniform(0.1, 0.3) * delay
            delay += jitter

        return delay

    def _is_circuit_closed(self, service_name: str) -> bool:
        """Check if circuit breaker allows operations."""
        if service_name not in self._circuit_states:
            return True

        state = self._circuit_states[service_name]
        config = self._circuit_configs.get(
            service_name, CircuitBreakerConfig())

        if state == CircuitState.CLOSED:
            return True
        elif state == CircuitState.OPEN:
            # Check if timeout has passed
            last_failure = self._circuit_last_failure.get(service_name, 0)
            if time.time() - last_failure > config.timeout:
                self._circuit_states[service_name] = CircuitState.HALF_OPEN
                self._circuit_successes[service_name] = 0
                logger.info(
                    f"Circuit breaker for {service_name} moved to HALF_OPEN")
                return True
            return False
        else:  # HALF_OPEN
            # Allow limited calls to test recovery
            success_count = self._circuit_successes.get(service_name, 0)
            return success_count < config.half_open_max_calls

    def _record_success(self, service_name: str) -> None:
        """Record successful operation for circuit breaker."""
        if service_name not in self._circuit_states:
            return

        state = self._circuit_states[service_name]
        config = self._circuit_configs.get(
            service_name, CircuitBreakerConfig())

        if state == CircuitState.HALF_OPEN:
            self._circuit_successes[service_name] += 1

            if self._circuit_successes[service_name] >= config.success_threshold:
                self._circuit_states[service_name] = CircuitState.CLOSED
                self._circuit_failures[service_name] = 0
                logger.info(
                    f"Circuit breaker for {service_name} moved to CLOSED")
        elif state == CircuitState.CLOSED:
            # Reset failure count on success
            self._circuit_failures[service_name] = 0

    def _record_failure(self, service_name: str, context: ErrorContext, exception: Exception) -> None:
        """Record failed operation for circuit breaker and metrics."""
        # Update error counts
        error_key = f"{service_name}:{type(exception).__name__}"
        self._error_counts[error_key] = self._error_counts.get(
            error_key, 0) + 1

        # Circuit breaker logic
        if service_name not in self._circuit_states:
            return

        config = self._circuit_configs.get(
            service_name, CircuitBreakerConfig())
        self._circuit_failures[service_name] += 1
        self._circuit_last_failure[service_name] = time.time()

        # Check if we should open the circuit
        if (self._circuit_states[service_name] != CircuitState.OPEN and
                self._circuit_failures[service_name] >= config.failure_threshold):

            self._circuit_states[service_name] = CircuitState.OPEN
            logger.error(
                f"Circuit breaker for {service_name} opened after "
                f"{self._circuit_failures[service_name]} failures"
            )

        # Log error with context
        self._log_error(context, exception)

    def _log_error(self, context: ErrorContext, exception: Exception) -> None:
        """Log error with comprehensive context."""
        error_details = {
            "operation": context.operation_name,
            "tenant_id": context.tenant_id,
            "user_id": context.user_id,
            "request_id": context.request_id,
            "attempt": context.attempt_number,
            "total_attempts": context.total_attempts,
            "exception_type": type(exception).__name__,
            "exception_message": str(exception),
            "traceback": traceback.format_exc(),
            "timestamp": context.timestamp
        }

        # Determine log level based on attempt number
        if context.attempt_number == 1:
            logger.warning(f"Operation failed: {error_details}")
        elif context.attempt_number < context.total_attempts:
            logger.info(f"Retry attempt failed: {error_details}")
        else:
            logger.error(f"All retry attempts failed: {error_details}")

    def get_circuit_status(self) -> Dict[str, Any]:
        """Get current circuit breaker status."""
        status = {}

        for service_name in self._circuit_states:
            status[service_name] = {
                "state": self._circuit_states[service_name].value,
                "failures": self._circuit_failures.get(service_name, 0),
                "successes": self._circuit_successes.get(service_name, 0),
                "last_failure": self._circuit_last_failure.get(service_name)
            }

        return status

    def get_error_statistics(self) -> Dict[str, Any]:
        """Get error statistics and metrics."""
        return {
            "error_counts": dict(self._error_counts),
            "error_rates": dict(self._error_rates),
            "circuit_status": self.get_circuit_status()
        }

    def reset_circuit(self, service_name: str) -> bool:
        """Manually reset a circuit breaker."""
        if service_name in self._circuit_states:
            self._circuit_states[service_name] = CircuitState.CLOSED
            self._circuit_failures[service_name] = 0
            self._circuit_successes[service_name] = 0
            logger.info(f"Circuit breaker for {service_name} manually reset")
            return True
        return False

    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on all services with circuit breakers."""
        health_status = {}

        for service_name in self._circuit_states:
            state = self._circuit_states[service_name]
            failures = self._circuit_failures.get(service_name, 0)

            if state == CircuitState.CLOSED and failures == 0:
                health_status[service_name] = "healthy"
            elif state == CircuitState.CLOSED and failures > 0:
                health_status[service_name] = "degraded"
            elif state == CircuitState.HALF_OPEN:
                health_status[service_name] = "recovering"
            else:  # OPEN
                health_status[service_name] = "unhealthy"

        return health_status


class CircuitOpenError(Exception):
    """Exception raised when circuit breaker is open."""
    pass


# Global retry manager instance
retry_manager = MerchantRetryManager()


# Decorators for easy integration
def with_retry(
    operation_type: str = "default",
    max_attempts: int = 3,
    base_delay: float = 1.0,
    strategy: RetryStrategy = RetryStrategy.EXPONENTIAL_BACKOFF
):
    """Decorator for adding retry logic to functions."""
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Configure retry if not already configured
            if operation_type not in retry_manager._retry_configs:
                config = RetryConfig(
                    max_attempts=max_attempts,
                    base_delay=base_delay,
                    strategy=strategy
                )
                retry_manager.configure_retry(operation_type, config)

            # Create context
            context = ErrorContext(operation_name=func.__name__)

            return await retry_manager.execute_with_retry(
                func, operation_type, context, *args, **kwargs
            )

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            # For sync functions, we'd need a different approach
            return func(*args, **kwargs)

        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper

    return decorator


def with_circuit_breaker(service_name: str, failure_threshold: int = 5):
    """Decorator for adding circuit breaker to functions."""
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Configure circuit breaker if not already configured
            if service_name not in retry_manager._circuit_configs:
                config = CircuitBreakerConfig(
                    failure_threshold=failure_threshold)
                retry_manager.configure_circuit_breaker(service_name, config)

            # Check circuit breaker before execution
            if not retry_manager._is_circuit_closed(service_name):
                raise CircuitOpenError(
                    f"Circuit breaker open for {service_name}")

            try:
                if asyncio.iscoroutinefunction(func):
                    result = await func(*args, **kwargs)
                else:
                    result = func(*args, **kwargs)

                retry_manager._record_success(service_name)
                return result

            except Exception as e:
                context = ErrorContext(operation_name=func.__name__)
                retry_manager._record_failure(service_name, context, e)
                raise

        return async_wrapper

    return decorator
