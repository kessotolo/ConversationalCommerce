# Backend Monitoring Guide

## Overview

This guide documents the monitoring, observability, and alerting system implemented in the Conversational Commerce backend. It covers Prometheus metrics, Sentry error tracking, logging, and alert configurations.

## Monitoring Architecture

The backend monitoring system is built on these components:

1. **Prometheus Metrics**: For system and business metrics
2. **Sentry Integration**: For error tracking and performance monitoring
3. **Structured Logging**: Using Python's logging module with JSON formatting
4. **Health Check Endpoints**: For service availability monitoring
5. **Alerting Rules**: For proactive notification of issues

## Prometheus Metrics

### Core Metrics

The backend exposes Prometheus metrics at `/metrics` endpoint with these key metrics:

```python
from prometheus_client import Counter, Histogram, Gauge

# Request metrics
http_requests_total = Counter(
    'http_requests_total',
    'Total HTTP Requests',
    ['method', 'endpoint', 'status']
)

http_request_duration_seconds = Histogram(
    'http_request_duration_seconds',
    'HTTP Request Duration in seconds',
    ['method', 'endpoint']
)

# Database metrics
db_connection_pool_size = Gauge(
    'db_connection_pool_size',
    'Database connection pool size'
)

db_query_duration_seconds = Histogram(
    'db_query_duration_seconds',
    'Database query duration in seconds',
    ['operation', 'table']
)

# Business metrics
orders_created_total = Counter(
    'orders_created_total',
    'Total orders created',
    ['tenant_id', 'channel']
)

payments_processed_total = Counter(
    'payments_processed_total',
    'Total payments processed',
    ['tenant_id', 'provider', 'status']
)
```

### FastAPI Middleware for Request Metrics

```python
@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    start_time = time.time()

    response = await call_next(request)

    # Record request duration
    duration = time.time() - start_time
    http_request_duration_seconds.labels(
        method=request.method,
        endpoint=request.url.path
    ).observe(duration)

    # Record request count
    http_requests_total.labels(
        method=request.method,
        endpoint=request.url.path,
        status=response.status_code
    ).inc()

    return response
```

### Business Metrics in Services

```python
# In OrderService
async def create_order(self, order_data: OrderCreate) -> Order:
    # Business logic...

    # Record metric
    orders_created_total.labels(
        tenant_id=str(order.tenant_id),
        channel=order_data.channel or "web"
    ).inc()

    return order
```

## Sentry Integration

### Setup and Configuration

Sentry is configured in the application startup:

```python
import sentry_sdk
from sentry_sdk.integrations.asgi import SentryAsgiMiddleware
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

def configure_sentry(app: FastAPI):
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        traces_sample_rate=0.2,
        integrations=[
            SqlalchemyIntegration(),
        ],
    )

    app = SentryAsgiMiddleware(app)
    return app
```

### Error Handling and Context

Custom context is added to Sentry events:

```python
from sentry_sdk import configure_scope

async def process_payment(payment_id: str, data: dict):
    with configure_scope() as scope:
        scope.set_tag("payment_provider", data.get("provider"))
        scope.set_user({"id": data.get("user_id")})
        scope.set_context("payment_data", {
            "payment_id": payment_id,
            "amount": data.get("amount"),
            "currency": data.get("currency")
        })

        try:
            # Payment processing logic
            result = await payment_service.process(payment_id, data)
            return result
        except Exception as e:
            # Additional context for this specific error
            scope.set_extra("payment_state", "failed")
            scope.set_extra("error_details", str(e))
            raise
```

## Structured Logging

### Configuration

```python
import json
import logging
from pythonjsonlogger import jsonlogger

def configure_logging():
    log_handler = logging.StreamHandler()
    formatter = jsonlogger.JsonFormatter(
        fmt="%(asctime)s %(name)s %(levelname)s %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S%z"
    )
    log_handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.addHandler(log_handler)
    root_logger.setLevel(settings.LOG_LEVEL)

    # Third-party loggers
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("uvicorn").setLevel(logging.INFO)
```

### Business Event Logging

```python
logger = logging.getLogger(__name__)

async def update_order_status(self, order: Order, new_status: OrderStatus):
    old_status = order.status

    # Structured log entry
    logger.info("Order status update", extra={
        "order_id": order.id,
        "tenant_id": order.tenant_id,
        "old_status": old_status,
        "new_status": new_status.value,
        "event": "order_status_change"
    })

    # Business logic...
```

## Health Check Endpoints

Health check endpoints are available for monitoring service health:

```python
@app.get("/health")
async def health_check():
    """Basic health check."""
    return {"status": "ok"}

@app.get("/health/db")
async def db_health_check(db: AsyncSession = Depends(get_db)):
    """Database health check."""
    try:
        # Test query
        await db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "database": str(e)}
        )
```

## Alert Configuration

### Prometheus Alert Rules

```yaml
groups:
  - name: ConversationalCommerce
    rules:
      - alert: HighErrorRate
        expr: sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: 'High error rate detected'
          description: 'Error rate is {{ $value | humanizePercentage }} for the past 5 minutes'

      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'Slow response times detected'
          description: '95th percentile of response time is {{ $value }} seconds'

      - alert: PaymentFailureRate
        expr: sum(rate(payments_processed_total{status="failed"}[15m])) / sum(rate(payments_processed_total[15m])) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: 'High payment failure rate'
          description: 'Payment failure rate is {{ $value | humanizePercentage }} for the past 15 minutes'
```

### WhatsApp Alert Integration

The system sends critical alerts via WhatsApp using the WhatsApp Business API:

```python
from app.services.notification import WhatsAppService

async def send_monitoring_alert(alert_type: str, message: str, severity: str):
    # Get tenant owner phone from tenant settings
    tenant_settings = await settings_service.get_tenant_settings(tenant_id)
    owner_phone = tenant_settings.owner_phone

    if not owner_phone:
        logger.error("Cannot send alert: No owner phone configured")
        return

    # Format alert message
    alert_message = f"🔔 *{severity.upper()} ALERT*: {alert_type}\n\n{message}"

    # Send via WhatsApp
    whatsapp_service = WhatsAppService()
    await whatsapp_service.send_message(
        to=owner_phone,
        text=alert_message,
        message_type="ALERT"
    )

    logger.info(f"Alert sent to {owner_phone}", extra={
        "alert_type": alert_type,
        "severity": severity
    })
```

## Monitoring Dashboard

### Grafana Integration

The monitoring system includes pre-configured Grafana dashboards:

1. **System Dashboard**: Server resources, request rates, error rates
2. **Business Dashboard**: Orders, payments, user activity
3. **Performance Dashboard**: Response times, database metrics

### Dashboard Configuration

Example Grafana dashboard JSON for order monitoring:

```json
{
  "annotations": {
    "list": []
  },
  "editable": true,
  "panels": [
    {
      "datasource": "Prometheus",
      "fieldConfig": {
        "defaults": {},
        "overrides": []
      },
      "gridPos": {
        "h": 8,
        "w": 12,
        "x": 0,
        "y": 0
      },
      "id": 1,
      "options": {},
      "title": "Orders Created",
      "type": "timeseries",
      "targets": [
        {
          "expr": "sum(increase(orders_created_total[24h])) by (channel)",
          "legendFormat": "{{channel}}",
          "refId": "A"
        }
      ]
    }
  ],
  "refresh": "10s",
  "schemaVersion": 30,
  "title": "Order Monitoring",
  "uid": "orders-dashboard",
  "version": 1
}
```

## Implementing Custom Metrics

### Adding Business Metrics

To add new business metrics:

1. Define the metric:

```python
from prometheus_client import Counter

# New business metric
product_views_total = Counter(
    'product_views_total',
    'Total product views',
    ['tenant_id', 'product_id', 'channel']
)
```

2. Instrument your code:

```python
async def view_product(tenant_id: int, product_id: int, channel: str = "web"):
    # Business logic...

    # Record metric
    product_views_total.labels(
        tenant_id=str(tenant_id),
        product_id=str(product_id),
        channel=channel
    ).inc()
```

### Custom Histograms

For timing operations:

```python
from prometheus_client import Histogram
import time

payment_processing_duration = Histogram(
    'payment_processing_duration_seconds',
    'Payment processing duration in seconds',
    ['provider']
)

async def process_payment(provider: str, payment_data: dict):
    start = time.time()

    try:
        # Payment processing logic...
        result = await payment_provider.process(payment_data)
        return result
    finally:
        duration = time.time() - start
        payment_processing_duration.labels(provider=provider).observe(duration)
```

## Best Practices

1. **Consistent Naming**: Use consistent naming conventions for metrics
2. **Selective Instrumentation**: Instrument critical paths, not everything
3. **Contextual Logging**: Include relevant context in log messages
4. **Structured Formats**: Use structured logging for easier parsing
5. **Actionable Alerts**: Configure alerts only for actionable conditions
6. **Logical Grouping**: Group related metrics for easier dashboard creation
7. **Tag Cardinality**: Avoid high cardinality labels in metrics
8. **Error Correlation**: Use request IDs for correlating errors across services

## Troubleshooting

### Common Issues

1. **Missing Metrics**: Ensure the `/metrics` endpoint is accessible
2. **High Cardinality**: Check for exploding label values
3. **Alert Fatigue**: Adjust thresholds for noisy alerts
4. **Memory Usage**: Monitor metric memory consumption
5. **Log Volume**: Adjust log levels to manage volume
