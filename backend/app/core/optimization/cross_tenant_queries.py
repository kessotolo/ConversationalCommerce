import logging
from typing import Any, Dict, List, Optional, Tuple, TypeVar, Union
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, contains_eager, selectinload

from backend.app.core.cache.redis_cache import redis_cache
from backend.app.db.async_session import get_async_session_local

logger = logging.getLogger(__name__)

T = TypeVar('T')

class CrossTenantQueryOptimizer:
    """
    Utility class for optimizing cross-tenant database queries
    for admin operations that need to work across multiple tenants.
    """
    
    ADMIN_QUERY_CACHE_PREFIX = "admin_query"
    DEFAULT_CACHE_EXPIRATION = 300  # 5 minutes
    
    @staticmethod
    async def execute_optimized_query(
        model_class: Any,
        filter_conditions: List[Any] = None,
        tenant_ids: List[str] = None,
        order_by: List[Any] = None,
        limit: int = None,
        offset: int = None,
        join_relationships: List[Any] = None,
        cache_key: str = None,
        cache_expiration: int = DEFAULT_CACHE_EXPIRATION,
    ) -> List[Any]:
        """
        Execute an optimized cross-tenant query with caching support.
        
        Args:
            model_class: SQLAlchemy model class
            filter_conditions: List of filter conditions
            tenant_ids: List of tenant IDs to filter by
            order_by: List of ordering expressions
            limit: Maximum number of results
            offset: Query offset
            join_relationships: List of relationships to join/load
            cache_key: Optional cache key suffix
            cache_expiration: Cache expiration time in seconds
            
        Returns:
            List of model instances
        """
        # Try to get from cache first if cache_key provided
        if cache_key:
            full_cache_key = f"{CrossTenantQueryOptimizer.ADMIN_QUERY_CACHE_PREFIX}:{cache_key}"
            cached_result = await redis_cache.get(full_cache_key)
            if cached_result:
                logger.debug(f"Retrieved cross-tenant query results from cache: {full_cache_key}")
                return cached_result
        
        # Build query
        query = select(model_class)
        
        # Add tenant_id filter if provided
        if tenant_ids:
            query = query.filter(model_class.tenant_id.in_(tenant_ids))
        
        # Add additional filters if provided
        if filter_conditions:
            for condition in filter_conditions:
                query = query.filter(condition)
        
        # Add joins if provided
        if join_relationships:
            for relationship in join_relationships:
                query = query.options(selectinload(relationship))
        
        # Add ordering if provided
        if order_by:
            for order_clause in order_by:
                query = query.order_by(order_clause)
        
        # Add pagination if provided
        if limit:
            query = query.limit(limit)
        if offset:
            query = query.offset(offset)
        
        # Execute query
        try:
            async with get_async_session_local() as session:
                result = await session.execute(query)
                items = result.scalars().all()
                
                # Cache results if cache_key provided
                if cache_key:
                    full_cache_key = f"{CrossTenantQueryOptimizer.ADMIN_QUERY_CACHE_PREFIX}:{cache_key}"
                    await redis_cache.set(full_cache_key, items, expiration=cache_expiration)
                
                return items
        except Exception as e:
            logger.error(f"Error executing cross-tenant query: {str(e)}")
            raise
    
    @staticmethod
    async def get_tenant_aggregations(
        model_class: Any,
        group_by_column: Any,
        aggregation_column: Any,
        aggregation_func: Any = func.count,
        filter_conditions: List[Any] = None,
        tenant_ids: List[str] = None,
        cache_key: str = None,
        cache_expiration: int = DEFAULT_CACHE_EXPIRATION,
    ) -> Dict[Any, Any]:
        """
        Get aggregated data across tenants for admin dashboards.
        
        Args:
            model_class: SQLAlchemy model class
            group_by_column: Column to group by
            aggregation_column: Column to aggregate
            aggregation_func: Aggregation function (default: COUNT)
            filter_conditions: List of filter conditions
            tenant_ids: List of tenant IDs to filter by
            cache_key: Optional cache key suffix
            cache_expiration: Cache expiration time in seconds
            
        Returns:
            Dictionary of aggregated values by group
        """
        # Try to get from cache first if cache_key provided
        if cache_key:
            full_cache_key = f"{CrossTenantQueryOptimizer.ADMIN_QUERY_CACHE_PREFIX}:agg:{cache_key}"
            cached_result = await redis_cache.get(full_cache_key)
            if cached_result:
                logger.debug(f"Retrieved cross-tenant aggregation from cache: {full_cache_key}")
                return cached_result
        
        # Build query
        query = select(
            group_by_column,
            aggregation_func(aggregation_column).label("aggregated_value")
        ).group_by(group_by_column)
        
        # Add tenant_id filter if provided
        if tenant_ids:
            query = query.filter(model_class.tenant_id.in_(tenant_ids))
        
        # Add additional filters if provided
        if filter_conditions:
            for condition in filter_conditions:
                query = query.filter(condition)
        
        # Execute query
        try:
            async with get_async_session_local() as session:
                result = await session.execute(query)
                items = result.all()
                
                # Convert to dictionary
                aggregation_dict = {str(item[0]): item[1] for item in items}
                
                # Cache results if cache_key provided
                if cache_key:
                    full_cache_key = f"{CrossTenantQueryOptimizer.ADMIN_QUERY_CACHE_PREFIX}:agg:{cache_key}"
                    await redis_cache.set(full_cache_key, aggregation_dict, expiration=cache_expiration)
                
                return aggregation_dict
        except Exception as e:
            logger.error(f"Error executing cross-tenant aggregation query: {str(e)}")
            raise
    
    @staticmethod
    async def invalidate_admin_cache(cache_key_prefix: str = None):
        """
        Invalidate admin cache entries.
        
        Args:
            cache_key_prefix: Optional prefix to limit invalidation scope
            
        Returns:
            Number of keys invalidated
        """
        prefix = f"{CrossTenantQueryOptimizer.ADMIN_QUERY_CACHE_PREFIX}"
        if cache_key_prefix:
            prefix = f"{prefix}:{cache_key_prefix}"
        
        return await redis_cache.delete_by_pattern(f"{prefix}*")


# Create singleton instance
cross_tenant_optimizer = CrossTenantQueryOptimizer()
