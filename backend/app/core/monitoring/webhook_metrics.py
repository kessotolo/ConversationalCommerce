from prometheus_client import Counter, Histogram, Gauge
import time

# Track webhook events received
webhook_received_total = Counter(
    'webhook_received_total', 
    'Total number of webhooks received',
    ['provider']  # paystack, mpesa, etc.
)

# Track webhook processing results
webhook_processed_total = Counter(
    'webhook_processed_total', 
    'Total number of webhooks processed',
    ['provider', 'result']  # result: success, failed, duplicate
)

# Track webhook processing time
webhook_processing_duration = Histogram(
    'webhook_processing_duration_seconds',
    'Time taken to process webhook',
    ['provider'],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0, 7.5, 10.0)
)

# Track age of oldest unprocessed webhook
webhook_queue_age = Gauge(
    'webhook_queue_age_seconds',
    'Age of the oldest unprocessed webhook in seconds',
    ['provider']
)

# Track webhook queue length
webhook_queue_length = Gauge(
    'webhook_queue_length',
    'Number of webhooks in processing queue',
    ['provider']
)


class WebhookMetrics:
    """Handler for tracking and recording webhook metrics"""

    @staticmethod
    def record_received(provider: str) -> None:
        """Record that a webhook was received"""
        webhook_received_total.labels(provider=provider).inc()

    @staticmethod
    def record_processed(provider: str, result: str) -> None:
        """Record that a webhook was processed with result"""
        webhook_processed_total.labels(provider=provider, result=result).inc()

    @staticmethod
    def track_processing_time(provider: str):
        """Context manager to track webhook processing time"""
        class TimerContextManager:
            def __enter__(self):
                self.start_time = time.time()
                return self

            def __exit__(self, exc_type, exc_val, exc_tb):
                duration = time.time() - self.start_time
                webhook_processing_duration.labels(provider=provider).observe(duration)

        return TimerContextManager()

    @staticmethod
    def update_queue_metrics(provider: str, queue_length: int, oldest_age_seconds: float = None) -> None:
        """Update queue metrics for a provider"""
        webhook_queue_length.labels(provider=provider).set(queue_length)
        
        if oldest_age_seconds is not None:
            webhook_queue_age.labels(provider=provider).set(oldest_age_seconds)
