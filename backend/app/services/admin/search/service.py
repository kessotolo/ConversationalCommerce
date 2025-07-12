"""
Global search service module.

This module provides service functions for cross-tenant searching with permission filtering.
"""

from typing import Dict, Any, List, Optional, Set, Tuple
from uuid import UUID
import logging
from enum import Enum

from sqlalchemy import or_, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.tenant import Tenant
from backend.app.models.admin.admin_user import AdminUser
from backend.app.services.admin.permission.service import PermissionService


logger = logging.getLogger(__name__)


class SearchEntityType(str, Enum):
    """Types of entities that can be searched."""
    TENANT = "tenant"
    USER = "user"
    PRODUCT = "product"
    ORDER = "order"
    CONVERSATION = "conversation"
    PAYMENT = "payment"
    TICKET = "ticket"
    # Add more entity types as needed


class GlobalSearchService:
    """Service for cross-tenant searching with permission filtering."""

    def __init__(self):
        """Initialize the global search service."""
        self.permission_service = PermissionService()

    async def search(
        self,
        db: AsyncSession,
        admin_user: AdminUser,
        *,
        query: str,
        entity_types: Optional[List[SearchEntityType]] = None,
        tenant_id: Optional[UUID] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """
        Perform a global search across multiple entity types with permission filtering.

        Args:
            db: Database session
            admin_user: Admin user performing the search
            query: Search query string
            entity_types: Types of entities to search (defaults to all)
            tenant_id: Optional tenant ID to limit search scope
            page: Page number for pagination
            page_size: Number of results per page

        Returns:
            Search results grouped by entity type
        """
        # Get accessible tenants based on user permissions
        accessible_tenant_ids = await self._get_accessible_tenant_ids(db, admin_user, tenant_id)

        # If no accessible tenants, return empty results
        if not accessible_tenant_ids:
            return {
                "query": query,
                "total_count": 0,
                "page": page,
                "page_size": page_size,
                "results": {}
            }

        # Default to all entity types if none specified
        if entity_types is None:
            entity_types = list(SearchEntityType)

        # Initialize results container
        results: Dict[str, List[Dict[str, Any]]] = {}
        total_count = 0

        # Calculate offset for pagination
        offset = (page - 1) * page_size

        # Search each entity type
        for entity_type in entity_types:
            # Get search function for entity type
            search_func = self._get_search_function(entity_type)

            # Perform search if function exists
            if search_func:
                entity_results, entity_count = await search_func(
                    db,
                    query,
                    accessible_tenant_ids,
                    admin_user,
                    offset,
                    page_size
                )

                # Add results to container
                results[entity_type.value] = entity_results
                total_count += entity_count

        # Return combined results
        return {
            "query": query,
            "total_count": total_count,
            "page": page,
            "page_size": page_size,
            "results": results
        }

    async def _get_accessible_tenant_ids(
        self,
        db: AsyncSession,
        admin_user: AdminUser,
        tenant_id: Optional[UUID] = None
    ) -> Set[UUID]:
        """
        Get the set of tenant IDs that the admin user has access to.

        Args:
            db: Database session
            admin_user: Admin user
            tenant_id: Optional specific tenant ID

        Returns:
            Set of accessible tenant IDs
        """
        # Super admins have access to all tenants
        if admin_user.is_super_admin:
            if tenant_id:
                return {tenant_id}
            else:
                # Get all tenant IDs
                query = await db.execute(
                    func.array_agg(Tenant.id.distinct())
                )
                tenant_ids = query.scalar() or []
                return set(tenant_ids)

        # For regular admin users, check specific tenant permissions
        permitted_tenants = set()

        # Check if user has cross-tenant permissions
        has_cross_tenant = await self.permission_service.has_permission(
            db,
            admin_user.user_id,
            "tenant:list",
            scope="global"
        )

        if has_cross_tenant:
            # User has cross-tenant access, get all tenant IDs
            query = await db.execute(
                func.array_agg(Tenant.id.distinct())
            )
            tenant_ids = query.scalar() or []
            permitted_tenants.update(tenant_ids)
        else:
            # Get tenant IDs user has explicit permissions for
            permitted_tenant_ids = await self.permission_service.get_permitted_tenant_ids(
                db, admin_user.user_id
            )
            permitted_tenants.update(permitted_tenant_ids)

        # Filter by specific tenant if provided
        if tenant_id:
            return {tenant_id} if tenant_id in permitted_tenants else set()

        return permitted_tenants

    def _get_search_function(self, entity_type: SearchEntityType):
        """
        Get the search function for a specific entity type.

        Args:
            entity_type: Type of entity to search

        Returns:
            Search function for the entity type
        """
        search_functions = {
            SearchEntityType.TENANT: self._search_tenants,
            SearchEntityType.USER: self._search_users,
            SearchEntityType.PRODUCT: self._search_products,
            SearchEntityType.ORDER: self._search_orders,
            SearchEntityType.CONVERSATION: self._search_conversations,
            SearchEntityType.PAYMENT: self._search_payments,
            SearchEntityType.TICKET: self._search_tickets,
        }
        return search_functions.get(entity_type)

    async def _search_tenants(
        self,
        db: AsyncSession,
        query: str,
        accessible_tenant_ids: Set[UUID],
        admin_user: AdminUser,
        offset: int,
        limit: int
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        Search for tenants matching the query.

        Args:
            db: Database session
            query: Search query
            accessible_tenant_ids: Set of accessible tenant IDs
            admin_user: Admin user performing the search
            offset: Pagination offset
            limit: Pagination limit

        Returns:
            Tuple of (list of tenant results, total count)
        """
        # Prepare search query
        search_query = or_(
            Tenant.name.ilike(f"%{query}%"),
            Tenant.subdomain.ilike(f"%{query}%"),
            Tenant.custom_domain.ilike(f"%{query}%"),
            Tenant.display_name.ilike(f"%{query}%")
        )

        # Add tenant filter
        tenant_filter = Tenant.id.in_(accessible_tenant_ids)
        combined_filter = and_(search_query, tenant_filter)

        # Get total count
        count_query = await db.execute(
            func.count(Tenant.id).where(combined_filter)
        )
        total_count = count_query.scalar() or 0

        # Get paginated results
        results_query = await db.execute(
            func.jsonb_agg(
                func.jsonb_build_object(
                    "id", Tenant.id,
                    "name", Tenant.name,
                    "subdomain", Tenant.subdomain,
                    "custom_domain", Tenant.custom_domain,
                    "display_name", Tenant.display_name,
                    "logo_url", Tenant.logo_url,
                    "is_active", Tenant.is_active
                )
            ).where(combined_filter).offset(offset).limit(limit)
        )

        results = results_query.scalar() or []

        return results, total_count

    async def _search_users(
        self,
        db: AsyncSession,
        query: str,
        accessible_tenant_ids: Set[UUID],
        admin_user: AdminUser,
        offset: int,
        limit: int
    ) -> Tuple[List[Dict[str, Any]], int]:
        """
        Search for users matching the query.

        Args:
            db: Database session
            query: Search query
            accessible_tenant_ids: Set of accessible tenant IDs
            admin_user: Admin user performing the search
            offset: Pagination offset
            limit: Pagination limit

        Returns:
            Tuple of (list of user results, total count)
        """
        # This would be implemented to search the User model
        # For now, return empty results as placeholder
        return [], 0

    async def _search_products(
        self,
        db: AsyncSession,
        query: str,
        accessible_tenant_ids: Set[UUID],
        admin_user: AdminUser,
        offset: int,
        limit: int
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Search for products matching the query."""
        # This would be implemented to search the Product model
        return [], 0

    async def _search_orders(
        self,
        db: AsyncSession,
        query: str,
        accessible_tenant_ids: Set[UUID],
        admin_user: AdminUser,
        offset: int,
        limit: int
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Search for orders matching the query."""
        # This would be implemented to search the Order model
        return [], 0

    async def _search_conversations(
        self,
        db: AsyncSession,
        query: str,
        accessible_tenant_ids: Set[UUID],
        admin_user: AdminUser,
        offset: int,
        limit: int
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Search for conversations matching the query."""
        # This would be implemented to search the Conversation model
        return [], 0

    async def _search_payments(
        self,
        db: AsyncSession,
        query: str,
        accessible_tenant_ids: Set[UUID],
        admin_user: AdminUser,
        offset: int,
        limit: int
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Search for payments matching the query."""
        # This would be implemented to search the Payment model
        return [], 0

    async def _search_tickets(
        self,
        db: AsyncSession,
        query: str,
        accessible_tenant_ids: Set[UUID],
        admin_user: AdminUser,
        offset: int,
        limit: int
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Search for support tickets matching the query."""
        # This would be implemented to search the Ticket model
        return [], 0
