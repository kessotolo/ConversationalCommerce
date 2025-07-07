"""
Global Search API endpoints for the unified super admin dashboard.
Cross-tenant, cross-module search with advanced filtering, history, and favorites.
"""

import asyncio
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from fastapi import APIRouter, Depends, HTTPException, Query, Body, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, func, desc, and_, or_

from app.core.security.dependencies import get_current_super_admin
from app.models.admin.admin_user import AdminUser
from app.db.async_session import get_async_db
from app.schemas.admin.dashboard import (
    SearchRequest,
    SearchFilter,
    SearchResultItem,
    GlobalSearchResult,
    SearchHistory,
    SearchFavorite
)

router = APIRouter(prefix="/search", tags=["global-search"])

# Global Search Endpoints


@router.post("/", response_model=GlobalSearchResult)
async def global_search(
    search_request: SearchRequest,
    current_admin: AdminUser = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Perform a global search across all modules and tenants.
    """
    start_time = time.time()

    # Validate search request
    if len(search_request.query.strip()) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Search query must be at least 2 characters long"
        )

    # Build search tasks for different modules
    search_tasks = []

    # Default modules if none specified
    modules_to_search = search_request.modules or [
        "tenants", "users", "orders", "products", "audit_logs"
    ]

    for module in modules_to_search:
        if module == "tenants":
            search_tasks.append(_search_tenants(db, search_request))
        elif module == "users":
            search_tasks.append(_search_users(db, search_request))
        elif module == "orders":
            search_tasks.append(_search_orders(db, search_request))
        elif module == "products":
            search_tasks.append(_search_products(db, search_request))
        elif module == "audit_logs":
            search_tasks.append(_search_audit_logs(db, search_request))

    # Execute all searches concurrently
    search_results = await asyncio.gather(*search_tasks, return_exceptions=True)

    # Combine results
    all_results = []
    facets = {}

    for i, result in enumerate(search_results):
        if isinstance(result, Exception):
            # Log error but continue with other results
            continue

        if result:
            all_results.extend(result["results"])
            # Merge facets
            for facet_name, facet_values in result.get("facets", {}).items():
                if facet_name not in facets:
                    facets[facet_name] = {}
                for value, count in facet_values.items():
                    facets[facet_name][value] = facets[facet_name].get(
                        value, 0) + count

    # Sort results by score and apply pagination
    all_results.sort(key=lambda x: x.score, reverse=True)

    # Apply pagination
    total_results = len(all_results)
    paginated_results = all_results[search_request.offset:
                                    search_request.offset + search_request.limit]

    # Generate suggestions (basic implementation)
    suggestions = _generate_suggestions(search_request.query)

    # Calculate execution time
    execution_time = time.time() - start_time

    # Store search in history
    await _store_search_history(db, current_admin.id, search_request, total_results)

    return GlobalSearchResult(
        query=search_request.query,
        total_results=total_results,
        results=paginated_results,
        facets=facets,
        execution_time=execution_time,
        suggestions=suggestions
    )


@router.get("/suggestions")
async def get_search_suggestions(
    query: str = Query(..., min_length=1,
                       description="Search query for suggestions"),
    current_admin: AdminUser = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get search suggestions based on query.
    """
    suggestions = _generate_suggestions(query)

    # Add popular searches
    popular_query = await db.execute(
        text("""
            SELECT query, COUNT(*) as frequency
            FROM search_history
            WHERE query ILIKE :pattern
            GROUP BY query
            ORDER BY frequency DESC
            LIMIT 5
        """),
        {"pattern": f"%{query}%"}
    )

    # In production, this would query actual search_history table
    # For now, return generated suggestions
    popular_searches = [
        f"{query} orders",
        f"{query} users",
        f"{query} analytics",
        f"{query} security",
        f"recent {query}"
    ]

    return {
        "suggestions": suggestions,
        "popular_searches": popular_searches[:3]
    }

# Search History Management


@router.get("/history", response_model=List[SearchHistory])
async def get_search_history(
    current_admin: AdminUser = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_async_db),
    limit: int = Query(default=20, ge=1, le=100)
):
    """
    Get user's search history.
    """
    # Mock data - in production, query search_history table
    history = [
        SearchHistory(
            id="hist_1",
            user_id=current_admin.id,
            query="security violations",
            filters=[
                SearchFilter(field="module", operator="eq",
                             value="audit_logs"),
                SearchFilter(field="severity", operator="eq", value="critical")
            ],
            results_count=15,
            timestamp=datetime.utcnow() - timedelta(hours=2)
        ),
        SearchHistory(
            id="hist_2",
            user_id=current_admin.id,
            query="tenant analytics",
            filters=[
                SearchFilter(field="module", operator="eq", value="tenants")
            ],
            results_count=42,
            timestamp=datetime.utcnow() - timedelta(hours=5)
        ),
        SearchHistory(
            id="hist_3",
            user_id=current_admin.id,
            query="user permissions",
            filters=[],
            results_count=8,
            timestamp=datetime.utcnow() - timedelta(days=1)
        )
    ]

    return history[:limit]


@router.delete("/history/{history_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_search_history_item(
    history_id: str,
    current_admin: AdminUser = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Delete a specific search history item.
    """
    # In production, delete from search_history table
    pass


@router.delete("/history", status_code=status.HTTP_204_NO_CONTENT)
async def clear_search_history(
    current_admin: AdminUser = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Clear all search history for the current user.
    """
    # In production, delete all history for current user
    pass

# Search Favorites Management


@router.get("/favorites", response_model=List[SearchFavorite])
async def get_search_favorites(
    current_admin: AdminUser = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get user's saved search favorites.
    """
    # Mock data - in production, query search_favorites table
    favorites = [
        SearchFavorite(
            id="fav_1",
            user_id=current_admin.id,
            name="Critical Security Events",
            query="security violations",
            filters=[
                SearchFilter(field="severity", operator="eq",
                             value="critical"),
                SearchFilter(field="event_type", operator="eq",
                             value="security_violation")
            ],
            created_at=datetime.utcnow() - timedelta(days=30),
            last_used=datetime.utcnow() - timedelta(hours=2)
        ),
        SearchFavorite(
            id="fav_2",
            user_id=current_admin.id,
            name="High Value Orders",
            query="orders",
            filters=[
                SearchFilter(field="total_amount", operator="gt", value=1000),
                SearchFilter(field="status", operator="eq", value="completed")
            ],
            created_at=datetime.utcnow() - timedelta(days=15),
            last_used=datetime.utcnow() - timedelta(days=3)
        )
    ]

    return favorites


@router.post("/favorites", response_model=SearchFavorite, status_code=status.HTTP_201_CREATED)
async def create_search_favorite(
    favorite_data: dict = Body(...),
    current_admin: AdminUser = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Save a search as a favorite.
    """
    favorite = SearchFavorite(
        id=f"fav_{int(time.time())}",
        user_id=current_admin.id,
        name=favorite_data["name"],
        query=favorite_data["query"],
        filters=[SearchFilter(**f) for f in favorite_data.get("filters", [])],
        created_at=datetime.utcnow(),
        last_used=None
    )

    # In production, save to search_favorites table

    return favorite


@router.delete("/favorites/{favorite_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_search_favorite(
    favorite_id: str,
    current_admin: AdminUser = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Delete a search favorite.
    """
    # In production, delete from search_favorites table
    pass

# Search Module Implementations


async def _search_tenants(db: AsyncSession, search_request: SearchRequest) -> Dict[str, Any]:
    """Search tenants module."""
    query_parts = []
    params = {"query": f"%{search_request.query}%"}

    # Apply tenant ID filters
    if search_request.tenant_ids:
        query_parts.append("id = ANY(:tenant_ids)")
        params["tenant_ids"] = search_request.tenant_ids

    # Apply custom filters
    for filter_item in search_request.filters:
        if filter_item.field == "is_active":
            query_parts.append("is_active = :is_active")
            params["is_active"] = filter_item.value
        elif filter_item.field == "is_verified":
            query_parts.append("is_verified = :is_verified")
            params["is_verified"] = filter_item.value

    where_clause = " AND ".join(query_parts) if query_parts else "1=1"

    search_query = text(f"""
        SELECT
            id,
            name,
            subdomain,
            display_name,
            is_active,
            is_verified,
            created_at,
            updated_at
        FROM tenants
        WHERE (name ILIKE :query OR subdomain ILIKE :query OR display_name ILIKE :query)
        AND {where_clause}
        ORDER BY
            CASE
                WHEN name ILIKE :query THEN 1
                WHEN subdomain ILIKE :query THEN 2
                ELSE 3
            END,
            created_at DESC
        LIMIT 100
    """)

    result = await db.execute(search_query, params)

    results = []
    facets = {"status": {}, "verification": {}}

    for row in result:
        # Calculate relevance score
        score = 1.0
        if search_request.query.lower() in row.name.lower():
            score += 2.0
        if search_request.query.lower() in row.subdomain.lower():
            score += 1.5

        results.append(SearchResultItem(
            id=str(row.id),
            type="tenant",
            title=row.display_name or row.name,
            description=f"Subdomain: {row.subdomain} | Status: {'Active' if row.is_active else 'Inactive'}",
            url=f"/admin/tenants/{row.id}",
            tenant_id=str(row.id),
            module="tenants",
            score=score,
            highlight={"name": [row.name], "subdomain": [row.subdomain]},
            metadata={
                "is_active": row.is_active,
                "is_verified": row.is_verified,
                "subdomain": row.subdomain
            },
            created_at=row.created_at,
            updated_at=row.updated_at
        ))

        # Update facets
        status = "active" if row.is_active else "inactive"
        verification = "verified" if row.is_verified else "unverified"
        facets["status"][status] = facets["status"].get(status, 0) + 1
        facets["verification"][verification] = facets["verification"].get(
            verification, 0) + 1

    return {"results": results, "facets": facets}


async def _search_users(db: AsyncSession, search_request: SearchRequest) -> Dict[str, Any]:
    """Search users module."""
    query_parts = []
    params = {"query": f"%{search_request.query}%"}

    # Apply tenant ID filters
    if search_request.tenant_ids:
        query_parts.append("tenant_id = ANY(:tenant_ids)")
        params["tenant_ids"] = search_request.tenant_ids

    # Apply custom filters
    for filter_item in search_request.filters:
        if filter_item.field == "is_active":
            query_parts.append("is_active = :is_active")
            params["is_active"] = filter_item.value

    where_clause = " AND ".join(query_parts) if query_parts else "1=1"

    search_query = text(f"""
        SELECT
            id,
            email,
            first_name,
            last_name,
            phone,
            is_active,
            tenant_id,
            created_at,
            updated_at,
            last_login
        FROM users
        WHERE (email ILIKE :query OR first_name ILIKE :query OR last_name ILIKE :query OR phone ILIKE :query)
        AND {where_clause}
        ORDER BY
            CASE
                WHEN email ILIKE :query THEN 1
                WHEN CONCAT(first_name, ' ', last_name) ILIKE :query THEN 2
                ELSE 3
            END,
            created_at DESC
        LIMIT 100
    """)

    result = await db.execute(search_query, params)

    results = []
    facets = {"status": {}, "activity": {}}

    for row in result:
        # Calculate relevance score
        score = 1.0
        full_name = f"{row.first_name} {row.last_name}".strip()
        if search_request.query.lower() in row.email.lower():
            score += 2.0
        if search_request.query.lower() in full_name.lower():
            score += 1.5

        # Determine activity status
        activity_status = "active"
        if row.last_login and row.last_login < datetime.utcnow() - timedelta(days=30):
            activity_status = "inactive"
        elif not row.last_login:
            activity_status = "never_logged_in"

        results.append(SearchResultItem(
            id=str(row.id),
            type="user",
            title=full_name or row.email,
            description=f"Email: {row.email} | Status: {'Active' if row.is_active else 'Inactive'}",
            url=f"/admin/users/{row.id}",
            tenant_id=str(row.tenant_id) if row.tenant_id else None,
            module="users",
            score=score,
            highlight={"email": [row.email], "name": [full_name]},
            metadata={
                "email": row.email,
                "is_active": row.is_active,
                "last_login": row.last_login.isoformat() if row.last_login else None,
                "activity_status": activity_status
            },
            created_at=row.created_at,
            updated_at=row.updated_at
        ))

        # Update facets
        status = "active" if row.is_active else "inactive"
        facets["status"][status] = facets["status"].get(status, 0) + 1
        facets["activity"][activity_status] = facets["activity"].get(
            activity_status, 0) + 1

    return {"results": results, "facets": facets}


async def _search_orders(db: AsyncSession, search_request: SearchRequest) -> Dict[str, Any]:
    """Search orders module."""
    query_parts = []
    params = {"query": f"%{search_request.query}%"}

    # Apply tenant ID filters
    if search_request.tenant_ids:
        query_parts.append("tenant_id = ANY(:tenant_ids)")
        params["tenant_ids"] = search_request.tenant_ids

    # Apply custom filters
    for filter_item in search_request.filters:
        if filter_item.field == "status":
            query_parts.append("status = :status")
            params["status"] = filter_item.value
        elif filter_item.field == "total_amount" and filter_item.operator == "gt":
            query_parts.append("total_amount > :min_amount")
            params["min_amount"] = filter_item.value

    where_clause = " AND ".join(query_parts) if query_parts else "1=1"

    search_query = text(f"""
        SELECT
            id,
            status,
            total_amount,
            currency,
            tenant_id,
            buyer_id,
            created_at,
            updated_at
        FROM orders
        WHERE (CAST(id AS TEXT) ILIKE :query OR status ILIKE :query)
        AND {where_clause}
        ORDER BY created_at DESC
        LIMIT 100
    """)

    result = await db.execute(search_query, params)

    results = []
    facets = {"status": {}, "amount_range": {}}

    for row in result:
        # Calculate relevance score
        score = 1.0
        if str(row.id) in search_request.query:
            score += 3.0
        if search_request.query.lower() in row.status.lower():
            score += 2.0

        # Determine amount range
        amount_range = "small"
        if row.total_amount > 1000:
            amount_range = "large"
        elif row.total_amount > 100:
            amount_range = "medium"

        results.append(SearchResultItem(
            id=str(row.id),
            type="order",
            title=f"Order #{row.id}",
            description=f"Status: {row.status} | Amount: {row.currency} {row.total_amount}",
            url=f"/admin/orders/{row.id}",
            tenant_id=str(row.tenant_id) if row.tenant_id else None,
            module="orders",
            score=score,
            highlight={"id": [str(row.id)], "status": [row.status]},
            metadata={
                "status": row.status,
                "total_amount": float(row.total_amount),
                "currency": row.currency,
                "amount_range": amount_range
            },
            created_at=row.created_at,
            updated_at=row.updated_at
        ))

        # Update facets
        facets["status"][row.status] = facets["status"].get(row.status, 0) + 1
        facets["amount_range"][amount_range] = facets["amount_range"].get(
            amount_range, 0) + 1

    return {"results": results, "facets": facets}


async def _search_products(db: AsyncSession, search_request: SearchRequest) -> Dict[str, Any]:
    """Search products module."""
    query_parts = []
    params = {"query": f"%{search_request.query}%"}

    # Apply tenant ID filters
    if search_request.tenant_ids:
        query_parts.append("tenant_id = ANY(:tenant_ids)")
        params["tenant_ids"] = search_request.tenant_ids

    # Apply custom filters
    for filter_item in search_request.filters:
        if filter_item.field == "is_active":
            query_parts.append("is_active = :is_active")
            params["is_active"] = filter_item.value

    where_clause = " AND ".join(query_parts) if query_parts else "1=1"

    search_query = text(f"""
        SELECT
            id,
            name,
            description,
            price,
            currency,
            is_active,
            inventory_quantity,
            tenant_id,
            created_at,
            updated_at
        FROM products
        WHERE (name ILIKE :query OR description ILIKE :query)
        AND {where_clause}
        ORDER BY
            CASE
                WHEN name ILIKE :query THEN 1
                WHEN description ILIKE :query THEN 2
                ELSE 3
            END,
            created_at DESC
        LIMIT 100
    """)

    result = await db.execute(search_query, params)

    results = []
    facets = {"status": {}, "price_range": {}, "availability": {}}

    for row in result:
        # Calculate relevance score
        score = 1.0
        if search_request.query.lower() in row.name.lower():
            score += 2.0
        if search_request.query.lower() in (row.description or "").lower():
            score += 1.0

        # Determine price range
        price_range = "low"
        if row.price > 1000:
            price_range = "high"
        elif row.price > 100:
            price_range = "medium"

        # Determine availability
        availability = "in_stock" if row.inventory_quantity > 0 else "out_of_stock"

        results.append(SearchResultItem(
            id=str(row.id),
            type="product",
            title=row.name,
            description=f"Price: {row.currency} {row.price} | Stock: {row.inventory_quantity}",
            url=f"/admin/products/{row.id}",
            tenant_id=str(row.tenant_id) if row.tenant_id else None,
            module="products",
            score=score,
            highlight={"name": [row.name],
                       "description": [row.description or ""]},
            metadata={
                "price": float(row.price),
                "currency": row.currency,
                "is_active": row.is_active,
                "inventory_quantity": row.inventory_quantity,
                "price_range": price_range,
                "availability": availability
            },
            created_at=row.created_at,
            updated_at=row.updated_at
        ))

        # Update facets
        status = "active" if row.is_active else "inactive"
        facets["status"][status] = facets["status"].get(status, 0) + 1
        facets["price_range"][price_range] = facets["price_range"].get(
            price_range, 0) + 1
        facets["availability"][availability] = facets["availability"].get(
            availability, 0) + 1

    return {"results": results, "facets": facets}


async def _search_audit_logs(db: AsyncSession, search_request: SearchRequest) -> Dict[str, Any]:
    """Search audit logs module."""
    query_parts = []
    params = {"query": f"%{search_request.query}%"}

    # Apply custom filters
    for filter_item in search_request.filters:
        if filter_item.field == "event_type":
            query_parts.append("event_type = :event_type")
            params["event_type"] = filter_item.value
        elif filter_item.field == "severity":
            # This would need to be calculated based on event_type
            pass

    where_clause = " AND ".join(query_parts) if query_parts else "1=1"

    search_query = text(f"""
        SELECT
            id,
            event_type,
            actor_id,
            target_id,
            target_type,
            details,
            created_at,
            ip_address
        FROM audit_logs
        WHERE (event_type ILIKE :query OR CAST(details AS TEXT) ILIKE :query)
        AND {where_clause}
        ORDER BY created_at DESC
        LIMIT 100
    """)

    result = await db.execute(search_query, params)

    results = []
    facets = {"event_type": {}, "severity": {}}

    for row in result:
        # Calculate relevance score
        score = 1.0
        if search_request.query.lower() in row.event_type.lower():
            score += 2.0

        # Determine severity
        severity = "info"
        if row.event_type in ["security_violation", "emergency_lockdown", "system_error"]:
            severity = "critical"
        elif row.event_type in ["authentication_failed", "rate_limit_exceeded"]:
            severity = "warning"

        results.append(SearchResultItem(
            id=str(row.id),
            type="audit_log",
            title=row.event_type.replace("_", " ").title(),
            description=f"Actor: {row.actor_id or 'System'} | Target: {row.target_type or 'N/A'}",
            url=f"/admin/audit-logs/{row.id}",
            tenant_id=None,  # Audit logs are global
            module="audit_logs",
            score=score,
            highlight={"event_type": [row.event_type]},
            metadata={
                "event_type": row.event_type,
                "actor_id": str(row.actor_id) if row.actor_id else None,
                "target_type": row.target_type,
                "severity": severity,
                "ip_address": row.ip_address
            },
            created_at=row.created_at,
            updated_at=row.created_at  # Audit logs don't have updated_at
        ))

        # Update facets
        facets["event_type"][row.event_type] = facets["event_type"].get(
            row.event_type, 0) + 1
        facets["severity"][severity] = facets["severity"].get(severity, 0) + 1

    return {"results": results, "facets": facets}


def _generate_suggestions(query: str) -> List[str]:
    """Generate search suggestions based on query."""
    suggestions = []

    # Common search patterns
    if "user" in query.lower():
        suggestions.extend(
            ["user permissions", "user activity", "user analytics"])
    elif "order" in query.lower():
        suggestions.extend(
            ["order status", "order analytics", "order history"])
    elif "tenant" in query.lower():
        suggestions.extend(
            ["tenant analytics", "tenant activity", "tenant settings"])
    elif "security" in query.lower():
        suggestions.extend(
            ["security violations", "security events", "security analytics"])
    else:
        # Generic suggestions
        suggestions.extend([
            f"{query} analytics",
            f"{query} reports",
            f"recent {query}",
            f"{query} activity"
        ])

    return suggestions[:5]


async def _store_search_history(
    db: AsyncSession,
    user_id: str,
    search_request: SearchRequest,
    results_count: int
):
    """Store search in history for future reference."""
    # In production, store in search_history table
    # For now, this is a placeholder
    pass
