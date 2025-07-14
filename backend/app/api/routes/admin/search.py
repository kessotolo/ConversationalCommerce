"""
Global search API routes for admin users.

This module provides API endpoints for cross-tenant searching with permission filtering.
"""

from typing import Dict, Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.admin.admin_user import AdminUser
from app.services.admin.search.service import GlobalSearchService, SearchEntityType
from app.services.admin.auth.dependencies import get_current_admin_user


router = APIRouter(prefix="/admin/search", tags=["admin-search"])


@router.get("/", response_model=Dict[str, Any])
async def global_search(
    query: str = Query(..., description="Search query string"),
    entity_types: Optional[List[SearchEntityType]] = Query(
        None, description="Types of entities to search"
    ),
    tenant_id: Optional[UUID] = Query(None, description="Optional tenant ID to limit search scope"),
    page: int = Query(1, description="Page number for pagination", ge=1),
    page_size: int = Query(20, description="Number of results per page", ge=1, le=100),
    admin_user: AdminUser = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Perform a global search across multiple entity types with permission filtering.
    
    Results are filtered based on the admin user's permissions and tenant access.
    """
    search_service = GlobalSearchService()
    
    results = await search_service.search(
        db=db,
        admin_user=admin_user,
        query=query,
        entity_types=entity_types,
        tenant_id=tenant_id,
        page=page,
        page_size=page_size
    )
    
    return results
