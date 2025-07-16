"""
Test suite for Track A Phase 3 Performance Optimization Service.

Tests the performance orchestrator, cache manager, query optimizer, metrics collector,
and background workers for comprehensive performance optimization in multi-tenant SaaS environment.
"""

import pytest
import uuid
from unittest.mock import AsyncMock, Mock, patch
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.performance.performance_orchestrator import (
    PerformanceOrchestrator,
    PerformanceLevel,
    OptimizationResult
)
from app.services.performance.cache_manager import MerchantCacheManager
from app.services.performance.query_optimizer import QueryOptimizer
from app.services.performance.metrics_collector import PerformanceMetricsCollector
from app.services.performance.background_workers import OptimizationWorkers


class TestPerformanceOrchestrator:
    """Test the main performance orchestrator coordination."""

    @pytest.fixture
    async def orchestrator(self, mock_db_session: AsyncSession):
        """Create test performance orchestrator."""
        orchestrator = PerformanceOrchestrator(mock_db_session)
        await orchestrator.initialize()
        yield orchestrator
        await orchestrator.cleanup()

    @pytest.fixture
    def sample_tenant_id(self):
        """Sample tenant ID for testing."""
        return uuid.uuid4()

    @pytest.mark.asyncio
    async def test_orchestrator_initialization(self, mock_db_session: AsyncSession):
        """Test orchestrator initializes all components successfully."""
        orchestrator = PerformanceOrchestrator(mock_db_session)

        await orchestrator.initialize()

        # Verify all components are initialized
        assert orchestrator.cache_manager is not None
        assert orchestrator.query_optimizer is not None
        assert orchestrator.metrics_collector is not None
        assert orchestrator.workers is not None

        await orchestrator.cleanup()

    @pytest.mark.asyncio
    async def test_merchant_performance_optimization(
        self, orchestrator: PerformanceOrchestrator, sample_tenant_id: uuid.UUID
    ):
        """Test complete merchant performance optimization."""

        # Mock the individual optimization steps
        with patch.object(orchestrator.cache_manager, 'optimize_merchant_cache') as mock_cache, \
                patch.object(orchestrator.query_optimizer, 'optimize_tenant_queries') as mock_query, \
                patch.object(orchestrator.metrics_collector, 'collect_comprehensive_metrics') as mock_metrics:

            # Setup mocks
            mock_cache.return_value = {
                "cache_hit_ratio": 85, "cache_size": "256MB"}
            mock_query.return_value = {
                "indexes_created": 3, "query_improvement": 40}
            mock_metrics.return_value = {
                "performance_score": 88, "recommendations": []}

            # Run optimization
            result = await orchestrator.optimize_merchant_performance(
                sample_tenant_id, PerformanceLevel.STANDARD
            )

            # Verify result
            assert isinstance(result, OptimizationResult)
            assert result.success is True
            assert result.tenant_id == sample_tenant_id
            assert result.optimization_level == PerformanceLevel.STANDARD
            assert "cache_optimization" in result.metrics
            assert "query_optimization" in result.metrics
            assert "performance_metrics" in result.metrics

            # Verify all optimization steps were called
            mock_cache.assert_called_once_with(sample_tenant_id, "standard")
            mock_query.assert_called_once_with(sample_tenant_id, "standard")
            mock_metrics.assert_called_once_with(sample_tenant_id)

    @pytest.mark.asyncio
    async def test_performance_level_scaling(
        self, orchestrator: PerformanceOrchestrator, sample_tenant_id: uuid.UUID
    ):
        """Test different performance levels apply appropriate optimizations."""

        with patch.object(orchestrator.cache_manager, 'optimize_merchant_cache') as mock_cache:

            # Test Basic level
            await orchestrator.optimize_merchant_performance(
                sample_tenant_id, PerformanceLevel.BASIC
            )
            mock_cache.assert_called_with(sample_tenant_id, "basic")

            # Test Enterprise level
            await orchestrator.optimize_merchant_performance(
                sample_tenant_id, PerformanceLevel.ENTERPRISE
            )
            mock_cache.assert_called_with(sample_tenant_id, "enterprise")

    @pytest.mark.asyncio
    async def test_performance_status_retrieval(
        self, orchestrator: PerformanceOrchestrator, sample_tenant_id: uuid.UUID
    ):
        """Test getting performance status for a merchant."""

        with patch.object(orchestrator.metrics_collector, 'collect_comprehensive_metrics') as mock_metrics:
            mock_metrics.return_value = {
                "performance_score": 92,
                "cache_hit_ratio": 88,
                "avg_response_time": 120
            }

            status = await orchestrator.get_performance_status(sample_tenant_id)

            assert status["tenant_id"] == str(sample_tenant_id)
            assert status["performance_score"] == 92
            assert status["status"] == "optimized"  # Score > 80
            assert "last_optimization" in status

    @pytest.mark.asyncio
    async def test_error_handling(
        self, orchestrator: PerformanceOrchestrator, sample_tenant_id: uuid.UUID
    ):
        """Test error handling during optimization."""

        with patch.object(orchestrator.cache_manager, 'optimize_merchant_cache', side_effect=Exception("Cache error")):

            result = await orchestrator.optimize_merchant_performance(
                sample_tenant_id, PerformanceLevel.STANDARD
            )

            assert result.success is False
            assert "error" in result.metrics
            assert "Cache error" in result.metrics["error"]


class TestMerchantCacheManager:
    """Test merchant-specific cache management."""

    @pytest.fixture
    def cache_manager(self):
        """Create test cache manager."""
        return MerchantCacheManager()

    @pytest.fixture
    def sample_tenant_id(self):
        """Sample tenant ID for testing."""
        return uuid.uuid4()

    def test_cache_key_generation(self, cache_manager: MerchantCacheManager, sample_tenant_id: uuid.UUID):
        """Test merchant-specific cache key generation."""

        cache_key = cache_manager._generate_cache_key(
            sample_tenant_id, "products", "list")

        assert str(sample_tenant_id) in cache_key
        assert "products" in cache_key
        assert "list" in cache_key
        assert cache_key.startswith("merchant:")

    @pytest.mark.asyncio
    async def test_cache_set_and_get(self, cache_manager: MerchantCacheManager, sample_tenant_id: uuid.UUID):
        """Test setting and getting cached data."""

        # Mock Redis operations
        with patch.object(cache_manager, '_redis_set') as mock_set, \
                patch.object(cache_manager, '_redis_get') as mock_get:

            mock_set.return_value = True
            mock_get.return_value = '{"test": "data"}'

            # Test cache set
            result = await cache_manager.set_cache(
                sample_tenant_id, "products", "list", {"test": "data"}, ttl=300
            )
            assert result is True

            # Test cache get
            cached_data = await cache_manager.get_cache(
                sample_tenant_id, "products", "list"
            )
            assert cached_data == {"test": "data"}

    @pytest.mark.asyncio
    async def test_cache_optimization(self, cache_manager: MerchantCacheManager, sample_tenant_id: uuid.UUID):
        """Test cache optimization for merchant."""

        with patch.object(cache_manager, '_analyze_cache_usage') as mock_analyze, \
                patch.object(cache_manager, '_optimize_cache_strategy') as mock_optimize:

            mock_analyze.return_value = {"hit_ratio": 75, "memory_usage": 80}
            mock_optimize.return_value = {
                "strategy": "optimized", "improvement": 15}

            result = await cache_manager.optimize_merchant_cache(sample_tenant_id, "standard")

            assert "cache_hit_ratio" in result
            assert "optimization_applied" in result
            assert result["cache_hit_ratio"] >= 75

    def test_tenant_isolation(self, cache_manager: MerchantCacheManager):
        """Test that cache keys properly isolate tenant data."""

        tenant1 = uuid.uuid4()
        tenant2 = uuid.uuid4()

        key1 = cache_manager._generate_cache_key(tenant1, "products", "list")
        key2 = cache_manager._generate_cache_key(tenant2, "products", "list")

        assert key1 != key2
        assert str(tenant1) in key1
        assert str(tenant2) in key2
        assert str(tenant1) not in key2
        assert str(tenant2) not in key1


class TestQueryOptimizer:
    """Test database query optimization."""

    @pytest.fixture
    def query_optimizer(self, mock_db_session: AsyncSession):
        """Create test query optimizer."""
        return QueryOptimizer(mock_db_session)

    @pytest.fixture
    def sample_tenant_id(self):
        """Sample tenant ID for testing."""
        return uuid.uuid4()

    @pytest.mark.asyncio
    async def test_tenant_query_optimization(
        self, query_optimizer: QueryOptimizer, sample_tenant_id: uuid.UUID
    ):
        """Test query optimization for specific tenant."""

        with patch.object(query_optimizer, '_analyze_tenant_queries') as mock_analyze, \
                patch.object(query_optimizer, '_create_tenant_indexes') as mock_indexes:

            mock_analyze.return_value = {
                "slow_queries": 3, "optimization_potential": 60}
            mock_indexes.return_value = {
                "indexes_created": 5, "estimated_improvement": 45}

            result = await query_optimizer.optimize_tenant_queries(sample_tenant_id, "standard")

            assert "indexes_created" in result
            assert "query_analysis" in result
            assert "performance_improvement" in result

            mock_analyze.assert_called_once_with(sample_tenant_id)
            mock_indexes.assert_called_once()

    @pytest.mark.asyncio
    async def test_query_performance_analysis(
        self, query_optimizer: QueryOptimizer, sample_tenant_id: uuid.UUID
    ):
        """Test query performance analysis."""

        with patch.object(query_optimizer, '_test_query_performance') as mock_test:
            mock_test.side_effect = [
                {"execution_time": 0.08, "rows_examined": 100},  # Products
                {"execution_time": 0.12, "rows_examined": 250},  # Orders
                {"execution_time": 0.35, "rows_examined": 1000}  # Analytics
            ]

            result = await query_optimizer.analyze_query_performance(sample_tenant_id)

            assert "performance_stats" in result
            assert "recommendations" in result
            assert "product_queries" in result["performance_stats"]
            assert "order_queries" in result["performance_stats"]
            assert "analytics_queries" in result["performance_stats"]

    @pytest.mark.asyncio
    async def test_index_creation_tenant_specific(
        self, query_optimizer: QueryOptimizer, sample_tenant_id: uuid.UUID
    ):
        """Test that indexes are created with proper tenant filtering."""

        with patch.object(query_optimizer.db, 'execute') as mock_execute:
            mock_execute.return_value = AsyncMock()

            await query_optimizer._create_tenant_indexes(sample_tenant_id, "premium")

            # Verify tenant-specific indexes were created
            assert mock_execute.call_count >= 3  # Should create multiple indexes

            # Check that tenant_id is included in index creation
            for call in mock_execute.call_args_list:
                sql = str(call[0][0])
                assert "tenant_id" in sql.lower()


class TestPerformanceMetricsCollector:
    """Test performance metrics collection."""

    @pytest.fixture
    def metrics_collector(self, mock_db_session: AsyncSession):
        """Create test metrics collector."""
        return PerformanceMetricsCollector(mock_db_session)

    @pytest.fixture
    def sample_tenant_id(self):
        """Sample tenant ID for testing."""
        return uuid.uuid4()

    @pytest.mark.asyncio
    async def test_comprehensive_metrics_collection(
        self, metrics_collector: PerformanceMetricsCollector, sample_tenant_id: uuid.UUID
    ):
        """Test collecting all types of performance metrics."""

        with patch.object(metrics_collector, '_collect_system_metrics') as mock_system, \
                patch.object(metrics_collector, '_collect_business_metrics') as mock_business, \
                patch.object(metrics_collector, '_collect_ux_metrics') as mock_ux, \
                patch.object(metrics_collector, '_collect_infrastructure_metrics') as mock_infra:

            # Mock metric responses
            mock_system.return_value = {
                "avg_response_time": 150, "error_rate": 0.5}
            mock_business.return_value = {
                "daily_revenue": 2500, "conversion_rate": 3.2}
            mock_ux.return_value = {"page_load_time": 1.8, "bounce_rate": 12}
            mock_infra.return_value = {
                "database_cpu": 45, "cache_hit_ratio": 88}

            result = await metrics_collector.collect_comprehensive_metrics(sample_tenant_id)

            assert "performance_score" in result
            assert "system_health" in result
            assert "business_metrics" in result
            assert "user_experience" in result
            assert "infrastructure" in result
            assert "recommendations" in result

            # Verify all metric types were collected
            mock_system.assert_called_once_with(sample_tenant_id)
            mock_business.assert_called_once_with(sample_tenant_id)
            mock_ux.assert_called_once_with(sample_tenant_id)
            mock_infra.assert_called_once_with(sample_tenant_id)

    @pytest.mark.asyncio
    async def test_performance_score_calculation(
        self, metrics_collector: PerformanceMetricsCollector, sample_tenant_id: uuid.UUID
    ):
        """Test performance score calculation logic."""

        # Mock good performance metrics
        good_system = {"avg_response_time": 100, "error_rate": 0.1}
        good_business = {"conversion_rate": 5.0, "customer_satisfaction": 4.5}
        good_ux = {"page_load_time": 1.2, "mobile_performance_score": 90}
        good_infra = {"database_cpu": 30, "cache_hit_ratio": 95}

        score = metrics_collector._calculate_performance_score(
            good_system, good_business, good_ux, good_infra
        )

        assert score >= 80  # Should be high score for good metrics
        assert score <= 100

    def test_metric_buffering(
        self, metrics_collector: PerformanceMetricsCollector, sample_tenant_id: uuid.UUID
    ):
        """Test metric buffering for batch processing."""

        # Add metrics to buffer
        metrics_collector._buffer_metric(
            sample_tenant_id, "response_time", 150)
        metrics_collector._buffer_metric(
            sample_tenant_id, "response_time", 200)

        tenant_key = str(sample_tenant_id)
        assert tenant_key in metrics_collector.metrics_buffer
        assert len(metrics_collector.metrics_buffer[tenant_key]) == 2


class TestOptimizationWorkers:
    """Test background optimization workers."""

    @pytest.fixture
    def workers(self):
        """Create test optimization workers."""
        return OptimizationWorkers()

    @pytest.fixture
    def sample_tenant_id(self):
        """Sample tenant ID for testing."""
        return uuid.uuid4()

    @pytest.mark.asyncio
    async def test_schedule_optimization(
        self, workers: OptimizationWorkers, sample_tenant_id: uuid.UUID
    ):
        """Test scheduling optimization tasks."""

        with patch.object(workers, '_execute_optimization_task') as mock_execute:
            mock_execute.return_value = {"status": "completed", "duration": 45}

            task_id = await workers.schedule_optimization(
                sample_tenant_id, PerformanceLevel.STANDARD
            )

            assert task_id is not None
            assert isinstance(task_id, str)
            assert len(task_id) > 10  # Should be a proper task ID

    @pytest.mark.asyncio
    async def test_cache_maintenance(
        self, workers: OptimizationWorkers, sample_tenant_id: uuid.UUID
    ):
        """Test automated cache maintenance."""

        with patch.object(workers, '_cleanup_expired_cache') as mock_cleanup, \
                patch.object(workers, '_optimize_cache_memory') as mock_optimize:

            mock_cleanup.return_value = {"cleaned_keys": 150}
            mock_optimize.return_value = {"memory_freed": "64MB"}

            result = await workers.run_cache_maintenance(sample_tenant_id)

            assert "cache_cleanup" in result
            assert "memory_optimization" in result
            assert result["status"] == "completed"

    @pytest.mark.asyncio
    async def test_performance_monitoring(
        self, workers: OptimizationWorkers, sample_tenant_id: uuid.UUID
    ):
        """Test continuous performance monitoring."""

        with patch.object(workers, '_check_performance_thresholds') as mock_check:
            mock_check.return_value = {
                "threshold_violations": 1,
                "recommended_actions": ["optimize_cache"]
            }

            result = await workers.monitor_performance(sample_tenant_id)

            assert "monitoring_status" in result
            assert "threshold_checks" in result

    def test_worker_isolation(self, workers: OptimizationWorkers):
        """Test that workers maintain proper tenant isolation."""

        tenant1 = uuid.uuid4()
        tenant2 = uuid.uuid4()

        # Schedule tasks for different tenants
        task1 = workers._generate_task_id(tenant1, "cache_optimization")
        task2 = workers._generate_task_id(tenant2, "cache_optimization")

        assert task1 != task2
        assert str(tenant1) in task1
        assert str(tenant2) in task2


# Integration test for complete workflow
class TestPerformanceIntegration:
    """Integration tests for complete performance optimization workflow."""

    @pytest.mark.asyncio
    async def test_end_to_end_optimization_workflow(self, mock_db_session: AsyncSession):
        """Test complete end-to-end optimization workflow."""

        sample_tenant_id = uuid.uuid4()

        # Initialize orchestrator
        orchestrator = PerformanceOrchestrator(mock_db_session)
        await orchestrator.initialize()

        try:
            # Mock all optimization components
            with patch.object(orchestrator.cache_manager, 'optimize_merchant_cache') as mock_cache, \
                    patch.object(orchestrator.query_optimizer, 'optimize_tenant_queries') as mock_query, \
                    patch.object(orchestrator.metrics_collector, 'collect_comprehensive_metrics') as mock_metrics, \
                    patch.object(orchestrator.workers, 'schedule_optimization') as mock_schedule:

                # Setup successful responses
                mock_cache.return_value = {"cache_hit_ratio": 90}
                mock_query.return_value = {
                    "indexes_created": 4, "query_improvement": 50}
                mock_metrics.return_value = {"performance_score": 95}
                mock_schedule.return_value = "task_123"

                # Run complete optimization
                result = await orchestrator.optimize_merchant_performance(
                    sample_tenant_id, PerformanceLevel.PREMIUM
                )

                # Verify successful optimization
                assert result.success is True
                assert result.optimization_level == PerformanceLevel.PREMIUM
                assert result.metrics["performance_metrics"]["performance_score"] == 95

                # Verify all components were utilized
                mock_cache.assert_called_once()
                mock_query.assert_called_once()
                mock_metrics.assert_called_once()

                # Check status after optimization
                status = await orchestrator.get_performance_status(sample_tenant_id)
                assert status["status"] == "optimized"

        finally:
            await orchestrator.cleanup()

    @pytest.mark.asyncio
    async def test_performance_degradation_detection(self, mock_db_session: AsyncSession):
        """Test detection and response to performance degradation."""

        sample_tenant_id = uuid.uuid4()

        orchestrator = PerformanceOrchestrator(mock_db_session)
        await orchestrator.initialize()

        try:
            # Mock poor performance metrics
            with patch.object(orchestrator.metrics_collector, 'collect_comprehensive_metrics') as mock_metrics:
                mock_metrics.return_value = {
                    "performance_score": 45,  # Poor performance
                    "system_health": {"avg_response_time": 2500, "error_rate": 5.2},
                    "recommendations": ["optimize_cache", "add_indexes", "scale_resources"]
                }

                status = await orchestrator.get_performance_status(sample_tenant_id)

                # Should detect poor performance
                assert status["status"] == "needs_optimization"  # Score < 80
                assert len(status["recommendations"]) > 0

        finally:
            await orchestrator.cleanup()


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v"])
