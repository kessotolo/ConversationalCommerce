"""
Query Optimization Service.

Handles database query optimization, indexing strategies,
and connection pool management for merchant operations.

Business Context:
- Optimizes database queries for merchant-specific data (products, orders, analytics)
- Creates tenant-specific indexes to improve query performance for each merchant
- Analyzes query patterns per merchant to identify optimization opportunities
- Ensures database performance scales as merchant data volume grows
"""

import uuid
import logging
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select, func
from sqlalchemy.exc import SQLAlchemyError

from app.models.tenant import Tenant
from app.models.product import Product
from app.models.order import Order

logger = logging.getLogger(__name__)


class QueryType(str, Enum):
    """Types of database queries."""
    SELECT = "select"
    INSERT = "insert"
    UPDATE = "update"
    DELETE = "delete"
    AGGREGATE = "aggregate"


@dataclass
class QueryOptimization:
    """Query optimization configuration."""
    use_indexes: bool = True
    enable_query_cache: bool = True
    prefetch_relations: bool = True
    batch_size: int = 100
    connection_pooling: bool = True
    read_replicas: bool = False


class QueryOptimizer:
    """
    Database query optimization service.

    Features:
    - Query performance analysis
    - Index management and optimization
    - Connection pool optimization
    - Query batching and prefetching
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.optimizations: Dict[str, QueryOptimization] = {}
        self.query_stats: Dict[str, Dict[str, Any]] = {}

    async def initialize(self) -> None:
        """Initialize query optimizer with default configurations."""
        try:
            logger.info("Initializing Query Optimizer...")

            # Setup default optimizations
            self._setup_default_optimizations()

            # Verify database connection
            await self._verify_database_connection()

            logger.info("Query Optimizer initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize Query Optimizer: {e}")
            raise

    def _setup_default_optimizations(self) -> None:
        """Setup default query optimization configurations."""
        self.optimizations.update({
            "default": QueryOptimization(
                use_indexes=True,
                enable_query_cache=True,
                prefetch_relations=True,
                batch_size=50,
                connection_pooling=True
            ),
            "analytics": QueryOptimization(
                use_indexes=True,
                enable_query_cache=True,
                prefetch_relations=False,
                batch_size=1000,
                connection_pooling=True,
                read_replicas=True
            ),
            "bulk_operations": QueryOptimization(
                use_indexes=False,  # May slow down bulk inserts
                enable_query_cache=False,
                prefetch_relations=False,
                batch_size=500,
                connection_pooling=True
            )
        })

    async def _verify_database_connection(self) -> None:
        """Verify database connection is working."""
        try:
            await self.db.execute(text("SELECT 1"))
            logger.info("Database connection verified")
        except Exception as e:
            logger.error(f"Database connection verification failed: {e}")
            raise

    async def optimize_merchant_queries(
        self,
        tenant_id: uuid.UUID,
        operation_type: str = "default"
    ) -> Dict[str, Any]:
        """Apply query optimizations for merchant operations."""
        config = self.optimizations.get(operation_type, QueryOptimization())

        try:
            optimizations_applied = []

            # Apply session-level optimizations
            if config.enable_query_cache:
                try:
                    await self.db.execute(text("SET SESSION query_cache_type = ON"))
                    optimizations_applied.append("query_cache_enabled")
                except SQLAlchemyError:
                    # Some databases may not support query cache
                    logger.debug("Query cache not supported on this database")

            # Configure work memory for analytics queries
            if operation_type == "analytics":
                try:
                    await self.db.execute(text("SET work_mem = '256MB'"))
                    optimizations_applied.append("increased_work_memory")
                except SQLAlchemyError:
                    logger.debug("Work memory setting not supported")

            # Ensure optimal indexes exist
            index_result = await self.ensure_optimal_indexes(tenant_id)
            optimizations_applied.append("indexes_verified")

            return {
                "tenant_id": str(tenant_id),
                "operation_type": operation_type,
                "optimizations_applied": optimizations_applied,
                "index_result": index_result,
                "config": {
                    "batch_size": config.batch_size,
                    "prefetch_relations": config.prefetch_relations,
                    "connection_pooling": config.connection_pooling
                }
            }

        except Exception as e:
            logger.error(
                f"Error optimizing queries for tenant {tenant_id}: {e}")
            return {"error": str(e)}

    async def ensure_optimal_indexes(self, tenant_id: uuid.UUID) -> Dict[str, Any]:
        """Ensure optimal indexes exist for tenant data."""
        try:
            created_indexes = []
            verified_indexes = []

            # Define critical indexes for merchant operations
            index_definitions = [
                {
                    "name": "idx_products_tenant_active",
                    "table": "products",
                    "columns": ["tenant_id", "is_active"],
                    "condition": "WHERE is_active = true"
                },
                {
                    "name": "idx_orders_tenant_date",
                    "table": "orders",
                    "columns": ["tenant_id", "created_at"],
                    "condition": ""
                },
                {
                    "name": "idx_orders_tenant_status",
                    "table": "orders",
                    "columns": ["tenant_id", "status"],
                    "condition": ""
                },
                {
                    "name": f"idx_tenant_{str(tenant_id).replace('-', '_')}_products",
                    "table": "products",
                    "columns": ["id"],
                    "condition": f"WHERE tenant_id = '{tenant_id}'"
                }
            ]

            for index_def in index_definitions:
                try:
                    # Check if index exists
                    check_query = text(f"""
                        SELECT indexname
                        FROM pg_indexes
                        WHERE tablename = '{index_def['table']}'
                        AND indexname = '{index_def['name']}'
                    """)

                    result = await self.db.execute(check_query)
                    existing_index = result.scalar_one_or_none()

                    if existing_index:
                        verified_indexes.append(index_def['name'])
                    else:
                        # Create index
                        columns_str = ", ".join(index_def['columns'])
                        create_query = f"""
                            CREATE INDEX CONCURRENTLY IF NOT EXISTS {index_def['name']}
                            ON {index_def['table']}({columns_str})
                            {index_def['condition']}
                        """

                        await self.db.execute(text(create_query))
                        created_indexes.append(index_def['name'])

                except SQLAlchemyError as e:
                    logger.warning(
                        f"Could not create/verify index {index_def['name']}: {e}")

            return {
                "created_indexes": created_indexes,
                "verified_indexes": verified_indexes,
                "total_indexes": len(created_indexes) + len(verified_indexes)
            }

        except Exception as e:
            logger.error(f"Error ensuring optimal indexes: {e}")
            return {"error": str(e)}

    async def analyze_query_performance(
        self,
        tenant_id: uuid.UUID,
        query_type: QueryType = QueryType.SELECT
    ) -> Dict[str, Any]:
        """Analyze query performance for a specific tenant."""
        try:
            # Run sample queries and analyze performance
            performance_stats = {}

            if query_type == QueryType.SELECT:
                # Test product query performance
                product_stats = await self._analyze_product_queries(tenant_id)
                performance_stats["product_queries"] = product_stats

                # Test order query performance
                order_stats = await self._analyze_order_queries(tenant_id)
                performance_stats["order_queries"] = order_stats

            elif query_type == QueryType.AGGREGATE:
                # Test analytics query performance
                analytics_stats = await self._analyze_analytics_queries(tenant_id)
                performance_stats["analytics_queries"] = analytics_stats

            return {
                "tenant_id": str(tenant_id),
                "query_type": query_type.value,
                "performance_stats": performance_stats,
                "recommendations": await self._generate_query_recommendations(performance_stats)
            }

        except Exception as e:
            logger.error(
                f"Error analyzing query performance for tenant {tenant_id}: {e}")
            return {"error": str(e)}

    async def _analyze_product_queries(self, tenant_id: uuid.UUID) -> Dict[str, Any]:
        """Analyze product-related query performance."""
        try:
            import time

            # Simple product count query
            start_time = time.time()
            query = select(func.count(Product.id)).where(
                Product.tenant_id == tenant_id)
            result = await self.db.execute(query)
            count = result.scalar()
            query_time = time.time() - start_time

            return {
                "product_count": count,
                "query_time_ms": query_time * 1000,
                "performance_rating": "good" if query_time < 0.1 else "needs_optimization"
            }

        except Exception as e:
            logger.error(f"Error analyzing product queries: {e}")
            return {"error": str(e)}

    async def _analyze_order_queries(self, tenant_id: uuid.UUID) -> Dict[str, Any]:
        """Analyze order-related query performance."""
        try:
            import time

            # Order count query with status filter
            start_time = time.time()
            query = (
                select(func.count(Order.id))
                .where(Order.tenant_id == tenant_id)
                .where(Order.status == 'completed')
            )
            result = await self.db.execute(query)
            count = result.scalar()
            query_time = time.time() - start_time

            return {
                "completed_orders": count,
                "query_time_ms": query_time * 1000,
                "performance_rating": "good" if query_time < 0.15 else "needs_optimization"
            }

        except Exception as e:
            logger.error(f"Error analyzing order queries: {e}")
            return {"error": str(e)}

    async def _analyze_analytics_queries(self, tenant_id: uuid.UUID) -> Dict[str, Any]:
        """Analyze analytics-related query performance."""
        try:
            import time

            # Complex aggregation query
            start_time = time.time()
            query = (
                select(
                    func.count(Order.id).label("order_count"),
                    func.sum(Order.total_amount).label("total_revenue"),
                    func.avg(Order.total_amount).label("avg_order_value")
                )
                .where(Order.tenant_id == tenant_id)
                .where(Order.status.in_(['completed', 'shipped', 'delivered']))
            )
            result = await self.db.execute(query)
            stats = result.first()
            query_time = time.time() - start_time

            return {
                "aggregation_time_ms": query_time * 1000,
                "records_processed": stats.order_count if stats else 0,
                "performance_rating": "good" if query_time < 0.5 else "needs_optimization"
            }

        except Exception as e:
            logger.error(f"Error analyzing analytics queries: {e}")
            return {"error": str(e)}

    async def _generate_query_recommendations(
        self,
        performance_stats: Dict[str, Any]
    ) -> List[str]:
        """Generate query optimization recommendations based on performance stats."""
        recommendations = []

        try:
            # Check product query performance
            if "product_queries" in performance_stats:
                product_stats = performance_stats["product_queries"]
                if product_stats.get("performance_rating") == "needs_optimization":
                    recommendations.append(
                        "Add compound index on (tenant_id, is_active) for product queries")

            # Check order query performance
            if "order_queries" in performance_stats:
                order_stats = performance_stats["order_queries"]
                if order_stats.get("performance_rating") == "needs_optimization":
                    recommendations.append(
                        "Add compound index on (tenant_id, status) for order queries")

            # Check analytics query performance
            if "analytics_queries" in performance_stats:
                analytics_stats = performance_stats["analytics_queries"]
                if analytics_stats.get("performance_rating") == "needs_optimization":
                    recommendations.append(
                        "Consider read replicas for heavy analytics workloads")
                    recommendations.append(
                        "Implement query result caching for analytics")

            # General recommendations
            if not recommendations:
                recommendations.append(
                    "Query performance is optimal - no immediate optimizations needed")

            return recommendations

        except Exception as e:
            logger.error(f"Error generating query recommendations: {e}")
            return ["Unable to generate recommendations - check error logs"]

    async def get_query_stats(self, tenant_id: uuid.UUID) -> Dict[str, Any]:
        """Get query statistics for a specific tenant."""
        try:
            tenant_key = str(tenant_id)
            stats = self.query_stats.get(tenant_key, {})

            # Add current database stats
            db_stats = await self._get_database_stats()

            return {
                "tenant_id": tenant_key,
                "query_stats": stats,
                "database_stats": db_stats
            }

        except Exception as e:
            logger.error(
                f"Error getting query stats for tenant {tenant_id}: {e}")
            return {"error": str(e)}

    async def _get_database_stats(self) -> Dict[str, Any]:
        """Get general database performance statistics."""
        try:
            # Get basic database stats
            stats_query = text("""
                SELECT
                    (SELECT setting FROM pg_settings WHERE name = 'max_connections') as max_connections,
                    (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections
            """)

            result = await self.db.execute(stats_query)
            db_info = result.first()

            return {
                "max_connections": int(db_info.max_connections) if db_info else 0,
                "active_connections": int(db_info.active_connections) if db_info else 0,
                "connection_utilization": (int(db_info.active_connections) / max(int(db_info.max_connections), 1)) * 100 if db_info else 0
            }

        except Exception as e:
            logger.error(f"Error getting database stats: {e}")
            return {"error": str(e)}

    async def cleanup(self) -> None:
        """Cleanup query optimizer resources."""
        try:
            # Reset any session-level optimizations
            try:
                await self.db.execute(text("RESET ALL"))
            except SQLAlchemyError:
                logger.debug("Could not reset session variables")

            logger.info("Query optimizer cleanup completed")

        except Exception as e:
            logger.error(f"Error during query optimizer cleanup: {e}")
