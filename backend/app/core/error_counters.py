"""
Error counters for monitoring and metrics.
"""
from prometheus_client import Counter

# Counters for tracking errors
order_failures = Counter("order_failures", "Number of failed order creations")
payment_failures = Counter("payment_failures", "Number of failed payments")
