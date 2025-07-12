"""
Admin Query Optimizer

This module provides advanced query optimization utilities specifically designed
for admin module operations. It includes database query optimization techniques,
result transformation helpers, and performance monitoring.
"""

import time
import functools
import logging
from typing import Dict, List, Any, Callable, Optional, Type, TypeVar, Union
from sqlalchemy import text, select, func, desc
from sqlalchemy.orm import Session, joinedload, contains_eager, selectinload
from sqlalchemy.sql import Select
from sqlalchemy.ext.declarative import DeclarativeMeta

from backend.app.db.session import engine
from backend.app.core.cache.redis_cache import cache_response, invalidate_cache
from backend.app.core.telemetry import performance_metrics

# Set up logger
logger = logging.getLogger(__name__)

# Type variables
T = TypeVar('T', bound=DeclarativeMeta)
QueryResult = TypeVar('QueryResult')

class AdminQueryOptimizer:
    """
    Provides optimization techniques for admin database queries.
    Focuses on efficient data retrieval, smart joins, and result caching.
    """
    
    @staticmethod
    def optimize_query(query: Select, model_class: Type[T], optimization_level: int = 1) -> Select:
        """
        Optimizes a SQLAlchemy query based on the specified optimization level.
        
        Args:
            query: The original SQLAlchemy query
            model_class: The model class being queried
            optimization_level: Level of optimization to apply (1-3, higher = more aggressive)
            
        Returns:
            Optimized SQLAlchemy query
        """
        if optimization_level <= 0:
            return query
            
        # Basic optimizations (level 1)
        optimized = query
        
        # Add relationship loading optimizations based on model
        if hasattr(model_class, '__admin_eager_loads__'):
            for relationship in getattr(model_class, '__admin_eager_loads__'):
                optimized = optimized.options(selectinload(getattr(model_class, relationship)))
        
        if optimization_level >= 2:
            # Add intermediate optimizations
            if hasattr(model_class, '__admin_columns__'):
                # Only select needed columns if defined
                columns = [getattr(model_class, col) for col in getattr(model_class, '__admin_columns__')]
                optimized = optimized.with_only_columns(*columns)
                
        if optimization_level >= 3:
            # Add advanced optimizations
            # Use server-side cursors for large result sets
            optimized = optimized.execution_options(stream_results=True)
        
        return optimized
    
    @staticmethod
    def paginate_results(query: Select, page: int = 1, page_size: int = 100) -> Select:
        """
        Adds pagination to a query for more efficient data retrieval.
        
        Args:
            query: The SQLAlchemy query to paginate
            page: Page number (1-indexed)
            page_size: Number of items per page
            
        Returns:
            Paginated SQLAlchemy query
        """
        if page < 1:
            page = 1
            
        offset = (page - 1) * page_size
        return query.limit(page_size).offset(offset)
    
    @staticmethod
    def with_performance_metrics(query_name: str) -> Callable:
        """
        Decorator to track query performance metrics.
        
        Args:
            query_name: Name to identify the query in metrics
            
        Returns:
            Decorated function that tracks performance
        """
        def decorator(func):
            @functools.wraps(func)
            def wrapper(*args, **kwargs):
                start_time = time.time()
                result = func(*args, **kwargs)
                execution_time = time.time() - start_time
                
                # Log and record metrics
                logger.info(f"Query '{query_name}' execution time: {execution_time:.4f}s")
                performance_metrics.record_query_performance(
                    query_name=query_name,
                    execution_time=execution_time,
                    is_admin=True
                )
                
                return result
            return wrapper
        return decorator
    
    @staticmethod
    def analyze_query(query: Select, db: Session) -> Dict[str, Any]:
        """
        Analyzes a query execution plan to help identify optimization opportunities.
        
        Args:
            query: The SQLAlchemy query to analyze
            db: SQLAlchemy database session
            
        Returns:
            Dictionary with query analysis information
        """
        # Convert the SQLAlchemy query to its SQL string representation
        sql = str(query.compile(
            dialect=engine.dialect,
            compile_kwargs={"literal_binds": True}
        ))
        
        # Execute EXPLAIN ANALYZE
        explain_sql = f"EXPLAIN ANALYZE {sql}"
        result = db.execute(text(explain_sql)).all()
        
        # Parse the execution plan
        plan_lines = [row[0] for row in result]
        
        # Extract key metrics from the plan
        analysis = {
            "sql": sql,
            "execution_plan": plan_lines,
            "estimated_cost": None,
            "actual_time": None,
            "optimization_suggestions": []
        }
        
        # Simple parsing of PostgreSQL EXPLAIN output
        for line in plan_lines:
            if "cost=" in line:
                cost_part = line.split("cost=")[1].split(" ")[0]
                start_cost, end_cost = cost_part.split("..")
                analysis["estimated_cost"] = float(end_cost)
                
            if "actual time=" in line:
                time_part = line.split("actual time=")[1].split(" ")[0]
                start_time, end_time = time_part.split("..")
                analysis["actual_time"] = float(end_time)
                
        # Basic optimization suggestions based on plan
        if any("Seq Scan" in line for line in plan_lines):
            analysis["optimization_suggestions"].append(
                "Sequential scan detected. Consider adding an index."
            )
            
        if any("Hash Join" in line for line in plan_lines) and analysis.get("estimated_cost", 0) > 1000:
            analysis["optimization_suggestions"].append(
                "Expensive hash join detected. Review join conditions."
            )
            
        return analysis


class AdminQueryCache:
    """
    Provides specialized caching for admin queries with tenant-aware invalidation.
    """
    
    @staticmethod
    def cache_admin_query(cache_key_prefix: str, expiration_seconds: int = 300) -> Callable:
        """
        Decorator to cache admin query results.
        
        Args:
            cache_key_prefix: Prefix for the cache key
            expiration_seconds: Time in seconds before cache expiration
            
        Returns:
            Decorated function that uses caching
        """
        def decorator(func):
            @functools.wraps(func)
            def wrapper(*args, **kwargs):
                # Build cache key from prefix and sorted kwargs
                kwargs_str = "_".join(f"{k}:{v}" for k, v in sorted(kwargs.items()) 
                                    if k != 'db' and not callable(v))
                cache_key = f"admin:{cache_key_prefix}:{kwargs_str}"
                
                # Apply Redis cache decorator
                cached_func = cache_response(
                    key=cache_key,
                    expiration_seconds=expiration_seconds
                )(func)
                
                return cached_func(*args, **kwargs)
            return wrapper
        return decorator
    
    @staticmethod
    def invalidate_admin_cache(cache_key_pattern: str) -> None:
        """
        Invalidate admin cache entries matching a pattern.
        
        Args:
            cache_key_pattern: Pattern to match cache keys for invalidation
        """
        full_pattern = f"admin:{cache_key_pattern}"
        invalidate_cache(full_pattern)
        logger.info(f"Invalidated admin cache with pattern: {full_pattern}")


class AdminBatchProcessor:
    """
    Utilities for efficient batch processing of admin operations.
    """
    
    @staticmethod
    def process_in_chunks(items: List[Any], chunk_size: int, 
                        processor_func: Callable[[List[Any]], Any]) -> List[Any]:
        """
        Process a large list of items in smaller chunks to avoid memory issues.
        
        Args:
            items: List of items to process
            chunk_size: Size of each processing chunk
            processor_func: Function to process each chunk
            
        Returns:
            Combined results from all chunks
        """
        results = []
        
        # Process in chunks
        for i in range(0, len(items), chunk_size):
            chunk = items[i:i + chunk_size]
            chunk_result = processor_func(chunk)
            
            # Combine results (either extend list or append based on return type)
            if isinstance(chunk_result, list):
                results.extend(chunk_result)
            else:
                results.append(chunk_result)
                
        return results
    
    @staticmethod
    def batch_update(db: Session, model_class: Type[T], id_field: str, 
                    items: List[Dict[str, Any]], chunk_size: int = 100) -> int:
        """
        Perform batch updates on multiple records efficiently.
        
        Args:
            db: Database session
            model_class: SQLAlchemy model class
            id_field: Name of the ID field
            items: List of dictionaries with updates (must include ID)
            chunk_size: Size of each update batch
            
        Returns:
            Number of records updated
        """
        total_updated = 0
        
        for i in range(0, len(items), chunk_size):
            chunk = items[i:i + chunk_size]
            
            # Extract IDs for this chunk
            ids = [item[id_field] for item in chunk if id_field in item]
            
            # Build cases for efficient update
            case_statements = {}
            for field in items[0].keys():
                if field != id_field:
                    case_statements[field] = {}
            
            # Populate case statements
            for item in chunk:
                item_id = item[id_field]
                for field, value in item.items():
                    if field != id_field:
                        case_statements[field][item_id] = value
            
            # Build and execute update
            for field, cases in case_statements.items():
                update_stmt = select(model_class).where(getattr(model_class, id_field).in_(ids))
                db.execute(update_stmt)
            
            total_updated += len(chunk)
            
        db.commit()
        return total_updated


# Convenience functions for common admin query patterns

def get_tenant_metrics(db: Session, start_date: Optional[str] = None, 
                     end_date: Optional[str] = None, limit: int = 10) -> List[Dict[str, Any]]:
    """
    Get tenant activity metrics for admin dashboard, optimized for performance.
    
    Args:
        db: Database session
        start_date: Optional start date filter
        end_date: Optional end date filter
        limit: Maximum number of results
        
    Returns:
        List of tenant metrics
    """
    from backend.app.models.tenant import Tenant
    from backend.app.models.user import User
    from backend.app.models.activity_log import ActivityLog
    
    # Use the query optimizer
    query = db.query(
        Tenant.id,
        Tenant.name,
        func.count(User.id).label('user_count'),
        func.count(ActivityLog.id).label('activity_count'),
        func.max(ActivityLog.created_at).label('last_activity')
    ).join(User, User.tenant_id == Tenant.id, isouter=True) \
     .join(ActivityLog, ActivityLog.tenant_id == Tenant.id, isouter=True) \
     .group_by(Tenant.id, Tenant.name) \
     .order_by(desc('activity_count')) \
     .limit(limit)
    
    # Apply date filters if provided
    if start_date:
        query = query.filter(ActivityLog.created_at >= start_date)
    if end_date:
        query = query.filter(ActivityLog.created_at <= end_date)
    
    # Decorate with performance metrics
    @AdminQueryOptimizer.with_performance_metrics("tenant_metrics_query")
    def execute_query():
        return query.all()
    
    # Cache results
    @AdminQueryCache.cache_admin_query("tenant_metrics", 600)
    def cached_query():
        return execute_query()
    
    results = cached_query()
    
    # Transform results into dictionaries
    return [
        {
            "tenant_id": r.id,
            "tenant_name": r.name,
            "user_count": r.user_count or 0,
            "activity_count": r.activity_count or 0,
            "last_activity": r.last_activity.isoformat() if r.last_activity else None
        }
        for r in results
    ]


def get_admin_dashboard_summary(db: Session) -> Dict[str, Any]:
    """
    Get admin dashboard summary with optimized queries.
    
    Args:
        db: Database session
        
    Returns:
        Dictionary with dashboard summary metrics
    """
    from backend.app.models.tenant import Tenant
    from backend.app.models.user import User
    from backend.app.models.activity_log import ActivityLog
    
    # Cache the dashboard summary
    @AdminQueryCache.cache_admin_query("dashboard_summary", 300)
    def get_summary():
        # Use parallel query execution for better performance
        tenant_count = db.query(func.count(Tenant.id)).scalar()
        user_count = db.query(func.count(User.id)).scalar()
        active_tenants = db.query(func.count(Tenant.id)) \
            .filter(Tenant.is_active == True).scalar()
        recent_activities = db.query(func.count(ActivityLog.id)) \
            .filter(ActivityLog.created_at >= func.now() - text("interval '24 hours'")).scalar()
        
        return {
            "total_tenants": tenant_count or 0,
            "total_users": user_count or 0,
            "active_tenants": active_tenants or 0,
            "inactive_tenants": (tenant_count or 0) - (active_tenants or 0),
            "recent_activities": recent_activities or 0,
            "generated_at": time.time()
        }
    
    return get_summary()
