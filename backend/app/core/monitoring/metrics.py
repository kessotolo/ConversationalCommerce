"""
Core metrics collection module for system-wide observability.
Provides centralized metrics gathering for performance, resource utilization,
and application-specific metrics.
"""
from typing import Dict, List, Optional, Any
import time
import threading
import logging
import platform
import os
import psutil
from prometheus_client import (
    Counter, Gauge, Histogram, Summary,
    CollectorRegistry, push_to_gateway,
    REGISTRY, start_http_server
)
from fastapi import Request, Response

from app.core.config.settings import get_settings

logger = logging.getLogger(__name__)

# Initialize metrics
# System metrics
cpu_usage = Gauge('system_cpu_usage_percent', 'CPU usage percentage')
memory_usage = Gauge('system_memory_usage_bytes', 'Memory usage in bytes')
memory_total = Gauge('system_memory_total_bytes', 'Total memory in bytes')
disk_usage = Gauge('system_disk_usage_bytes',
                   'Disk usage in bytes', ['mount_point'])
disk_total = Gauge('system_disk_total_bytes',
                   'Total disk space in bytes', ['mount_point'])
process_count = Gauge('system_process_count', 'Number of running processes')
open_file_descriptors = Gauge(
    'system_open_file_descriptors', 'Number of open file descriptors')

# Application metrics
http_request_total = Counter(
    'http_request_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status_code']
)
http_request_duration = Histogram(
    'http_request_duration_seconds',
    'HTTP request latency in seconds',
    ['method', 'endpoint'],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.075,
             0.1, 0.25, 0.5, 0.75, 1.0, 2.5, 5.0)
)
active_users = Gauge('app_active_users',
                     'Number of active users', ['tenant_id'])
active_sessions = Gauge('app_active_sessions', 'Number of active sessions')
failed_logins = Counter('app_failed_logins_total',
                        'Number of failed login attempts', ['tenant_id'])
successful_logins = Counter(
    'app_successful_logins_total', 'Number of successful logins', ['tenant_id'])

# Database metrics
db_connection_pool_size = Gauge(
    'db_connection_pool_size', 'Database connection pool size')
db_connection_pool_used = Gauge(
    'db_connection_pool_used', 'Database connections in use')
db_query_duration = Histogram(
    'db_query_duration_seconds',
    'Database query duration in seconds',
    ['query_type'],
    buckets=(0.001, 0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1.0)
)
db_errors = Counter('db_errors_total', 'Database errors', ['error_type'])

# Business metrics
order_total = Counter('business_order_total',
                      'Total orders', ['tenant_id', 'status'])
payment_total = Counter('business_payment_total', 'Total payments', [
                        'tenant_id', 'provider', 'status'])
user_registration = Counter(
    'business_user_registration_total', 'User registrations', ['tenant_id'])
conversation_started = Counter(
    'business_conversation_started_total', 'Conversations started', ['tenant_id'])
conversation_completed = Counter(
    'business_conversation_completed_total', 'Conversations completed', ['tenant_id'])
conversation_abandoned = Counter(
    'business_conversation_abandoned_total', 'Conversations abandoned', ['tenant_id'])

# Resource utilization tracking
api_rate_limit_hit = Counter(
    'api_rate_limit_hit_total', 'API rate limit hits', ['endpoint'])
error_rate = Counter('error_rate_total', 'Error count',
                     ['error_type', 'endpoint'])

# Cache metrics
cache_hit = Counter('cache_hit_total', 'Cache hits', ['cache_type'])
cache_miss = Counter('cache_miss_total', 'Cache misses', ['cache_type'])
cache_size = Gauge('cache_size_bytes', 'Cache size in bytes', ['cache_type'])


class MetricsCollector:
    """Main metrics collector class for system-wide observability"""

    def __init__(self):
        self._system_metrics_thread = None
        self._running = False
        self._collection_interval = 15  # seconds
        settings = get_settings()
        self.push_gateway_url = getattr(
            settings, 'PROMETHEUS_PUSHGATEWAY_URL', None)
        self.enable_metrics_endpoint = getattr(
            settings, 'ENABLE_METRICS_ENDPOINT', False)
        self.metrics_port = getattr(settings, 'METRICS_PORT', 9090)
        self._tenant_active_users: Dict[str, int] = {}

    def start(self):
        """Start the metrics collection"""
        if self._running:
            return

        logger.info("Starting metrics collection")
        self._running = True

        # Start system metrics collection thread
        self._system_metrics_thread = threading.Thread(
            target=self._collect_system_metrics_loop,
            daemon=True
        )
        self._system_metrics_thread.start()

        # Start HTTP server for metrics endpoint if enabled
        if self.enable_metrics_endpoint:
            try:
                start_http_server(self.metrics_port)
                logger.info(
                    f"Metrics HTTP server started on port {self.metrics_port}")
            except Exception as e:
                logger.error(f"Failed to start metrics HTTP server: {e}")

    def stop(self):
        """Stop the metrics collection"""
        logger.info("Stopping metrics collection")
        self._running = False
        if self._system_metrics_thread:
            self._system_metrics_thread.join(timeout=5.0)

    def _collect_system_metrics_loop(self):
        """Background loop to collect system metrics"""
        while self._running:
            try:
                self._collect_system_metrics()

                # Push to gateway if configured
                if self.push_gateway_url:
                    try:
                        push_to_gateway(
                            self.push_gateway_url,
                            job='conversational_commerce_backend',
                            registry=REGISTRY
                        )
                    except Exception as e:
                        logger.error(f"Failed to push metrics to gateway: {e}")

                time.sleep(self._collection_interval)
            except Exception as e:
                logger.error(f"Error collecting system metrics: {e}")
                time.sleep(60)  # Back off on error

    def _collect_system_metrics(self):
        """Collect system metrics"""
        try:
            # CPU metrics
            cpu_usage.set(psutil.cpu_percent())

            # Memory metrics
            mem = psutil.virtual_memory()
            memory_usage.set(mem.used)
            memory_total.set(mem.total)

            # Disk metrics
            for part in psutil.disk_partitions(all=False):
                if os.name == 'nt' and ('cdrom' in part.opts or part.fstype == ''):
                    # Skip CD-ROM drives on Windows
                    continue
                usage = psutil.disk_usage(part.mountpoint)
                disk_usage.labels(mount_point=part.mountpoint).set(usage.used)
                disk_total.labels(mount_point=part.mountpoint).set(usage.total)

            # Process metrics
            process_count.set(len(psutil.pids()))

            # File descriptors (Unix-like systems only)
            if os.name != 'nt':  # Not Windows
                open_file_descriptors.set(len(psutil.Process().open_files()))

        except Exception as e:
            logger.error(f"Error collecting system metrics: {e}")

    def track_request(self, request: Request, response: Response, duration: float):
        """Track HTTP request metrics"""
        method = request.method
        endpoint = request.url.path
        status_code = response.status_code

        # Increment request counter
        http_request_total.labels(
            method=method,
            endpoint=endpoint,
            status_code=status_code
        ).inc()

        # Record request duration
        http_request_duration.labels(
            method=method,
            endpoint=endpoint
        ).observe(duration)

        # Track errors
        if 400 <= status_code < 600:
            error_rate.labels(
                error_type=f"http_{status_code}",
                endpoint=endpoint
            ).inc()

    def track_db_query(self, query_type: str, duration: float):
        """Track database query metrics"""
        db_query_duration.labels(query_type=query_type).observe(duration)

    def track_db_error(self, error_type: str):
        """Track database error"""
        db_errors.labels(error_type=error_type).inc()

    def update_db_pool_stats(self, size: int, used: int):
        """Update database connection pool stats"""
        db_connection_pool_size.set(size)
        db_connection_pool_used.set(used)

    def track_order(self, tenant_id: str, status: str):
        """Track order creation"""
        order_total.labels(tenant_id=tenant_id, status=status).inc()

    def track_payment(self, tenant_id: str, provider: str, status: str):
        """Track payment"""
        payment_total.labels(tenant_id=tenant_id,
                             provider=provider, status=status).inc()

    def track_user_registration(self, tenant_id: str):
        """Track user registration"""
        user_registration.labels(tenant_id=tenant_id).inc()

    def track_login(self, tenant_id: str, success: bool):
        """Track login attempt"""
        if success:
            successful_logins.labels(tenant_id=tenant_id).inc()
        else:
            failed_logins.labels(tenant_id=tenant_id).inc()

    def update_active_users(self, tenant_id: str, count: int):
        """Update active users count"""
        self._tenant_active_users[tenant_id] = count
        active_users.labels(tenant_id=tenant_id).set(count)

    def update_active_sessions(self, count: int):
        """Update active sessions count"""
        active_sessions.set(count)

    def track_conversation(self, tenant_id: str, event_type: str):
        """Track conversation events"""
        if event_type == "started":
            conversation_started.labels(tenant_id=tenant_id).inc()
        elif event_type == "completed":
            conversation_completed.labels(tenant_id=tenant_id).inc()
        elif event_type == "abandoned":
            conversation_abandoned.labels(tenant_id=tenant_id).inc()

    def track_cache_event(self, cache_type: str, hit: bool):
        """Track cache hit/miss"""
        if hit:
            cache_hit.labels(cache_type=cache_type).inc()
        else:
            cache_miss.labels(cache_type=cache_type).inc()

    def update_cache_size(self, cache_type: str, size_bytes: int):
        """Update cache size"""
        cache_size.labels(cache_type=cache_type).set(size_bytes)


# Create global instance
metrics_collector = MetricsCollector()


# FastAPI middleware for request tracking
async def metrics_middleware(request: Request, call_next):
    """FastAPI middleware to track request metrics"""
    start_time = time.time()

    try:
        response = await call_next(request)
        duration = time.time() - start_time

        metrics_collector.track_request(request, response, duration)

        return response
    except Exception as e:
        duration = time.time() - start_time
        logger.error(f"Error processing request: {e}")

        # Create a Response object for tracking
        response = Response(
            content=str(e),
            status_code=500
        )
        metrics_collector.track_request(request, response, duration)

        raise


def setup_metrics():
    """Initialize metrics collection"""
    metrics_collector.start()


def get_system_info() -> Dict[str, Any]:
    """Get detailed system information for dashboard"""
    try:
        info = {
            "platform": platform.system(),
            "platform_release": platform.release(),
            "platform_version": platform.version(),
            "architecture": platform.machine(),
            "processor": platform.processor(),
            "hostname": platform.node(),
            "python_version": platform.python_version(),
            "cpu_count": psutil.cpu_count(),
            "cpu_usage_percent": psutil.cpu_percent(interval=1),
            "memory": {
                "total": psutil.virtual_memory().total,
                "available": psutil.virtual_memory().available,
                "used": psutil.virtual_memory().used,
                "percent": psutil.virtual_memory().percent,
            },
            "disk": {},
            "network": {
                "interfaces": [],
                "connections": len(psutil.net_connections()),
            },
            "boot_time": psutil.boot_time(),
        }

        # Get disk information
        for part in psutil.disk_partitions(all=False):
            if os.name == 'nt' and ('cdrom' in part.opts or part.fstype == ''):
                # Skip CD-ROM drives on Windows
                continue

            usage = psutil.disk_usage(part.mountpoint)
            info["disk"][part.mountpoint] = {
                "total": usage.total,
                "used": usage.used,
                "free": usage.free,
                "percent": usage.percent,
                "fstype": part.fstype,
                "opts": part.opts,
            }

        # Get network interfaces
        for nic_name, nic_stats in psutil.net_if_stats().items():
            nic_addr = psutil.net_if_addrs().get(nic_name, [])
            addresses = []

            for addr in nic_addr:
                addresses.append({
                    "address": addr.address,
                    "netmask": addr.netmask,
                    "broadcast": addr.broadcast,
                    "ptp": addr.ptp,
                    "family": str(addr.family),
                })

            info["network"]["interfaces"].append({
                "name": nic_name,
                "isup": nic_stats.isup,
                "duplex": str(nic_stats.duplex),
                "speed": nic_stats.speed,
                "mtu": nic_stats.mtu,
                "addresses": addresses,
            })

        return info
    except Exception as e:
        logger.error(f"Error getting system info: {e}")
        return {"error": str(e)}


def get_metrics_snapshot() -> Dict[str, Any]:
    """Get current metrics snapshot for dashboard"""
    try:
        # Get metrics data for dashboard
        return {
            "system": {
                "cpu_usage": psutil.cpu_percent(interval=1),
                "memory_usage_percent": psutil.virtual_memory().percent,
                "disk_usage_percent": psutil.disk_usage('/').percent,
                "process_count": len(psutil.pids()),
            },
            "application": {
                "active_users_total": sum(metrics_collector._tenant_active_users.values()),
                "active_users_by_tenant": metrics_collector._tenant_active_users,
                "active_sessions": active_sessions._value.get(),
            },
            # Other metrics would be fetched from Prometheus when the dashboard
            # integrates with the Prometheus API
        }
    except Exception as e:
        logger.error(f"Error getting metrics snapshot: {e}")
        return {"error": str(e)}
