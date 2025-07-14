"""
Tests for SubdomainService.

Tests subdomain validation, availability checking, and Shopify-style
auto-incrementing suffix logic.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.services.tenant.subdomain_service import SubdomainService
from backend.app.models.tenant import Tenant


class TestSubdomainService:
    """Test suite for SubdomainService."""

    @pytest.fixture
    def subdomain_service(self):
        """Create a SubdomainService instance."""
        return SubdomainService()

    @pytest.fixture
    def mock_db(self):
        """Create a mock database session."""
        return AsyncMock(spec=AsyncSession)

    def test_validate_subdomain_format_valid(self, subdomain_service):
        """Test valid subdomain formats."""
        valid_subdomains = [
            "myshop",
            "my-shop",
            "my123shop",
            "a" * 63,  # Maximum length
            "test-store",
            "store123"
        ]

        for subdomain in valid_subdomains:
            assert subdomain_service.validate_subdomain_format(
                subdomain) is True

    def test_validate_subdomain_format_invalid(self, subdomain_service):
        """Test invalid subdomain formats."""
        invalid_subdomains = [
            "",  # Empty
            "MYSHOP",  # Uppercase
            "my_shop",  # Underscore
            "my.shop",  # Dot
            "my-shop-",  # Ends with dash
            "-myshop",  # Starts with dash
            "a" * 64,  # Too long
            "www",  # Reserved
            "admin",  # Reserved
            "api",  # Reserved
            "store",  # Reserved
            "shop",  # Reserved
        ]

        for subdomain in invalid_subdomains:
            assert subdomain_service.validate_subdomain_format(
                subdomain) is False

    @pytest.mark.asyncio
    async def test_check_subdomain_availability_available(self, subdomain_service, mock_db):
        """Test subdomain availability check when subdomain is available."""
        # Mock empty result
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        is_available, suggested, reason = await subdomain_service.check_subdomain_availability(
            mock_db, "myshop"
        )

        assert is_available is True
        assert suggested == "myshop"
        assert reason is None

    @pytest.mark.asyncio
    async def test_check_subdomain_availability_taken(self, subdomain_service, mock_db):
        """Test subdomain availability check when subdomain is taken."""
        # Mock existing tenant
        mock_tenant = MagicMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_tenant
        mock_db.execute.return_value = mock_result

        # Mock alternative suggestion
        subdomain_service._suggest_alternative_subdomain = AsyncMock(
            return_value="myshop-1")

        is_available, suggested, reason = await subdomain_service.check_subdomain_availability(
            mock_db, "myshop"
        )

        assert is_available is False
        assert suggested == "myshop-1"
        assert reason == "Subdomain is already taken"

    @pytest.mark.asyncio
    async def test_check_subdomain_availability_invalid_format(self, subdomain_service, mock_db):
        """Test subdomain availability check with invalid format."""
        is_available, suggested, reason = await subdomain_service.check_subdomain_availability(
            mock_db, "MYSHOP"
        )

        assert is_available is False
        assert suggested is None
        assert reason == "Invalid subdomain format"

    @pytest.mark.asyncio
    async def test_suggest_alternative_subdomain_first_suffix(self, subdomain_service, mock_db):
        """Test suggesting first suffix when no existing suffixes."""
        # Mock empty result
        mock_result = MagicMock()
        mock_result.fetchall.return_value = []
        mock_db.execute.return_value = mock_result

        suggested = await subdomain_service._suggest_alternative_subdomain(mock_db, "myshop")

        assert suggested == "myshop-1"

    @pytest.mark.asyncio
    async def test_suggest_alternative_subdomain_next_suffix(self, subdomain_service, mock_db):
        """Test suggesting next suffix when existing suffixes exist."""
        # Mock existing subdomains
        mock_result = MagicMock()
        mock_result.fetchall.return_value = [("myshop-1",), ("myshop-3",)]
        mock_db.execute.return_value = mock_result

        suggested = await subdomain_service._suggest_alternative_subdomain(mock_db, "myshop")

        assert suggested == "myshop-4"  # Next number after 3

    @pytest.mark.asyncio
    async def test_assign_subdomain_available(self, subdomain_service, mock_db):
        """Test subdomain assignment when requested subdomain is available."""
        # Mock availability check
        subdomain_service.check_subdomain_availability = AsyncMock(
            return_value=(True, "myshop", None)
        )

        assigned = await subdomain_service.assign_subdomain(mock_db, "myshop")

        assert assigned == "myshop"

    @pytest.mark.asyncio
    async def test_assign_subdomain_unavailable_with_suggestion(self, subdomain_service, mock_db):
        """Test subdomain assignment when requested is unavailable but suggestion exists."""
        # Mock availability check
        subdomain_service.check_subdomain_availability = AsyncMock(
            return_value=(False, "myshop-1", "Subdomain is already taken")
        )

        assigned = await subdomain_service.assign_subdomain(mock_db, "myshop")

        assert assigned == "myshop-1"

    @pytest.mark.asyncio
    async def test_assign_subdomain_unavailable_no_suggestion(self, subdomain_service, mock_db):
        """Test subdomain assignment when requested is unavailable and no suggestion."""
        # Mock availability check
        subdomain_service.check_subdomain_availability = AsyncMock(
            return_value=(False, None, "Invalid subdomain format")
        )
        # Mock unique generation
        subdomain_service._generate_unique_subdomain = AsyncMock(
            return_value="store-abc123")

        assigned = await subdomain_service.assign_subdomain(mock_db, "invalid")

        assert assigned == "store-abc123"

    @pytest.mark.asyncio
    async def test_get_tenant_by_subdomain_found(self, subdomain_service, mock_db):
        """Test getting tenant by subdomain when found."""
        mock_tenant = MagicMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_tenant
        mock_db.execute.return_value = mock_result

        tenant = await subdomain_service.get_tenant_by_subdomain(mock_db, "myshop")

        assert tenant == mock_tenant

    @pytest.mark.asyncio
    async def test_get_tenant_by_subdomain_not_found(self, subdomain_service, mock_db):
        """Test getting tenant by subdomain when not found."""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        tenant = await subdomain_service.get_tenant_by_subdomain(mock_db, "nonexistent")

        assert tenant is None

    @pytest.mark.asyncio
    async def test_update_tenant_subdomain_success(self, subdomain_service, mock_db):
        """Test successful tenant subdomain update."""
        # Mock tenant exists
        mock_tenant = MagicMock()
        mock_tenant.id = "tenant-123"
        mock_tenant.subdomain = "old-subdomain"

        # Mock no existing tenant with new subdomain
        mock_result1 = MagicMock()
        mock_result1.scalar_one_or_none.return_value = None

        # Mock current tenant found
        mock_result2 = MagicMock()
        mock_result2.scalar_one_or_none.return_value = mock_tenant

        mock_db.execute.side_effect = [mock_result1, mock_result2]

        updated_tenant = await subdomain_service.update_tenant_subdomain(
            mock_db, "tenant-123", "new-subdomain"
        )

        assert updated_tenant == mock_tenant
        assert mock_tenant.subdomain == "new-subdomain"
        mock_db.commit.assert_called_once()
        mock_db.refresh.assert_called_once_with(mock_tenant)

    @pytest.mark.asyncio
    async def test_update_tenant_subdomain_invalid_format(self, subdomain_service, mock_db):
        """Test tenant subdomain update with invalid format."""
        with pytest.raises(Exception) as exc_info:
            await subdomain_service.update_tenant_subdomain(
                mock_db, "tenant-123", "INVALID"
            )

        assert "Invalid subdomain format" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_update_tenant_subdomain_already_taken(self, subdomain_service, mock_db):
        """Test tenant subdomain update when new subdomain is already taken."""
        # Mock existing tenant with new subdomain
        mock_existing_tenant = MagicMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_existing_tenant
        mock_db.execute.return_value = mock_result

        with pytest.raises(Exception) as exc_info:
            await subdomain_service.update_tenant_subdomain(
                mock_db, "tenant-123", "taken-subdomain"
            )

        assert "Subdomain is already taken" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_update_tenant_subdomain_tenant_not_found(self, subdomain_service, mock_db):
        """Test tenant subdomain update when tenant not found."""
        # Mock no existing tenant with new subdomain
        mock_result1 = MagicMock()
        mock_result1.scalar_one_or_none.return_value = None

        # Mock current tenant not found
        mock_result2 = MagicMock()
        mock_result2.scalar_one_or_none.return_value = None

        mock_db.execute.side_effect = [mock_result1, mock_result2]

        with pytest.raises(Exception) as exc_info:
            await subdomain_service.update_tenant_subdomain(
                mock_db, "nonexistent-tenant", "new-subdomain"
            )

        assert "Tenant not found" in str(exc_info.value)
