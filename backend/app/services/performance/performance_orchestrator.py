"""
Performance Optimization Orchestrator.

Multi-tenant SaaS performance optimization coordinator that manages comprehensive
performance improvements across caching, database optimization, and real-time monitoring.
Handles tenant-specific optimizations based on subscription tiers and usage patterns.

Business Context:
- "Merchant" = Business customer using the platform to run their online store
- "Tenant" = Individual merchant's isolated data environment (tenant_id identifies each merchant)
- Each merchant has their own performance profile based on their subscription tier
- Performance optimizations are applied per-tenant to ensure data isolation
"""

import asyncio
import uuid
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.performance.cache_manager import MerchantCacheManager
from app.services.performance.query_optimizer import QueryOptimizer
from app.services.performance.metrics_collector import PerformanceMetricsCollector
from app.services.performance.background_workers import OptimizationWorkers

logger = logging.getLogger(__name__)


class PerformanceLevel(str, Enum):
    """Performance optimization levels."""
    BASIC = "basic"
    STANDARD = "standard"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"


@dataclass
class OptimizationResult:
    """Result of performance optimization operation."""
    success: bool
    operation: str
    tenant_id: str
    metrics: Dict[str, Any]
    recommendations: List[str]
    execution_time: float


class PerformanceOrchestrator:
    """
    Main orchestrator for merchant performance optimization.

    Coordinates:
    - Cache management and strategies
    - Query optimization and batching
    - Performance metrics collection
    - Background optimization workers
    - Auto-scaling recommendations
    """

    def __init__(self, db: AsyncSession):
        self.db = db

        # Component services
        self.cache_manager: Optional[MerchantCacheManager] = None
        self.query_optimizer: Optional[QueryOptimizer] = None
        self.metrics_collector: Optional[PerformanceMetricsCollector] = None
        self.workers: Optional[OptimizationWorkers] = None

        # Performance profiles per tenant
        self.performance_profiles: Dict[str, PerformanceLevel] = {}

        # Optimization history
        self.optimization_history: Dict[str, List[OptimizationResult]] = {}

    async def initialize(self) -> None:
        """Initialize all performance optimization components."""
        try:
            logger.info("Initializing Performance Orchestrator...")

            # Initialize component services
            self.cache_manager = MerchantCacheManager()
            await self.cache_manager.initialize()

            self.query_optimizer = QueryOptimizer(self.db)
            await self.query_optimizer.initialize()

            self.metrics_collector = PerformanceMetricsCollector(self.db)
            await self.metrics_collector.initialize()

            self.workers = OptimizationWorkers(
                cache_manager=self.cache_manager,
                query_optimizer=self.query_optimizer,
                metrics_collector=self.metrics_collector
            )
            await self.workers.start()

            logger.info("Performance Orchestrator initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize Performance Orchestrator: {e}")
            raise

    async def optimize_merchant_performance(
        self,
        tenant_id: uuid.UUID,
        optimization_level: PerformanceLevel = PerformanceLevel.STANDARD,
        force_refresh: bool = False
    ) -> OptimizationResult:
        """
        Run comprehensive performance optimization for a merchant.

        Args:
            tenant_id: Merchant tenant ID
            optimization_level: Level of optimization to apply
            force_refresh: Force cache refresh and reoptimization

        Returns:
            OptimizationResult with metrics and recommendations
        """
        start_time = datetime.utcnow()
        tenant_key = str(tenant_id)

        try:
            logger.info(
                f"Starting performance optimization for tenant {tenant_id}")

            # Update performance profile
            self.performance_profiles[tenant_key] = optimization_level

            # 1. Cache Optimization
            cache_result = await self._optimize_caching(tenant_id, optimization_level, force_refresh)

            # 2. Query Optimization
            query_result = await self._optimize_queries(tenant_id, optimization_level)

            # 3. Collect Performance Metrics
            metrics = await self._collect_performance_metrics(tenant_id)

            # 4. Generate Recommendations
            recommendations = await self._generate_recommendations(tenant_id, metrics)

            # Calculate execution time
            execution_time = (datetime.utcnow() - start_time).total_seconds()

            # Create optimization result
            result = OptimizationResult(
                success=True,
                operation="full_optimization",
                tenant_id=tenant_key,
                metrics={
                    "cache_metrics": cache_result,
                    "query_metrics": query_result,
                    "performance_metrics": metrics
                },
                recommendations=recommendations,
                execution_time=execution_time
            )

            # Store in history
            if tenant_key not in self.optimization_history:
                self.optimization_history[tenant_key] = []
            self.optimization_history[tenant_key].append(result)

            # Keep only last 50 optimization results
            self.optimization_history[tenant_key] = self.optimization_history[tenant_key][-50:]

            logger.info(
                f"Performance optimization completed for tenant {tenant_id} in {execution_time:.2f}s")
            return result

        except Exception as e:
            logger.error(
                f"Error during performance optimization for tenant {tenant_id}: {e}")

            execution_time = (datetime.utcnow() - start_time).total_seconds()
            return OptimizationResult(
                success=False,
                operation="full_optimization",
                tenant_id=tenant_key,
                metrics={"error": str(e)},
                recommendations=["Review error logs and retry optimization"],
                execution_time=execution_time
            )

    async def _optimize_caching(
        self,
        tenant_id: uuid.UUID,
        level: PerformanceLevel,
        force_refresh: bool
    ) -> Dict[str, Any]:
        """Optimize caching for merchant."""
        try:
            # Cache merchant products
            products_result = await self.cache_manager.cache_merchant_products(
                tenant_id, force_refresh=force_refresh
            )

            # Cache analytics based on optimization level
            if level in [PerformanceLevel.PREMIUM, PerformanceLevel.ENTERPRISE]:
                end_date = datetime.utcnow()
                start_date = end_date - timedelta(days=30)
                analytics_result = await self.cache_manager.cache_merchant_analytics(
                    tenant_id, (start_date,
                                end_date), force_refresh=force_refresh
                )
            else:
                analytics_result = {"status": "skipped",
                                    "reason": "optimization_level"}

            # Warm additional caches for enterprise level
            if level == PerformanceLevel.ENTERPRISE:
                await self.cache_manager.warm_cache_for_tenant(tenant_id)

            return {
                "products_cache": products_result,
                "analytics_cache": analytics_result,
                "optimization_level": level.value
            }

        except Exception as e:
            logger.error(
                f"Error optimizing caching for tenant {tenant_id}: {e}")
            return {"error": str(e)}

    async def _optimize_queries(
        self,
        tenant_id: uuid.UUID,
        level: PerformanceLevel
    ) -> Dict[str, Any]:
        """Optimize database queries for merchant."""
        try:
            # Apply query optimizations based on level
            operation_type = "analytics" if level in [
                PerformanceLevel.PREMIUM, PerformanceLevel.ENTERPRISE] else "default"

            optimization_result = await self.query_optimizer.optimize_merchant_queries(
                tenant_id, operation_type
            )

            # Create indexes for enterprise level
            if level == PerformanceLevel.ENTERPRISE:
                index_result = await self.query_optimizer.ensure_optimal_indexes(tenant_id)
                optimization_result["index_optimization"] = index_result

            return optimization_result

        except Exception as e:
            logger.error(
                f"Error optimizing queries for tenant {tenant_id}: {e}")
            return {"error": str(e)}

    async def _collect_performance_metrics(self, tenant_id: uuid.UUID) -> Dict[str, Any]:
        """Collect comprehensive performance metrics."""
        try:
            metrics = await self.metrics_collector.collect_comprehensive_metrics(tenant_id)
            return metrics

        except Exception as e:
            logger.error(
                f"Error collecting metrics for tenant {tenant_id}: {e}")
            return {"error": str(e)}

    async def _generate_recommendations(
        self,
        tenant_id: uuid.UUID,
        metrics: Dict[str, Any]
    ) -> List[str]:
        """Generate performance optimization recommendations."""
        recommendations = []

        try:
            # Cache recommendations
            if "cache_hit_ratio" in metrics and metrics["cache_hit_ratio"] < 70:
                recommendations.append(
                    "Increase cache TTL and enable cache warming")

            # Query recommendations
            if "avg_query_time" in metrics and metrics["avg_query_time"] > 100:
                recommendations.append(
                    "Review slow queries and add database indexes")

            # Memory recommendations
            if "memory_usage" in metrics and metrics["memory_usage"] > 80:
                recommendations.append(
                    "Consider upgrading to higher performance tier")

            # Response time recommendations
            if "avg_response_time" in metrics and metrics["avg_response_time"] > 2000:
                recommendations.append(
                    "Enable advanced caching and query optimization")

            # Level-specific recommendations
            current_level = self.performance_profiles.get(
                str(tenant_id), PerformanceLevel.BASIC)
            if current_level == PerformanceLevel.BASIC:
                recommendations.append(
                    "Consider upgrading to Standard performance tier for better optimization")

            return recommendations

        except Exception as e:
            logger.error(
                f"Error generating recommendations for tenant {tenant_id}: {e}")
            return ["Review performance metrics and contact support"]

    async def get_performance_status(self, tenant_id: uuid.UUID) -> Dict[str, Any]:
        """Get current performance status for a merchant."""
        try:
            tenant_key = str(tenant_id)

            # Get latest metrics
            metrics = await self.metrics_collector.get_latest_metrics(tenant_id)

            # Get optimization history
            history = self.optimization_history.get(tenant_key, [])
            last_optimization = history[-1] if history else None

            # Get current performance level
            current_level = self.performance_profiles.get(
                tenant_key, PerformanceLevel.BASIC)

            return {
                "tenant_id": tenant_key,
                "current_level": current_level.value,
                "latest_metrics": metrics,
                "last_optimization": {
                    "timestamp": last_optimization.execution_time if last_optimization else None,
                    "success": last_optimization.success if last_optimization else None,
                    "recommendations_count": len(last_optimization.recommendations) if last_optimization else 0
                } if last_optimization else None,
                "optimization_count": len(history),
                "status": "optimized" if metrics.get("performance_score", 0) > 80 else "needs_optimization"
            }

        except Exception as e:
            logger.error(
                f"Error getting performance status for tenant {tenant_id}: {e}")
            return {"error": str(e)}

    async def schedule_optimization(
        self,
        tenant_id: uuid.UUID,
        optimization_level: PerformanceLevel,
        schedule_time: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Schedule performance optimization for later execution."""
        try:
            if schedule_time is None:
                # Schedule for immediate execution
                result = await self.optimize_merchant_performance(tenant_id, optimization_level)
                return {"status": "executed", "result": result}
            else:
                # Add to worker queue for scheduled execution
                await self.workers.schedule_optimization(tenant_id, optimization_level, schedule_time)
                return {
                    "status": "scheduled",
                    "tenant_id": str(tenant_id),
                    "level": optimization_level.value,
                    "scheduled_time": schedule_time.isoformat()
                }

        except Exception as e:
            logger.error(
                f"Error scheduling optimization for tenant {tenant_id}: {e}")
            return {"error": str(e)}

    async def get_optimization_history(
        self,
        tenant_id: uuid.UUID,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get optimization history for a merchant."""
        try:
            tenant_key = str(tenant_id)
            history = self.optimization_history.get(tenant_key, [])

            # Return last N optimizations
            recent_history = history[-limit:] if history else []

            return [
                {
                    "operation": result.operation,
                    "success": result.success,
                    "execution_time": result.execution_time,
                    "recommendations_count": len(result.recommendations),
                    "metrics_summary": {
                        "cache_hit_ratio": result.metrics.get("performance_metrics", {}).get("cache_hit_ratio"),
                        "avg_response_time": result.metrics.get("performance_metrics", {}).get("avg_response_time")
                    }
                } for result in recent_history
            ]

        except Exception as e:
            logger.error(
                f"Error getting optimization history for tenant {tenant_id}: {e}")
            return []

    async def cleanup(self) -> None:
        """Cleanup resources and stop background workers."""
        try:
            logger.info("Cleaning up Performance Orchestrator...")

            # Stop background workers
            if self.workers:
                await self.workers.stop()

            # Cleanup component services
            if self.cache_manager:
                await self.cache_manager.cleanup()

            if self.query_optimizer:
                await self.query_optimizer.cleanup()

            if self.metrics_collector:
                await self.metrics_collector.cleanup()

            logger.info("Performance Orchestrator cleanup completed")

        except Exception as e:
            logger.error(f"Error during Performance Orchestrator cleanup: {e}")


# Global orchestrator instance factory
async def get_performance_orchestrator(db: AsyncSession) -> PerformanceOrchestrator:
    """Get or create performance orchestrator instance."""
    orchestrator = PerformanceOrchestrator(db)
    await orchestrator.initialize()
    return orchestrator
