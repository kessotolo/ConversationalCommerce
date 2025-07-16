"""
Merchant ID Generation and Validation Service.

This service provides standardized merchant ID generation, validation, and management
for the multi-tenant platform.

Phase 2 Track A: Implement merchant ID generation and validation
"""

import re
import uuid
import hashlib
from typing import Optional, Tuple, Dict, Any, List
from enum import Enum
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException, status

from app.models.tenant import Tenant
from app.core.exceptions import ValidationError, ResourceConflictError


class MerchantIdType(str, Enum):
    """Types of merchant IDs supported by the platform."""
    UUID = "uuid"              # Standard UUID format
    SUBDOMAIN = "subdomain"     # Human-readable subdomain format
    CUSTOM = "custom"           # Custom merchant ID format
    SHORT_CODE = "short_code"   # 8-character alphanumeric code


class MerchantIdFormat:
    """Merchant ID format validation patterns."""

    # UUID pattern
    UUID_PATTERN = re.compile(
        r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
        re.IGNORECASE
    )

    # Subdomain pattern (3-63 chars, alphanumeric with hyphens, not starting/ending with hyphen)
    SUBDOMAIN_PATTERN = re.compile(r'^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$')

    # Short code pattern (8 alphanumeric characters)
    SHORT_CODE_PATTERN = re.compile(r'^[a-z0-9]{8}$')

    # Custom pattern (3-30 chars, alphanumeric with underscores and hyphens)
    CUSTOM_PATTERN = re.compile(r'^[a-z0-9]([a-z0-9_-]{1,28}[a-z0-9])?$')


class MerchantIdService:
    """
    Service for generating, validating, and managing merchant IDs.

    Supports multiple ID formats:
    - UUID: Standard universally unique identifiers
    - Subdomain: Human-readable subdomain-style IDs
    - Short Code: 8-character alphanumeric codes
    - Custom: User-defined IDs with validation
    """

    # Reserved merchant IDs that cannot be used
    RESERVED_IDS = {
        "admin", "api", "app", "www", "mail", "smtp", "ftp", "billing",
        "support", "help", "blog", "news", "docs", "legal", "terms",
        "privacy", "security", "status", "health", "metrics", "analytics",
        "dashboard", "control", "system", "internal", "dev", "test",
        "staging", "production", "backup", "restore", "migrate", "setup",
        "config", "settings", "preferences", "account", "profile", "user",
        "users", "customer", "customers", "merchant", "merchants", "store",
        "shop", "cart", "checkout", "payment", "payments", "order", "orders",
        "product", "products", "catalog", "inventory", "shipping", "delivery",
        "webhook", "webhooks", "callback", "callbacks", "notification",
        "notifications", "email", "sms", "whatsapp", "instagram", "facebook",
        "twitter", "linkedin", "youtube", "tiktok", "snapchat", "telegram"
    }

    def __init__(self):
        self.formats = MerchantIdFormat()

    async def generate_merchant_id(
        self,
        db: AsyncSession,
        preferred_name: Optional[str] = None,
        id_type: MerchantIdType = MerchantIdType.SUBDOMAIN,
        business_name: Optional[str] = None,
        max_attempts: int = 10
    ) -> str:
        """
        Generate a unique merchant ID.

        Args:
            db: Database session
            preferred_name: Preferred merchant ID (if available)
            id_type: Type of merchant ID to generate
            business_name: Business name for subdomain generation
            max_attempts: Maximum generation attempts

        Returns:
            A unique merchant ID

        Raises:
            ResourceConflictError: If unable to generate unique ID
        """
        if id_type == MerchantIdType.UUID:
            return str(uuid.uuid4())

        elif id_type == MerchantIdType.SUBDOMAIN:
            return await self._generate_subdomain_id(
                db, preferred_name, business_name, max_attempts
            )

        elif id_type == MerchantIdType.SHORT_CODE:
            return await self._generate_short_code(db, max_attempts)

        elif id_type == MerchantIdType.CUSTOM:
            if not preferred_name:
                raise ValidationError(
                    "Preferred name required for custom merchant ID")
            return await self._generate_custom_id(db, preferred_name, max_attempts)

        else:
            raise ValidationError(f"Unsupported merchant ID type: {id_type}")

    async def _generate_subdomain_id(
        self,
        db: AsyncSession,
        preferred_name: Optional[str] = None,
        business_name: Optional[str] = None,
        max_attempts: int = 10
    ) -> str:
        """Generate a subdomain-style merchant ID."""

        # Use preferred name if provided, otherwise derive from business name
        base_name = preferred_name or business_name or "merchant"

        # Normalize the base name
        base_id = self._normalize_for_subdomain(base_name)

        # Check if base ID is available
        if await self._is_merchant_id_available(db, base_id):
            return base_id

        # Try with incrementing suffixes
        for i in range(1, max_attempts + 1):
            candidate = f"{base_id}-{i}"
            if await self._is_merchant_id_available(db, candidate):
                return candidate

        # Fallback to UUID-based suffix
        suffix = str(uuid.uuid4())[:8]
        candidate = f"{base_id}-{suffix}"

        if await self._is_merchant_id_available(db, candidate):
            return candidate

        raise ResourceConflictError(
            f"Unable to generate unique subdomain merchant ID after {max_attempts} attempts"
        )

    async def _generate_short_code(
        self,
        db: AsyncSession,
        max_attempts: int = 10
    ) -> str:
        """Generate an 8-character alphanumeric short code."""

        for _ in range(max_attempts):
            # Generate 8-character code
            code = self._generate_random_code(8)

            if await self._is_merchant_id_available(db, code):
                return code

        raise ResourceConflictError(
            f"Unable to generate unique short code after {max_attempts} attempts"
        )

    async def _generate_custom_id(
        self,
        db: AsyncSession,
        preferred_name: str,
        max_attempts: int = 10
    ) -> str:
        """Generate a custom merchant ID with validation."""

        # Normalize the preferred name
        base_id = self._normalize_for_custom(preferred_name)

        # Validate format
        is_valid, error = self.validate_merchant_id_format(
            base_id, MerchantIdType.CUSTOM)
        if not is_valid:
            raise ValidationError(
                f"Invalid custom merchant ID format: {error}")

        # Check availability
        if await self._is_merchant_id_available(db, base_id):
            return base_id

        # Try with suffixes
        for i in range(1, max_attempts + 1):
            candidate = f"{base_id}_{i}"

            # Validate the candidate
            is_valid, _ = self.validate_merchant_id_format(
                candidate, MerchantIdType.CUSTOM)
            if not is_valid:
                continue

            if await self._is_merchant_id_available(db, candidate):
                return candidate

        raise ResourceConflictError(
            f"Unable to generate unique custom merchant ID after {max_attempts} attempts"
        )

    def _normalize_for_subdomain(self, name: str) -> str:
        """Normalize a name for subdomain use."""
        # Convert to lowercase
        normalized = name.lower()

        # Replace spaces and special chars with hyphens
        normalized = re.sub(r'[^a-z0-9-]', '-', normalized)

        # Remove multiple consecutive hyphens
        normalized = re.sub(r'-+', '-', normalized)

        # Remove leading/trailing hyphens
        normalized = normalized.strip('-')

        # Ensure minimum length
        if len(normalized) < 3:
            normalized = f"merchant-{normalized}"

        # Ensure maximum length
        if len(normalized) > 63:
            normalized = normalized[:63].rstrip('-')

        return normalized

    def _normalize_for_custom(self, name: str) -> str:
        """Normalize a name for custom ID use."""
        # Convert to lowercase
        normalized = name.lower()

        # Replace spaces and special chars with underscores
        normalized = re.sub(r'[^a-z0-9_-]', '_', normalized)

        # Remove multiple consecutive underscores/hyphens
        normalized = re.sub(r'[_-]+', '_', normalized)

        # Remove leading/trailing underscores/hyphens
        normalized = normalized.strip('_-')

        # Ensure minimum length
        if len(normalized) < 3:
            normalized = f"merchant_{normalized}"

        # Ensure maximum length
        if len(normalized) > 30:
            normalized = normalized[:30].rstrip('_-')

        return normalized

    def _generate_random_code(self, length: int) -> str:
        """Generate a random alphanumeric code."""
        import random
        import string

        chars = string.ascii_lowercase + string.digits
        return ''.join(random.choice(chars) for _ in range(length))

    async def _is_merchant_id_available(
        self,
        db: AsyncSession,
        merchant_id: str
    ) -> bool:
        """Check if a merchant ID is available."""

        # Check if reserved
        if merchant_id.lower() in self.RESERVED_IDS:
            return False

        # Check database for existing tenants
        # Check both subdomain and ID fields
        query = select(func.count(Tenant.id)).where(
            (Tenant.subdomain == merchant_id) |
            (Tenant.id == merchant_id)
        )

        result = await db.execute(query)
        count = result.scalar()

        return count == 0

    def validate_merchant_id_format(
        self,
        merchant_id: str,
        id_type: MerchantIdType
    ) -> Tuple[bool, Optional[str]]:
        """
        Validate merchant ID format.

        Args:
            merchant_id: The merchant ID to validate
            id_type: The expected type of merchant ID

        Returns:
            Tuple of (is_valid, error_message)
        """
        if not merchant_id:
            return False, "Merchant ID cannot be empty"

        # Check length limits
        if len(merchant_id) > 255:
            return False, "Merchant ID too long (max 255 characters)"

        # Type-specific validation
        if id_type == MerchantIdType.UUID:
            if not self.formats.UUID_PATTERN.match(merchant_id):
                return False, "Invalid UUID format"

        elif id_type == MerchantIdType.SUBDOMAIN:
            if not self.formats.SUBDOMAIN_PATTERN.match(merchant_id):
                return False, "Invalid subdomain format (3-63 chars, alphanumeric with hyphens, not starting/ending with hyphen)"

        elif id_type == MerchantIdType.SHORT_CODE:
            if not self.formats.SHORT_CODE_PATTERN.match(merchant_id):
                return False, "Invalid short code format (8 alphanumeric characters)"

        elif id_type == MerchantIdType.CUSTOM:
            if not self.formats.CUSTOM_PATTERN.match(merchant_id):
                return False, "Invalid custom format (3-30 chars, alphanumeric with underscores/hyphens, not starting/ending with special chars)"

        # Check if reserved
        if merchant_id.lower() in self.RESERVED_IDS:
            return False, f"Merchant ID '{merchant_id}' is reserved"

        return True, None

    def detect_merchant_id_type(self, merchant_id: str) -> MerchantIdType:
        """
        Detect the type of a merchant ID.

        Args:
            merchant_id: The merchant ID to analyze

        Returns:
            The detected merchant ID type
        """
        if self.formats.UUID_PATTERN.match(merchant_id):
            return MerchantIdType.UUID

        elif self.formats.SHORT_CODE_PATTERN.match(merchant_id):
            return MerchantIdType.SHORT_CODE

        elif self.formats.SUBDOMAIN_PATTERN.match(merchant_id):
            return MerchantIdType.SUBDOMAIN

        elif self.formats.CUSTOM_PATTERN.match(merchant_id):
            return MerchantIdType.CUSTOM

        else:
            # Default to custom for anything else
            return MerchantIdType.CUSTOM

    async def validate_merchant_id_availability(
        self,
        db: AsyncSession,
        merchant_id: str,
        exclude_tenant_id: Optional[str] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Validate that a merchant ID is available for use.

        Args:
            db: Database session
            merchant_id: The merchant ID to validate
            exclude_tenant_id: Tenant ID to exclude from check (for updates)

        Returns:
            Tuple of (is_available, error_message)
        """
        # Format validation
        id_type = self.detect_merchant_id_type(merchant_id)
        is_valid, error = self.validate_merchant_id_format(
            merchant_id, id_type)

        if not is_valid:
            return False, error

        # Availability check
        query = select(Tenant).where(
            (Tenant.subdomain == merchant_id) |
            (Tenant.id == merchant_id)
        )

        if exclude_tenant_id:
            try:
                exclude_uuid = uuid.UUID(exclude_tenant_id)
                query = query.where(Tenant.id != exclude_uuid)
            except ValueError:
                # If exclude_tenant_id is not a UUID, compare as string
                query = query.where(Tenant.subdomain != exclude_tenant_id)

        result = await db.execute(query)
        existing_tenant = result.scalar_one_or_none()

        if existing_tenant:
            return False, f"Merchant ID '{merchant_id}' is already in use"

        return True, None

    def generate_merchant_context(
        self,
        merchant_id: str,
        tenant: Tenant
    ) -> Dict[str, Any]:
        """
        Generate merchant context information.

        Args:
            merchant_id: The merchant ID being used
            tenant: The tenant record

        Returns:
            Dictionary containing merchant context
        """
        id_type = self.detect_merchant_id_type(merchant_id)

        return {
            "merchant_id": merchant_id,
            "merchant_id_type": id_type.value,
            "tenant_id": str(tenant.id),
            "tenant_uuid": tenant.id,
            "subdomain": tenant.subdomain,
            "custom_domain": tenant.custom_domain,
            "business_name": tenant.name,
            "is_active": tenant.is_active,
            "is_verified": tenant.is_verified,
            "storefront_enabled": tenant.storefront_enabled,
            "kyc_status": tenant.kyc_status.value if tenant.kyc_status else None,
            "country_code": tenant.country_code,
            "phone_number": tenant.phone_number,
            "whatsapp_number": tenant.whatsapp_number,
            "email": tenant.email,
            "created_at": tenant.created_at,
            "updated_at": tenant.updated_at
        }


# Global service instance
merchant_id_service = MerchantIdService()
