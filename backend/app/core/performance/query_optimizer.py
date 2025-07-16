"""
Advanced Query Optimizer for Merchant Services.

Provides:
- Query analysis and optimization
- Index recommendations
- Query performance monitoring
- Connection pooling optimization
- RLS-aware query optimization
"""

import asyncio
import time
from typing import Any, Dict, List, Optional, Set, Tuple
from dataclasses import dataclass
from enum import Enum
import logging
from collections import defaultdict, deque
from sqlalchemy import text, inspect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select, Update, Delete, Insert
from sqlalchemy.orm import Query

logger = logging.getLogger(__name__)


class QueryType(str, Enum):
    """Types of database queries."""
    SELECT = "SELECT"
    INSERT = "INSERT"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    UNKNOWN = "UNKNOWN"


class PerformanceLevel(str, Enum):
    """Query performance levels."""
    EXCELLENT = "excellent"     # < 10ms
    GOOD = "good"              # 10-50ms
    ACCEPTABLE = "acceptable"   # 50-200ms
    SLOW = "slow"              # 200ms-1s
    VERY_SLOW = "very_slow"    # > 1s


@dataclass
class QueryMetrics:
    """Metrics for query performance analysis."""
    query_hash: str
    query_type: QueryType
    execution_time: float
    rows_examined: int
    rows_returned: int
    timestamp: float
    tenant_id: Optional[str] = None
    index_hints: List[str] = None
    optimization_suggestions: List[str] = None


@dataclass
class IndexRecommendation:
    """Database index recommendation."""
    table_name: str
    columns: List[str]
    index_type: str = "btree"
    reason: str = ""
    estimated_impact: str = ""
    priority: int = 1  # 1=high, 2=medium, 3=low


class MerchantQueryOptimizer:
    """
    Advanced query optimizer for merchant services.

    Features:
    - Real-time query performance monitoring
    - Automatic index recommendations
    - Query pattern analysis
    - RLS optimization suggestions
    - Connection pool tuning
    """

    def __init__(self, max_history: int = 10000):
        self.max_history = max_history

        # Query performance history
        self._query_history: deque = deque(maxlen=max_history)
        self._query_stats: Dict[str, List[QueryMetrics]] = defaultdict(list)

        # Index recommendations
        self._index_recommendations: List[IndexRecommendation] = []

        # Query patterns for optimization
        self._slow_queries: Dict[str, int] = defaultdict(int)
        self._frequent_queries: Dict[str, int] = defaultdict(int)

        # Performance thresholds (in seconds)
        self.thresholds = {
            PerformanceLevel.EXCELLENT: 0.01,
            PerformanceLevel.GOOD: 0.05,
            PerformanceLevel.ACCEPTABLE: 0.2,
            PerformanceLevel.SLOW: 1.0,
        }

    async def analyze_query(
        self,
        session: AsyncSession,
        query: Any,
        tenant_id: Optional[str] = None
    ) -> QueryMetrics:
        """
        Analyze and monitor query performance.

        Args:
            session: Database session
            query: SQLAlchemy query object
            tenant_id: Tenant ID for multi-tenant analysis
        """
        query_text = str(query)
        query_hash = self._hash_query(query_text)
        query_type = self._detect_query_type(query_text)

        # Execute query with timing
        start_time = time.time()

        try:
            if isinstance(query, (Select, str)):
                result = await session.execute(query)
                rows_returned = len(result.fetchall()) if hasattr(
                    result, 'fetchall') else 0
            else:
                result = await session.execute(query)
                rows_returned = result.rowcount if hasattr(
                    result, 'rowcount') else 0

        except Exception as e:
            logger.error(f"Query execution failed: {e}")
            raise

        execution_time = time.time() - start_time

        # Analyze query plan for optimization
        rows_examined = await self._estimate_rows_examined(session, query_text)

        # Create metrics
        metrics = QueryMetrics(
            query_hash=query_hash,
            query_type=query_type,
            execution_time=execution_time,
            rows_examined=rows_examined,
            rows_returned=rows_returned,
            timestamp=time.time(),
            tenant_id=tenant_id
        )

        # Generate optimization suggestions
        metrics.optimization_suggestions = await self._generate_optimizations(
            session, query_text, metrics
        )

        # Record metrics
        await self._record_metrics(metrics)

        return metrics

    async def _estimate_rows_examined(self, session: AsyncSession, query_text: str) -> int:
        """Estimate rows examined using EXPLAIN."""
        try:
            explain_query = text(f"EXPLAIN (FORMAT JSON) {query_text}")
            result = await session.execute(explain_query)
            explain_data = result.scalar()

            # Parse JSON explain output to estimate rows examined
            if explain_data and isinstance(explain_data, list):
                plan = explain_data[0].get("Plan", {})
                return plan.get("Actual Rows", plan.get("Plan Rows", 0))

        except Exception as e:
            logger.debug(f"Could not get query plan: {e}")

        return 0

    async def _generate_optimizations(
        self,
        session: AsyncSession,
        query_text: str,
        metrics: QueryMetrics
    ) -> List[str]:
        """Generate optimization suggestions for queries."""
        suggestions = []

        # Performance-based suggestions
        if metrics.execution_time > self.thresholds[PerformanceLevel.SLOW]:
            suggestions.append(
                "Query execution time exceeds 1 second - consider optimization")

            # Suggest specific optimizations based on query type
            if metrics.query_type == QueryType.SELECT:
                suggestions.extend(await self._suggest_select_optimizations(session, query_text))
            elif metrics.query_type == QueryType.UPDATE:
                suggestions.extend(await self._suggest_update_optimizations(query_text))
            elif metrics.query_type == QueryType.DELETE:
                suggestions.extend(await self._suggest_delete_optimizations(query_text))

        # Index suggestions
        if metrics.rows_examined > metrics.rows_returned * 10:
            suggestions.append(
                "High rows examined vs returned ratio - consider adding indexes")

        # RLS-specific optimizations
        if "tenant_id" in query_text.lower():
            suggestions.extend(self._suggest_rls_optimizations(query_text))

        return suggestions

    async def _suggest_select_optimizations(self, session: AsyncSession, query_text: str) -> List[str]:
        """Suggest optimizations for SELECT queries."""
        suggestions = []

        # Check for missing WHERE clauses on tenant_id
        if "tenant_id" not in query_text.lower() and "FROM" in query_text.upper():
            suggestions.append(
                "Consider adding tenant_id filter for better RLS performance")

        # Check for missing LIMIT clauses
        if "LIMIT" not in query_text.upper() and "SELECT" in query_text.upper():
            suggestions.append(
                "Consider adding LIMIT clause for large result sets")

        # Check for inefficient JOINs
        if "JOIN" in query_text.upper():
            suggestions.append(
                "Review JOIN conditions and ensure proper indexes exist")

        # Check for subqueries that could be optimized
        if query_text.count("SELECT") > 1:
            suggestions.append(
                "Consider optimizing subqueries with CTEs or window functions")

        return suggestions

    async def _suggest_update_optimizations(self, query_text: str) -> List[str]:
        """Suggest optimizations for UPDATE queries."""
        suggestions = []

        if "WHERE" not in query_text.upper():
            suggestions.append(
                "UPDATE without WHERE clause - ensure this is intentional")

        if "tenant_id" not in query_text.lower():
            suggestions.append(
                "Consider adding tenant_id in WHERE clause for RLS optimization")

        return suggestions

    async def _suggest_delete_optimizations(self, query_text: str) -> List[str]:
        """Suggest optimizations for DELETE queries."""
        suggestions = []

        if "WHERE" not in query_text.upper():
            suggestions.append(
                "DELETE without WHERE clause - ensure this is intentional")

        if "tenant_id" not in query_text.lower():
            suggestions.append(
                "Consider adding tenant_id in WHERE clause for RLS optimization")

        return suggestions

    def _suggest_rls_optimizations(self, query_text: str) -> List[str]:
        """Suggest RLS-specific optimizations."""
        suggestions = []

        # Check for explicit tenant_id filtering
        if "WHERE" in query_text.upper() and "tenant_id" in query_text.lower():
            suggestions.append(
                "Good: Explicit tenant_id filtering helps RLS performance")
        else:
            suggestions.append(
                "Consider explicit tenant_id filtering for better RLS performance")

        # Check for tenant-scoped indexes
        if "ORDER BY" in query_text.upper():
            suggestions.append(
                "Ensure indexes include tenant_id as first column for RLS queries")

        return suggestions

    async def _record_metrics(self, metrics: QueryMetrics) -> None:
        """Record query metrics for analysis."""
        # Add to history
        self._query_history.append(metrics)

        # Update stats
        self._query_stats[metrics.query_hash].append(metrics)

        # Track frequent queries
        self._frequent_queries[metrics.query_hash] += 1

        # Track slow queries
        if metrics.execution_time > self.thresholds[PerformanceLevel.SLOW]:
            self._slow_queries[metrics.query_hash] += 1

        # Generate index recommendations for slow queries
        if metrics.execution_time > self.thresholds[PerformanceLevel.ACCEPTABLE]:
            await self._generate_index_recommendations(metrics)

    async def _generate_index_recommendations(self, metrics: QueryMetrics) -> None:
        """Generate index recommendations based on slow queries."""
        # This is a simplified version - real implementation would be more sophisticated
        query_hash = metrics.query_hash

        # Don't duplicate recommendations
        if any(rec.table_name in str(metrics) for rec in self._index_recommendations):
            return

        # Basic pattern matching for common optimization cases
        if metrics.query_type == QueryType.SELECT and "tenant_id" in str(metrics):
            recommendation = IndexRecommendation(
                table_name="inferred_table",
                columns=["tenant_id", "created_at"],
                reason=f"Slow SELECT query with tenant filtering (query_hash: {query_hash[:8]})",
                estimated_impact="High - Should improve RLS query performance",
                priority=1
            )
            self._index_recommendations.append(recommendation)

    def _hash_query(self, query_text: str) -> str:
        """Generate hash for query to track patterns."""
        import hashlib

        # Normalize query for pattern matching
        normalized = query_text.lower().strip()

        # Remove specific values to focus on query structure
        import re
        normalized = re.sub(r"'[^']*'", "'?'", normalized)  # String literals
        normalized = re.sub(r'\b\d+\b', '?', normalized)   # Numbers

        return hashlib.md5(normalized.encode()).hexdigest()

    def _detect_query_type(self, query_text: str) -> QueryType:
        """Detect the type of SQL query."""
        query_upper = query_text.upper().strip()

        if query_upper.startswith("SELECT"):
            return QueryType.SELECT
        elif query_upper.startswith("INSERT"):
            return QueryType.INSERT
        elif query_upper.startswith("UPDATE"):
            return QueryType.UPDATE
        elif query_upper.startswith("DELETE"):
            return QueryType.DELETE
        else:
            return QueryType.UNKNOWN

    def get_performance_level(self, execution_time: float) -> PerformanceLevel:
        """Classify query performance level."""
        if execution_time <= self.thresholds[PerformanceLevel.EXCELLENT]:
            return PerformanceLevel.EXCELLENT
        elif execution_time <= self.thresholds[PerformanceLevel.GOOD]:
            return PerformanceLevel.GOOD
        elif execution_time <= self.thresholds[PerformanceLevel.ACCEPTABLE]:
            return PerformanceLevel.ACCEPTABLE
        elif execution_time <= self.thresholds[PerformanceLevel.SLOW]:
            return PerformanceLevel.SLOW
        else:
            return PerformanceLevel.VERY_SLOW

    async def get_slow_queries(self, limit: int = 10) -> List[Tuple[str, int, float]]:
        """Get most frequent slow queries."""
        slow_query_data = []

        for query_hash, count in self._slow_queries.items():
            if query_hash in self._query_stats:
                metrics_list = self._query_stats[query_hash]
                avg_time = sum(
                    m.execution_time for m in metrics_list) / len(metrics_list)
                slow_query_data.append((query_hash, count, avg_time))

        # Sort by frequency and average time
        slow_query_data.sort(key=lambda x: (x[1], x[2]), reverse=True)
        return slow_query_data[:limit]

    async def get_frequent_queries(self, limit: int = 10) -> List[Tuple[str, int]]:
        """Get most frequently executed queries."""
        frequent_data = list(self._frequent_queries.items())
        frequent_data.sort(key=lambda x: x[1], reverse=True)
        return frequent_data[:limit]

    async def get_index_recommendations(self) -> List[IndexRecommendation]:
        """Get index recommendations sorted by priority."""
        return sorted(self._index_recommendations, key=lambda x: x.priority)

    async def get_performance_summary(self) -> Dict[str, Any]:
        """Get overall performance summary."""
        if not self._query_history:
            return {"message": "No query data available"}

        recent_queries = list(self._query_history)[-1000:]  # Last 1000 queries

        total_queries = len(recent_queries)
        avg_execution_time = sum(
            q.execution_time for q in recent_queries) / total_queries

        # Performance distribution
        performance_dist = {level.value: 0 for level in PerformanceLevel}
        for query in recent_queries:
            level = self.get_performance_level(query.execution_time)
            performance_dist[level.value] += 1

        # Convert to percentages
        for level in performance_dist:
            performance_dist[level] = (
                performance_dist[level] / total_queries) * 100

        return {
            "total_queries": total_queries,
            "avg_execution_time": avg_execution_time,
            "performance_distribution": performance_dist,
            "slow_queries_count": len(self._slow_queries),
            "index_recommendations_count": len(self._index_recommendations)
        }

    async def optimize_connection_pool(self, engine_config: Dict[str, Any]) -> Dict[str, Any]:
        """Provide connection pool optimization recommendations."""
        recommendations = {}

        # Analyze query patterns to suggest pool size
        if self._query_history:
            concurrent_peak = self._estimate_peak_concurrency()
            recommendations["pool_size"] = max(5, min(20, concurrent_peak * 2))
            recommendations["max_overflow"] = recommendations["pool_size"]

        # Suggest pool timeout based on average query time
        if self._query_history:
            avg_time = sum(
                q.execution_time for q in self._query_history) / len(self._query_history)
            recommendations["pool_timeout"] = max(30, avg_time * 10)

        # RLS-specific recommendations
        recommendations["pool_pre_ping"] = True  # Important for RLS context
        recommendations["pool_recycle"] = 3600   # Recycle connections hourly

        return recommendations

    def _estimate_peak_concurrency(self) -> int:
        """Estimate peak concurrent query load."""
        # Simplified estimation based on query frequency
        if not self._query_history:
            return 5

        # Group queries by timestamp buckets (1 second intervals)
        time_buckets = defaultdict(int)
        for query in self._query_history:
            bucket = int(query.timestamp)
            time_buckets[bucket] += 1

        # Return 95th percentile
        counts = sorted(time_buckets.values())
        if counts:
            idx = int(len(counts) * 0.95)
            return counts[idx]

        return 5

    async def clear_history(self) -> None:
        """Clear query history and stats."""
        self._query_history.clear()
        self._query_stats.clear()
        self._slow_queries.clear()
        self._frequent_queries.clear()
        self._index_recommendations.clear()

        logger.info("Query optimizer history cleared")


# Global query optimizer instance
query_optimizer = MerchantQueryOptimizer()


# Decorator for automatic query optimization
def optimize_query(tenant_aware: bool = True):
    """Decorator for automatic query optimization and monitoring."""
    def decorator(func):
        async def async_wrapper(*args, **kwargs):
            # Extract session and tenant_id
            session = None
            tenant_id = None

            for arg in args:
                if isinstance(arg, AsyncSession):
                    session = arg
                    break

            if tenant_aware and "tenant_id" in kwargs:
                tenant_id = str(kwargs["tenant_id"])

            # Execute function and capture query if possible
            if session:
                # This is a simplified version - real implementation would need
                # to intercept actual SQL queries
                start_time = time.time()
                result = await func(*args, **kwargs)
                execution_time = time.time() - start_time

                # Log performance if slow
                if execution_time > 0.1:  # 100ms threshold
                    logger.warning(
                        f"Slow function execution: {func.__name__} "
                        f"took {execution_time:.3f}s"
                    )

                return result
            else:
                return await func(*args, **kwargs)

        def sync_wrapper(*args, **kwargs):
            return func(*args, **kwargs)

        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper

    return decorator
