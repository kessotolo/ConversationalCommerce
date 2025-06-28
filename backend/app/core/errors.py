from prometheus_client import Counter

order_failures = Counter("order_failures", "Number of failed order creations")
payment_failures = Counter("payment_failures", "Number of failed payments")
