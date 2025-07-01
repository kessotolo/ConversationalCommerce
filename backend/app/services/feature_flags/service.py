"""
Feature Flag Management Service

This module provides functionality for managing feature flags, including:
- Creating and updating global feature flags
- Managing tenant-specific overrides
- Checking feature flag status for a specific tenant
"""

import uuid
from typing import Dict, List, Optional, Any, Union
from datetime import datetime

from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.feature_flags.feature_flag import FeatureFlag, TenantFeatureFlagOverride
from app.models.tenant.tenant import Tenant


class FeatureFlagService:
    """Service for managing feature flags and tenant overrides."""
    
    async def create_feature_flag(
        self,
        db: AsyncSession,
        key: str,
        name: str,
        description: Optional[str] = None,
        is_enabled: bool = False,
        feature_type: str = "ui",
        config: Optional[Dict[str, Any]] = None,
        created_by: Optional[uuid.UUID] = None
    ) -> FeatureFlag:
        """
        Create a new feature flag.
        
        Args:
            db: Database session
            key: Unique identifier for the feature flag (e.g., "new_checkout_flow")
            name: Human-readable name for the feature flag
            description: Detailed description of what the feature does
            is_enabled: Default enabled/disabled state
            feature_type: Category of feature (ui, api, integration, etc)
            config: Additional configuration for the feature
            created_by: ID of the user creating the feature flag
            
        Returns:
            The newly created feature flag
        """
        feature_flag = FeatureFlag(
            key=key,
            name=name,
            description=description,
            is_enabled=is_enabled,
            feature_type=feature_type,
            config=config or {},
            created_by=created_by,
            updated_by=created_by
        )
        
        db.add(feature_flag)
        await db.commit()
        await db.refresh(feature_flag)
        
        return feature_flag
    
    async def get_feature_flag(self, db: AsyncSession, flag_id: uuid.UUID) -> Optional[FeatureFlag]:
        """
        Get a feature flag by ID.
        
        Args:
            db: Database session
            flag_id: ID of the feature flag to retrieve
            
        Returns:
            The feature flag if found, None otherwise
        """
        result = await db.execute(
            select(FeatureFlag).where(FeatureFlag.id == flag_id)
        )
        return result.scalars().first()
    
    async def get_feature_flag_by_key(self, db: AsyncSession, key: str) -> Optional[FeatureFlag]:
        """
        Get a feature flag by its unique key.
        
        Args:
            db: Database session
            key: The unique key of the feature flag
            
        Returns:
            The feature flag if found, None otherwise
        """
        result = await db.execute(
            select(FeatureFlag).where(FeatureFlag.key == key)
        )
        return result.scalars().first()
    
    async def list_feature_flags(
        self, 
        db: AsyncSession, 
        skip: int = 0,
        limit: int = 100,
        feature_type: Optional[str] = None
    ) -> List[FeatureFlag]:
        """
        List all feature flags with optional filtering.
        
        Args:
            db: Database session
            skip: Number of records to skip
            limit: Maximum number of records to return
            feature_type: Optional filter by feature type
            
        Returns:
            List of feature flags
        """
        query = select(FeatureFlag)
        
        if feature_type:
            query = query.where(FeatureFlag.feature_type == feature_type)
        
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        
        return result.scalars().all()
    
    async def update_feature_flag(
        self,
        db: AsyncSession,
        flag_id: uuid.UUID,
        name: Optional[str] = None,
        description: Optional[str] = None,
        is_enabled: Optional[bool] = None,
        feature_type: Optional[str] = None,
        config: Optional[Dict[str, Any]] = None,
        updated_by: Optional[uuid.UUID] = None
    ) -> Optional[FeatureFlag]:
        """
        Update a feature flag.
        
        Args:
            db: Database session
            flag_id: ID of the feature flag to update
            name: New name for the feature flag
            description: New description for the feature flag
            is_enabled: New enabled/disabled state
            feature_type: New feature type
            config: New configuration
            updated_by: ID of the user updating the feature flag
            
        Returns:
            The updated feature flag if found, None otherwise
        """
        # Get existing flag
        feature_flag = await self.get_feature_flag(db, flag_id)
        if not feature_flag:
            return None
        
        # Update fields
        if name is not None:
            feature_flag.name = name
        if description is not None:
            feature_flag.description = description
        if is_enabled is not None:
            feature_flag.is_enabled = is_enabled
        if feature_type is not None:
            feature_flag.feature_type = feature_type
        if config is not None:
            feature_flag.config = config
        if updated_by is not None:
            feature_flag.updated_by = updated_by
        
        feature_flag.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(feature_flag)
        
        return feature_flag
    
    async def delete_feature_flag(self, db: AsyncSession, flag_id: uuid.UUID) -> bool:
        """
        Delete a feature flag.
        
        Args:
            db: Database session
            flag_id: ID of the feature flag to delete
            
        Returns:
            True if the feature flag was deleted, False otherwise
        """
        feature_flag = await self.get_feature_flag(db, flag_id)
        if not feature_flag:
            return False
        
        # First delete any tenant overrides
        await db.execute(
            delete(TenantFeatureFlagOverride).where(
                TenantFeatureFlagOverride.feature_flag_id == flag_id
            )
        )
        
        # Then delete the feature flag
        await db.delete(feature_flag)
        await db.commit()
        
        return True
    
    # Tenant override methods
    
    async def set_tenant_override(
        self,
        db: AsyncSession,
        flag_id: uuid.UUID,
        tenant_id: uuid.UUID,
        is_enabled: bool,
        config_override: Optional[Dict[str, Any]] = None,
        updated_by: Optional[uuid.UUID] = None
    ) -> TenantFeatureFlagOverride:
        """
        Set a tenant-specific override for a feature flag.
        
        Args:
            db: Database session
            flag_id: ID of the feature flag
            tenant_id: ID of the tenant
            is_enabled: Enabled/disabled state for this tenant
            config_override: Tenant-specific configuration overrides
            updated_by: ID of the user creating the override
            
        Returns:
            The tenant feature flag override
        """
        # Check if override already exists
        result = await db.execute(
            select(TenantFeatureFlagOverride).where(
                TenantFeatureFlagOverride.feature_flag_id == flag_id,
                TenantFeatureFlagOverride.tenant_id == tenant_id
            )
        )
        override = result.scalars().first()
        
        if override:
            # Update existing override
            override.is_enabled = is_enabled
            if config_override is not None:
                override.config_override = config_override
            override.updated_by = updated_by
            override.updated_at = datetime.utcnow()
        else:
            # Create new override
            override = TenantFeatureFlagOverride(
                feature_flag_id=flag_id,
                tenant_id=tenant_id,
                is_enabled=is_enabled,
                config_override=config_override or {},
                created_by=updated_by,
                updated_by=updated_by
            )
            db.add(override)
        
        await db.commit()
        await db.refresh(override)
        
        return override
    
    async def remove_tenant_override(
        self,
        db: AsyncSession,
        flag_id: uuid.UUID,
        tenant_id: uuid.UUID
    ) -> bool:
        """
        Remove a tenant-specific override for a feature flag.
        
        Args:
            db: Database session
            flag_id: ID of the feature flag
            tenant_id: ID of the tenant
            
        Returns:
            True if the override was removed, False if it didn't exist
        """
        result = await db.execute(
            delete(TenantFeatureFlagOverride).where(
                TenantFeatureFlagOverride.feature_flag_id == flag_id,
                TenantFeatureFlagOverride.tenant_id == tenant_id
            )
        )
        
        await db.commit()
        
        return result.rowcount > 0
    
    async def get_tenant_overrides(
        self,
        db: AsyncSession,
        tenant_id: uuid.UUID
    ) -> List[TenantFeatureFlagOverride]:
        """
        Get all feature flag overrides for a specific tenant.
        
        Args:
            db: Database session
            tenant_id: ID of the tenant
            
        Returns:
            List of tenant feature flag overrides
        """
        result = await db.execute(
            select(TenantFeatureFlagOverride)
            .where(TenantFeatureFlagOverride.tenant_id == tenant_id)
        )
        
        return result.scalars().all()
    
    # Feature flag checking
    
    async def is_feature_enabled(
        self,
        db: AsyncSession,
        key: str,
        tenant_id: Optional[uuid.UUID] = None
    ) -> bool:
        """
        Check if a feature flag is enabled for a specific tenant or globally.
        
        Args:
            db: Database session
            key: The unique key of the feature flag
            tenant_id: Optional tenant ID to check for overrides
            
        Returns:
            True if the feature is enabled, False otherwise
        """
        # Get the feature flag
        feature_flag = await self.get_feature_flag_by_key(db, key)
        if not feature_flag:
            # Feature flag doesn't exist, default to disabled
            return False
        
        # If no tenant specified, return global setting
        if tenant_id is None:
            return feature_flag.is_enabled
        
        # Check for tenant override
        result = await db.execute(
            select(TenantFeatureFlagOverride).where(
                TenantFeatureFlagOverride.feature_flag_id == feature_flag.id,
                TenantFeatureFlagOverride.tenant_id == tenant_id
            )
        )
        override = result.scalars().first()
        
        # If override exists, use its setting, otherwise use global setting
        if override:
            return override.is_enabled
        
        return feature_flag.is_enabled
    
    async def get_feature_config(
        self,
        db: AsyncSession,
        key: str,
        tenant_id: Optional[uuid.UUID] = None
    ) -> Dict[str, Any]:
        """
        Get the configuration for a feature flag, with tenant overrides if applicable.
        
        Args:
            db: Database session
            key: The unique key of the feature flag
            tenant_id: Optional tenant ID to check for overrides
            
        Returns:
            Configuration dictionary, empty if feature flag doesn't exist
        """
        # Get the feature flag
        feature_flag = await self.get_feature_flag_by_key(db, key)
        if not feature_flag:
            # Feature flag doesn't exist, return empty config
            return {}
        
        # Start with the global config
        config = dict(feature_flag.config or {})
        
        # If no tenant specified, return global config
        if tenant_id is None:
            return config
        
        # Check for tenant override
        result = await db.execute(
            select(TenantFeatureFlagOverride).where(
                TenantFeatureFlagOverride.feature_flag_id == feature_flag.id,
                TenantFeatureFlagOverride.tenant_id == tenant_id
            )
        )
        override = result.scalars().first()
        
        # If override exists, merge its config with global config
        if override and override.config_override:
            # Override keys from tenant config
            for key, value in override.config_override.items():
                config[key] = value
                
        return config
