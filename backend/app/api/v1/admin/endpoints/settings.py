"""
Admin Settings Endpoints

Merchant-specific settings management for admin dashboard.
"""
import logging
from typing import Dict, List, Optional, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security.dependencies import get_current_admin_or_seller
from app.core.security.clerk_multi_org import MultiOrgClerkTokenData
from app.db.deps import get_db
from app.services.settings_service import SettingsService
from app.schemas.settings import (
    SettingsDomainCreate,
    SettingsDomainUpdate,
    SettingsDomainInDB,
    SettingCreate,
    SettingUpdate,
    SettingInDB,
    DomainWithSettings,
    BulkSettingUpdate,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/", summary="Get merchant settings")
async def get_settings(
    domain_name: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: MultiOrgClerkTokenData = Depends(
        get_current_admin_or_seller),
):
    """Get current settings for the merchant (admin view)."""
    try:
        logger.info(f"Getting settings for user: {current_user.user_id}")

        # Initialize settings service
        settings_service = SettingsService(db)

        # Get tenant ID from user context
        # This should be derived from the authenticated user's context
        tenant_id = UUID(current_user.user_id)

        if domain_name:
            # Get settings for a specific domain
            domain = await settings_service.get_domain_by_name(domain_name, tenant_id)
            domain_with_settings = await settings_service.get_domain_with_settings(domain.id, tenant_id)
            return domain_with_settings
        else:
            # Get all domains with their settings
            domains = await settings_service.get_domains(tenant_id)
            domains_with_settings = []

            for domain in domains:
                domain_with_settings = await settings_service.get_domain_with_settings(domain.id, tenant_id)
                domains_with_settings.append(domain_with_settings)

            return {
                "domains": domains_with_settings,
                "total_domains": len(domains_with_settings),
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting settings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve settings",
        )


@router.put("/", summary="Update merchant settings")
async def update_settings(
    updates: BulkSettingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: MultiOrgClerkTokenData = Depends(
        get_current_admin_or_seller),
):
    """Update settings for the merchant (admin view)."""
    try:
        logger.info(f"Updating settings for user: {current_user.user_id}")

        # Initialize settings service
        settings_service = SettingsService(db)

        # Get tenant ID from user context
        # This should be derived from the authenticated user's context
        tenant_id = UUID(current_user.user_id)

        # Update settings using the service layer
        updated_settings = await settings_service.bulk_update_settings(updates, tenant_id)

        logger.info(
            f"Settings updated successfully for user: {current_user.user_id}")
        return {
            "message": "Settings updated successfully",
            "updated_settings": updated_settings,
            "total_updated": len(updated_settings),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating settings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update settings",
        )


@router.get("/domains", summary="Get settings domains")
async def get_settings_domains(
    db: AsyncSession = Depends(get_db),
    current_user: MultiOrgClerkTokenData = Depends(
        get_current_admin_or_seller),
):
    """Get all settings domains for the merchant."""
    try:
        logger.info(
            f"Getting settings domains for user: {current_user.user_id}")

        # Initialize settings service
        settings_service = SettingsService(db)

        # Get tenant ID from user context
        # This should be derived from the authenticated user's context
        tenant_id = UUID(current_user.user_id)

        # Get domains using the service layer
        domains = await settings_service.get_domains(tenant_id)

        return {
            "domains": domains,
            "total_domains": len(domains),
        }
    except Exception as e:
        logger.error(f"Error getting settings domains: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve settings domains",
        )


@router.post("/domains", summary="Create a new settings domain")
async def create_settings_domain(
    domain_data: SettingsDomainCreate,
    db: AsyncSession = Depends(get_db),
    current_user: MultiOrgClerkTokenData = Depends(
        get_current_admin_or_seller),
):
    """Create a new settings domain for the merchant."""
    try:
        logger.info(
            f"Creating settings domain for user: {current_user.user_id}")

        # Initialize settings service
        settings_service = SettingsService(db)

        # Get tenant ID from user context
        # This should be derived from the authenticated user's context
        tenant_id = UUID(current_user.user_id)

        # Create domain using the service layer
        domain = await settings_service.create_domain(domain_data, tenant_id)

        logger.info(f"Settings domain created successfully: {domain.id}")
        return domain
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating settings domain: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create settings domain",
        )


@router.get("/domains/{domain_id}", summary="Get settings domain by ID")
async def get_settings_domain(
    domain_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: MultiOrgClerkTokenData = Depends(
        get_current_admin_or_seller),
):
    """Get a specific settings domain by ID."""
    try:
        logger.info(
            f"Getting settings domain {domain_id} for user: {current_user.user_id}")

        # Initialize settings service
        settings_service = SettingsService(db)

        # Get tenant ID from user context
        # This should be derived from the authenticated user's context
        tenant_id = UUID(current_user.user_id)

        # Get domain with settings using the service layer
        domain_with_settings = await settings_service.get_domain_with_settings(domain_id, tenant_id)

        return domain_with_settings
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting settings domain {domain_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve settings domain",
        )


@router.put("/domains/{domain_id}", summary="Update settings domain")
async def update_settings_domain(
    domain_id: UUID,
    domain_data: SettingsDomainUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: MultiOrgClerkTokenData = Depends(
        get_current_admin_or_seller),
):
    """Update a settings domain."""
    try:
        logger.info(
            f"Updating settings domain {domain_id} for user: {current_user.user_id}")

        # Initialize settings service
        settings_service = SettingsService(db)

        # Get tenant ID from user context
        # This should be derived from the authenticated user's context
        tenant_id = UUID(current_user.user_id)

        # Update domain using the service layer
        domain = await settings_service.update_domain(domain_id, domain_data, tenant_id)

        logger.info(f"Settings domain updated successfully: {domain.id}")
        return domain
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating settings domain {domain_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update settings domain",
        )


@router.post("/domains/{domain_id}/settings", summary="Create a new setting")
async def create_setting(
    domain_id: UUID,
    setting_data: SettingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: MultiOrgClerkTokenData = Depends(
        get_current_admin_or_seller),
):
    """Create a new setting in a domain."""
    try:
        logger.info(
            f"Creating setting in domain {domain_id} for user: {current_user.user_id}")

        # Initialize settings service
        settings_service = SettingsService(db)

        # Get tenant ID from user context
        # This should be derived from the authenticated user's context
        tenant_id = UUID(current_user.user_id)

        # Set the domain ID
        setting_data.domain_id = domain_id

        # Create setting using the service layer
        setting = await settings_service.create_setting(setting_data, tenant_id)

        logger.info(f"Setting created successfully: {setting.id}")
        return setting
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating setting in domain {domain_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create setting",
        )


@router.put("/settings/{setting_id}", summary="Update a setting")
async def update_setting(
    setting_id: UUID,
    setting_data: SettingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: MultiOrgClerkTokenData = Depends(
        get_current_admin_or_seller),
):
    """Update a specific setting."""
    try:
        logger.info(
            f"Updating setting {setting_id} for user: {current_user.user_id}")

        # Initialize settings service
        settings_service = SettingsService(db)

        # Get tenant ID from user context
        # This should be derived from the authenticated user's context
        tenant_id = UUID(current_user.user_id)

        # Update setting using the service layer
        setting = await settings_service.update_setting(setting_id, setting_data, tenant_id)

        logger.info(f"Setting updated successfully: {setting.id}")
        return setting
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating setting {setting_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update setting",
        )
