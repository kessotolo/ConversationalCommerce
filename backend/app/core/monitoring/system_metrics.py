"""
System Metrics Collector

Provides real-time system metrics for monitoring and behavior analysis.
Collects CPU, memory, disk, network, and connection metrics.
"""

import asyncio
import logging
import time
from typing import Dict, Any, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class SystemMetricsCollector:
    """Collects real-time system metrics for monitoring and analysis."""

    def __init__(self):
        self._last_collection = None
        self._cached_metrics = {}
        self._cache_duration = 5.0  # Cache metrics for 5 seconds

    async def collect_current_metrics(self) -> Dict[str, Any]:
        """
        Collect current system metrics.

        Returns:
            Dictionary containing current system metrics
        """
        # Check if we have recent cached metrics
        if (self._last_collection and
                time.time() - self._last_collection < self._cache_duration):
            return self._cached_metrics.copy()

        try:
            # Import psutil for system metrics
            import psutil

            # Collect metrics asynchronously
            metrics = await self._collect_metrics_async(psutil)

            # Cache the results
            self._cached_metrics = metrics
            self._last_collection = time.time()

            return metrics

        except ImportError:
            logger.warning("psutil not available, returning basic metrics")
            return self._get_basic_metrics()
        except Exception as e:
            logger.error(f"Error collecting system metrics: {str(e)}")
            return self._get_error_metrics(str(e))

    async def _collect_metrics_async(self, psutil) -> Dict[str, Any]:
        """Collect metrics asynchronously to avoid blocking."""

        # Create tasks for different metric collections
        tasks = [
            self._get_cpu_metrics(psutil),
            self._get_memory_metrics(psutil),
            self._get_disk_metrics(psutil),
            self._get_network_metrics(psutil),
            self._get_connection_metrics(psutil),
            self._get_load_metrics(psutil),
        ]

        # Execute all tasks concurrently
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Combine results
        metrics = {}
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Error collecting metric {i}: {result}")
                continue
            metrics.update(result)

        # Add timestamp
        metrics["timestamp"] = datetime.now(timezone.utc).isoformat()

        return metrics

    async def _get_cpu_metrics(self, psutil) -> Dict[str, Any]:
        """Get CPU metrics."""
        try:
            cpu_percent = psutil.cpu_percent(interval=0.1)
            cpu_count = psutil.cpu_count()
            cpu_freq = psutil.cpu_freq()

            return {
                "cpu_percent": cpu_percent,
                "cpu_count": cpu_count,
                "cpu_freq": {
                    "current": cpu_freq.current if cpu_freq else 0,
                    "min": cpu_freq.min if cpu_freq else 0,
                    "max": cpu_freq.max if cpu_freq else 0,
                } if cpu_freq else {},
            }
        except Exception as e:
            logger.error(f"Error collecting CPU metrics: {e}")
            return {"cpu_percent": 0.0, "cpu_count": 0}

    async def _get_memory_metrics(self, psutil) -> Dict[str, Any]:
        """Get memory metrics."""
        try:
            memory = psutil.virtual_memory()
            swap = psutil.swap_memory()

            return {
                "memory_percent": memory.percent,
                "memory_used": memory.used,
                "memory_total": memory.total,
                "memory_available": memory.available,
                "swap_percent": swap.percent,
                "swap_used": swap.used,
                "swap_total": swap.total,
            }
        except Exception as e:
            logger.error(f"Error collecting memory metrics: {e}")
            return {"memory_percent": 0.0}

    async def _get_disk_metrics(self, psutil) -> Dict[str, Any]:
        """Get disk metrics."""
        try:
            disk = psutil.disk_usage('/')

            return {
                "disk_percent": disk.percent,
                "disk_used": disk.used,
                "disk_total": disk.total,
                "disk_free": disk.free,
            }
        except Exception as e:
            logger.error(f"Error collecting disk metrics: {e}")
            return {"disk_percent": 0.0}

    async def _get_network_metrics(self, psutil) -> Dict[str, Any]:
        """Get network metrics."""
        try:
            network_io = psutil.net_io_counters()

            return {
                "network_io": {
                    "bytes_sent": network_io.bytes_sent,
                    "bytes_recv": network_io.bytes_recv,
                    "packets_sent": network_io.packets_sent,
                    "packets_recv": network_io.packets_recv,
                }
            }
        except Exception as e:
            logger.error(f"Error collecting network metrics: {e}")
            return {"network_io": {"bytes_sent": 0, "bytes_recv": 0}}

    async def _get_connection_metrics(self, psutil) -> Dict[str, Any]:
        """Get connection metrics."""
        try:
            connections = psutil.net_connections()
            active_connections = len(
                [conn for conn in connections if conn.status == 'ESTABLISHED'])

            return {
                "active_connections": active_connections,
                "total_connections": len(connections),
            }
        except Exception as e:
            logger.error(f"Error collecting connection metrics: {e}")
            return {"active_connections": 0, "total_connections": 0}

    async def _get_load_metrics(self, psutil) -> Dict[str, Any]:
        """Get system load metrics."""
        try:
            # Note: getloadavg() is Unix-specific
            load_avg = psutil.getloadavg()

            return {
                "load_average": list(load_avg),
            }
        except Exception as e:
            logger.error(f"Error collecting load metrics: {e}")
            return {"load_average": [0.0, 0.0, 0.0]}

    def _get_basic_metrics(self) -> Dict[str, Any]:
        """Get basic metrics when psutil is not available."""
        return {
            "cpu_percent": 0.0,
            "memory_percent": 0.0,
            "disk_percent": 0.0,
            "active_connections": 0,
            "network_io": {"bytes_sent": 0, "bytes_recv": 0},
            "load_average": [0.0, 0.0, 0.0],
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "note": "Basic metrics - psutil not available"
        }

    def _get_error_metrics(self, error: str) -> Dict[str, Any]:
        """Get error metrics when collection fails."""
        return {
            "cpu_percent": 0.0,
            "memory_percent": 0.0,
            "disk_percent": 0.0,
            "active_connections": 0,
            "network_io": {"bytes_sent": 0, "bytes_recv": 0},
            "load_average": [0.0, 0.0, 0.0],
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "error": error
        }

    async def get_metrics_summary(self) -> Dict[str, Any]:
        """Get a summary of current system health."""
        metrics = await self.collect_current_metrics()

        # Calculate health score
        health_score = 100

        # Reduce score based on high resource usage
        if metrics.get("cpu_percent", 0) > 80:
            health_score -= 20
        elif metrics.get("cpu_percent", 0) > 60:
            health_score -= 10

        if metrics.get("memory_percent", 0) > 90:
            health_score -= 20
        elif metrics.get("memory_percent", 0) > 80:
            health_score -= 10

        if metrics.get("disk_percent", 0) > 95:
            health_score -= 20
        elif metrics.get("disk_percent", 0) > 85:
            health_score -= 10

        return {
            "health_score": max(0, health_score),
            "status": "healthy" if health_score >= 80 else "warning" if health_score >= 60 else "critical",
            "metrics": metrics,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
