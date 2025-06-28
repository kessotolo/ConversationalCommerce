import asyncio
from typing import Any, Callable, Tuple, Type


async def with_retry(
    func: Callable,
    retry_count: int = 3,
    exceptions: Tuple[Type[BaseException], ...] = (Exception,),
    args: Tuple = (),
    kwargs: dict = None,
    delay: float = 0.5,
    backoff: float = 2.0,
) -> Any:
    """
    Retry an async function up to retry_count times on specified exceptions.
    Args:
        func: The async function to call.
        retry_count: Number of retries.
        exceptions: Exception types to catch and retry on.
        args: Positional arguments for the function.
        kwargs: Keyword arguments for the function.
        delay: Initial delay between retries (seconds).
        backoff: Multiplier for delay after each failure.
    Returns:
        Result of the function if successful.
    Raises:
        The last exception if all retries fail.
    """
    if kwargs is None:
        kwargs = {}
    attempt = 0
    current_delay = delay
    while attempt < retry_count:
        try:
            return await func(*args, **kwargs)
        except exceptions:
            attempt += 1
            if attempt >= retry_count:
                raise
            await asyncio.sleep(current_delay)
            current_delay *= backoff
