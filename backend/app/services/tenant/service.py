"""
Tenant service module.

This module provides service functions for managing tenants, including
domain resolution, tenant CRUD operations, and validation.
"""

from typing import Optional, List, Dict, Any, Union
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select, update, delete, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.app.models.tenant import Tenant
from app.app.core.errors.exceptions import EntityNotFoundException, DuplicateEntityException


class TenantService:
    """Service for tenant management and domain resolution."""

    async def create_tenant(
        self,
        db: AsyncSession,
        *,
        name: str,
        subdomain: str,
        custom_domain: Optional[str] = None,
        **kwargs
    ) -> Tenant:
        """
        Create a new tenant.

        Args:
            db: Database session
            name: Name of the tenant
            subdomain: Subdomain for the tenant (must be unique)
            admin_user_id: ID of the admin user who owns this tenant
            custom_domain: Optional custom domain for the tenant
            **kwargs: Additional fields for the tenant

        Returns:
            The created tenant

        Raises:
            DuplicateEntityException: If subdomain or custom domain already exists
        """
        # Check if subdomain already exists
        existing_subdomain = await self.get_tenant_by_subdomain(db, subdomain=subdomain)
        if existing_subdomain:
            raise DuplicateEntityException(
                f"Subdomain '{subdomain}' is already taken")

        # Check if custom domain already exists (if provided)
        if custom_domain:
            existing_domain = await self.get_tenant_by_domain(db, domain=custom_domain)
            if existing_domain:
                raise DuplicateEntityException(
                    f"Domain '{custom_domain}' is already registered")

        # Create tenant object
        tenant_data = {
            "name": name,
            "subdomain": subdomain,
            "custom_domain": custom_domain,
            **kwargs
        }
        tenant = Tenant(**tenant_data)

        # Add and commit to database
        db.add(tenant)
        await db.commit()
        await db.refresh(tenant)

        return tenant

    async def get_tenant_by_id(
        self,
        db: AsyncSession,
        *,
        tenant_id: UUID
    ) -> Tenant:
        """
        Get a tenant by ID.

        Args:
            db: Database session
            tenant_id: ID of the tenant to retrieve

        Returns:
            The tenant

        Raises:
            EntityNotFoundException: If tenant not found
        """
        tenant = await db.get(Tenant, tenant_id)
        if not tenant:
            raise EntityNotFoundException(
                f"Tenant with ID {tenant_id} not found")
        return tenant

    async def get_tenant_by_subdomain(
        self,
        db: AsyncSession,
        *,
        subdomain: str
    ) -> Optional[Tenant]:
        """
        Get a tenant by subdomain.

        Args:
            db: Database session
            subdomain: Subdomain to look up

        Returns:
            The tenant or None if not found
        """
        query = select(Tenant).where(Tenant.subdomain == subdomain.lower())
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_tenant_by_domain(
        self,
        db: AsyncSession,
        *,
        domain: str
    ) -> Optional[Tenant]:
        """
        Get a tenant by custom domain.

        Args:
            db: Database session
            domain: Custom domain to look up

        Returns:
            The tenant or None if not found
        """
        query = select(Tenant).where(Tenant.custom_domain == domain.lower())
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def resolve_tenant_by_hostname(
        self,
        db: AsyncSession,
        *,
        hostname: str,
        base_domain: Optional[str] = None
    ) -> Optional[Tenant]:
        """
        Resolve a tenant from a hostname (either subdomain or custom domain).

        Args:
            db: Database session
            hostname: The hostname to resolve (e.g., merchant123.yourplatform.com or mysalon.com)
            base_domain: Optional base domain for subdomain resolution (e.g., yourplatform.com)

        Returns:
            The resolved tenant or None if not found
        """
        # Try to resolve as custom domain first
        tenant = await self.get_tenant_by_domain(db, domain=hostname)
        if tenant:
            return tenant

        # If base_domain is provided, try to extract subdomain
        if base_domain and hostname.endswith(f".{base_domain}"):
            subdomain = hostname.replace(f".{base_domain}", "")
            tenant = await self.get_tenant_by_subdomain(db, subdomain=subdomain)
            if tenant:
                return tenant

        # No tenant found for this hostname
        return None

    async def list_tenants(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 100,
        filter_params: Optional[Dict[str, Any]] = None
    ) -> List[Tenant]:
        """
        List tenants with optional filtering and pagination.

        Args:
            db: Database session
            skip: Number of records to skip
            limit: Maximum number of records to return
            filter_params: Optional filter parameters

        Returns:
            List of tenants
        """
        query = select(Tenant)

        # Apply filters if provided
        if filter_params:
            if "name" in filter_params:
                query = query.where(Tenant.name.ilike(
                    f"%{filter_params['name']}%"))
            if "is_active" in filter_params:
                query = query.where(Tenant.is_active ==
                                    filter_params["is_active"])

        # Apply pagination
        query = query.offset(skip).limit(limit)

        result = await db.execute(query)
        return list(result.scalars().all())

    async def update_tenant(
        self,
        db: AsyncSession,
        *,
        tenant_id: UUID,
        update_data: Dict[str, Any]
    ) -> Tenant:
        """
        Update a tenant.

        Args:
            db: Database session
            tenant_id: ID of the tenant to update
            update_data: Data to update

        Returns:
            The updated tenant

        Raises:
            EntityNotFoundException: If tenant not found
            DuplicateEntityException: If subdomain or domain already exists
        """
        # Get tenant to update
        tenant = await self.get_tenant_by_id(db, tenant_id=tenant_id)

        # Check subdomain uniqueness if changing
        if "subdomain" in update_data and update_data["subdomain"] != tenant.subdomain:
            existing = await self.get_tenant_by_subdomain(
                db, subdomain=update_data["subdomain"]
            )
            if existing:
                raise DuplicateEntityException(
                    f"Subdomain '{update_data['subdomain']}' is already taken"
                )

        # Check custom domain uniqueness if changing
        if "custom_domain" in update_data and update_data["custom_domain"] != tenant.custom_domain:
            if update_data["custom_domain"]:  # Only check if not None
                existing = await self.get_tenant_by_domain(
                    db, domain=update_data["custom_domain"]
                )
                if existing:
                    raise DuplicateEntityException(
                        f"Domain '{update_data['custom_domain']}' is already registered"
                    )

        # Update tenant attributes
        for key, value in update_data.items():
            setattr(tenant, key, value)

        # Commit changes
        await db.commit()
        await db.refresh(tenant)

        return tenant

    async def delete_tenant(
        self,
        db: AsyncSession,
        *,
        tenant_id: UUID
    ) -> None:
        """
        Delete a tenant.

        Args:
            db: Database session
            tenant_id: ID of the tenant to delete

        Raises:
            EntityNotFoundException: If tenant not found
        """
        # Get tenant to delete
        tenant = await self.get_tenant_by_id(db, tenant_id=tenant_id)

        # Delete tenant
        await db.delete(tenant)
        await db.commit()
