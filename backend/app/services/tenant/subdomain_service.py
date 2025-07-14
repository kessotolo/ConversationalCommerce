"""
Subdomain Service for tenant subdomain management.

Handles subdomain uniqueness checking, assignment, and Shopify-style
auto-incrementing suffixes for duplicate names.
"""

import re
import uuid
from typing import Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException, status

from app.models.tenant import Tenant


class SubdomainService:
    """
    Service for managing tenant subdomains with Shopify-style logic.

    Features:
    - Subdomain uniqueness validation
    - Auto-incrementing suffixes for duplicates
    - Reserved subdomain protection
    - Subdomain format validation
    """

    # Reserved subdomains that cannot be used
    RESERVED_SUBDOMAINS = {
        "www", "admin", "api", "app", "dashboard", "mail", "smtp",
        "webmail", "support", "help", "billing", "payment", "store",
        "shop", "blog", "news", "info", "contact", "about", "terms",
        "privacy", "login", "signup", "signin", "register", "account",
        "profile", "settings", "preferences", "notifications", "security"
    }

    # Subdomain format validation regex
    SUBDOMAIN_REGEX = re.compile(r'^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$')

    def __init__(self):
        pass

    def validate_subdomain_format(self, subdomain: str) -> bool:
        """
        Validate subdomain format according to DNS standards.

        Args:
            subdomain: The subdomain to validate

        Returns:
            True if valid, False otherwise
        """
        if not subdomain:
            return False

        # Convert to lowercase
        subdomain = subdomain.lower().strip()

        # Check regex pattern
        if not self.SUBDOMAIN_REGEX.match(subdomain):
            return False

        # Check length (DNS limit is 63 characters)
        if len(subdomain) > 63:
            return False

        # Check for reserved subdomains
        if subdomain in self.RESERVED_SUBDOMAINS:
            return False

        return True

    async def check_subdomain_availability(
        self,
        db: AsyncSession,
        subdomain: str
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Check if a subdomain is available and suggest alternatives.

        Args:
            db: Database session
            subdomain: The subdomain to check

        Returns:
            Tuple of (is_available, suggested_subdomain, reason)
        """
        # Validate format
        if not self.validate_subdomain_format(subdomain):
            return False, None, "Invalid subdomain format"

        # Check if subdomain exists
        existing_tenant_query = select(Tenant).where(
            Tenant.subdomain == subdomain)
        existing_result = await db.execute(existing_tenant_query)
        existing_tenant = existing_result.scalar_one_or_none()

        if existing_tenant:
            # Subdomain is taken, suggest alternatives
            suggested = await self._suggest_alternative_subdomain(db, subdomain)
            return False, suggested, "Subdomain is already taken"

        return True, subdomain, None

    async def _suggest_alternative_subdomain(
        self,
        db: AsyncSession,
        base_subdomain: str
    ) -> str:
        """
        Suggest an alternative subdomain with auto-incrementing suffix.

        Args:
            db: Database session
            base_subdomain: The base subdomain that was taken

        Returns:
            Suggested alternative subdomain
        """
        # Find the highest suffix number for this base subdomain
        pattern = f"{base_subdomain}-%"

        # Query for existing subdomains with this pattern
        existing_query = select(Tenant.subdomain).where(
            Tenant.subdomain.like(pattern)
        )
        existing_result = await db.execute(existing_query)
        existing_subdomains = [row[0] for row in existing_result.fetchall()]

        if not existing_subdomains:
            # No existing suffixes, start with -1
            return f"{base_subdomain}-1"

        # Extract numbers from existing subdomains
        numbers = []
        for subdomain in existing_subdomains:
            try:
                # Extract number from "base-name" format
                suffix = subdomain.replace(f"{base_subdomain}-", "")
                if suffix.isdigit():
                    numbers.append(int(suffix))
            except (ValueError, AttributeError):
                continue

        if not numbers:
            # No valid numbers found, start with -1
            return f"{base_subdomain}-1"

        # Find the next available number
        next_number = max(numbers) + 1
        return f"{base_subdomain}-{next_number}"

    async def assign_subdomain(
        self,
        db: AsyncSession,
        requested_subdomain: str
    ) -> str:
        """
        Assign a subdomain, automatically handling duplicates.

        Args:
            db: Database session
            requested_subdomain: The requested subdomain

        Returns:
            The assigned subdomain (may be different from requested)
        """
        # Check availability
        is_available, suggested, reason = await self.check_subdomain_availability(
            db, requested_subdomain
        )

        if is_available:
            return requested_subdomain

        # Use the suggested alternative
        if suggested:
            return suggested

        # Fallback: generate a unique subdomain
        return await self._generate_unique_subdomain(db, requested_subdomain)

    async def _generate_unique_subdomain(
        self,
        db: AsyncSession,
        base_subdomain: str
    ) -> str:
        """
        Generate a unique subdomain when all alternatives are taken.

        Args:
            db: Database session
            base_subdomain: The base subdomain

        Returns:
            A unique subdomain
        """
        # Try with UUID suffix
        unique_id = str(uuid.uuid4())[:8]  # First 8 characters
        candidate = f"{base_subdomain}-{unique_id}"

        # Check if this is available
        is_available, _, _ = await self.check_subdomain_availability(db, candidate)

        if is_available:
            return candidate

        # If still not available, use just the UUID
        return f"store-{unique_id}"

    async def get_tenant_by_subdomain(
        self,
        db: AsyncSession,
        subdomain: str
    ) -> Optional[Tenant]:
        """
        Get tenant by subdomain.

        Args:
            db: Database session
            subdomain: The subdomain to look up

        Returns:
            Tenant object if found, None otherwise
        """
        query = select(Tenant).where(
            Tenant.subdomain == subdomain,
            Tenant.is_active == True
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def update_tenant_subdomain(
        self,
        db: AsyncSession,
        tenant_id: str,
        new_subdomain: str
    ) -> Tenant:
        """
        Update a tenant's subdomain with validation.

        Args:
            db: Database session
            tenant_id: The tenant ID
            new_subdomain: The new subdomain

        Returns:
            Updated tenant object

        Raises:
            HTTPException: If subdomain is invalid or already taken
        """
        # Validate format
        if not self.validate_subdomain_format(new_subdomain):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid subdomain format"
            )

        # Check availability (excluding current tenant)
        existing_query = select(Tenant).where(
            Tenant.subdomain == new_subdomain,
            Tenant.id != tenant_id
        )
        existing_result = await db.execute(existing_query)
        existing_tenant = existing_result.scalar_one_or_none()

        if existing_tenant:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Subdomain is already taken"
            )

        # Update tenant
        tenant_query = select(Tenant).where(Tenant.id == tenant_id)
        tenant_result = await db.execute(tenant_query)
        tenant = tenant_result.scalar_one_or_none()

        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )

        tenant.subdomain = new_subdomain
        await db.commit()
        await db.refresh(tenant)

        return tenant
