from typing import Dict, List, Optional, Any, Union
from uuid import UUID
from fastapi import HTTPException, status
from jsonschema import validate, ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.settings_repository import SettingsRepository
from app.schemas.settings import (
    SettingsDomainCreate, SettingsDomainUpdate, SettingsDomainInDB, 
    SettingCreate, SettingUpdate, SettingInDB, 
    DomainWithSettings, BulkSettingUpdate, SettingValidationResult, SettingValidationError
)


class SettingsService:
    """
    Service for managing application settings.
    Provides business logic for creating, updating, and validating settings.
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repository = SettingsRepository(db)
    
    # Settings Domain Operations
    
    async def create_domain(self, domain_data: SettingsDomainCreate, tenant_id: UUID) -> SettingsDomainInDB:
        """Create a new settings domain."""
        # Check if domain with this name already exists
        existing = await self.repository.get_domain_by_name(domain_data.name, tenant_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Settings domain with name '{domain_data.name}' already exists"
            )
        
        domain = await self.repository.create_domain(domain_data, tenant_id)
        return SettingsDomainInDB.from_orm(domain)
    
    async def get_domain(self, domain_id: UUID, tenant_id: UUID) -> SettingsDomainInDB:
        """Get a settings domain by ID."""
        domain = await self.repository.get_domain(domain_id, tenant_id)
        if not domain:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Settings domain with ID {domain_id} not found"
            )
        return SettingsDomainInDB.from_orm(domain)
    
    async def get_domain_by_name(self, name: str, tenant_id: UUID) -> SettingsDomainInDB:
        """Get a settings domain by name."""
        domain = await self.repository.get_domain_by_name(name, tenant_id)
        if not domain:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Settings domain with name '{name}' not found"
            )
        return SettingsDomainInDB.from_orm(domain)
    
    async def list_domains(self, tenant_id: UUID) -> List[SettingsDomainInDB]:
        """List all settings domains for a tenant."""
        domains = await self.repository.list_domains(tenant_id)
        return [SettingsDomainInDB.from_orm(domain) for domain in domains]
    
    async def update_domain(
        self, 
        domain_id: UUID, 
        tenant_id: UUID, 
        update_data: SettingsDomainUpdate
    ) -> SettingsDomainInDB:
        """Update a settings domain."""
        # Check if domain exists
        await self.get_domain(domain_id, tenant_id)
        
        # If name is being updated, check for conflicts
        if update_data.name:
            existing = await self.repository.get_domain_by_name(update_data.name, tenant_id)
            if existing and str(existing.id) != str(domain_id):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Settings domain with name '{update_data.name}' already exists"
                )
        
        domain = await self.repository.update_domain(
            domain_id, 
            tenant_id, 
            update_data.dict(exclude_unset=True)
        )
        
        if not domain:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Settings domain with ID {domain_id} not found"
            )
            
        return SettingsDomainInDB.from_orm(domain)
    
    async def delete_domain(self, domain_id: UUID, tenant_id: UUID) -> Dict[str, str]:
        """Delete a settings domain."""
        # Check if domain exists
        await self.get_domain(domain_id, tenant_id)
        
        success = await self.repository.delete_domain(domain_id, tenant_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Settings domain with ID {domain_id} not found"
            )
            
        return {"message": f"Settings domain with ID {domain_id} deleted successfully"}
    
    async def get_domain_with_settings(self, domain_id: UUID, tenant_id: UUID) -> DomainWithSettings:
        """Get a settings domain with all its settings."""
        domain = await self.repository.get_domain_with_settings(domain_id, tenant_id)
        if not domain:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Settings domain with ID {domain_id} not found"
            )
            
        return DomainWithSettings.from_orm(domain)
    
    async def get_domain_by_name_with_settings(self, name: str, tenant_id: UUID) -> DomainWithSettings:
        """Get a settings domain by name with all its settings."""
        domain = await self.repository.get_domain_by_name_with_settings(name, tenant_id)
        if not domain:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Settings domain with name '{name}' not found"
            )
            
        return DomainWithSettings.from_orm(domain)
    
    # Settings Operations
    
    async def create_setting(self, setting_data: SettingCreate, tenant_id: UUID) -> SettingInDB:
        """Create a new setting."""
        # Validate domain exists
        await self.get_domain(UUID(setting_data.domain_id), tenant_id)
        
        # Check if setting with this key already exists in the domain
        existing = await self.repository.get_setting_by_key(
            setting_data.key, 
            UUID(setting_data.domain_id), 
            tenant_id
        )
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Setting with key '{setting_data.key}' already exists in this domain"
            )
            
        # Validate the setting value against its schema if provided
        if setting_data.schema and setting_data.value:
            try:
                validate(instance=setting_data.value, schema=setting_data.schema)
            except ValidationError as e:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Setting value does not match schema: {str(e)}"
                )
                
        setting = await self.repository.create_setting(setting_data, tenant_id)
        return SettingInDB.from_orm(setting)
    
    async def get_setting(self, setting_id: UUID, tenant_id: UUID) -> SettingInDB:
        """Get a setting by ID."""
        setting = await self.repository.get_setting(setting_id, tenant_id)
        if not setting:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Setting with ID {setting_id} not found"
            )
            
        return SettingInDB.from_orm(setting)
    
    async def get_setting_by_key(
        self, 
        key: str, 
        domain_id: UUID, 
        tenant_id: UUID
    ) -> SettingInDB:
        """Get a setting by key within a domain."""
        setting = await self.repository.get_setting_by_key(key, domain_id, tenant_id)
        if not setting:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Setting with key '{key}' not found in domain {domain_id}"
            )
            
        return SettingInDB.from_orm(setting)
    
    async def list_settings(self, tenant_id: UUID, domain_id: Optional[UUID] = None) -> List[SettingInDB]:
        """List settings for a tenant, optionally filtered by domain."""
        if domain_id:
            # Verify domain exists
            await self.get_domain(domain_id, tenant_id)
            
        settings = await self.repository.list_settings(tenant_id, domain_id)
        return [SettingInDB.from_orm(setting) for setting in settings]
    
    async def update_setting(
        self, 
        setting_id: UUID, 
        tenant_id: UUID, 
        update_data: SettingUpdate,
        user_id: Optional[str] = None
    ) -> SettingInDB:
        """Update a setting."""
        # Get the current setting
        setting = await self.get_setting(setting_id, tenant_id)
        
        # Validate the setting value against its schema if provided
        if update_data.value is not None:
            schema = update_data.schema or setting.schema
            if schema:
                try:
                    validate(instance=update_data.value, schema=schema)
                except ValidationError as e:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail=f"Setting value does not match schema: {str(e)}"
                    )
                    
        updated = await self.repository.update_setting(
            setting_id, 
            tenant_id, 
            update_data.dict(exclude_unset=True),
            user_id
        )
        
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Setting with ID {setting_id} not found"
            )
            
        return SettingInDB.from_orm(updated)
    
    async def delete_setting(self, setting_id: UUID, tenant_id: UUID) -> Dict[str, str]:
        """Delete a setting."""
        # Check if setting exists
        await self.get_setting(setting_id, tenant_id)
        
        success = await self.repository.delete_setting(setting_id, tenant_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Setting with ID {setting_id} not found"
            )
            
        return {"message": f"Setting with ID {setting_id} deleted successfully"}
    
    async def get_settings_as_dict(
        self, 
        tenant_id: UUID, 
        domain_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get all settings for a tenant as a dictionary."""
        return await self.repository.get_settings_as_dict(tenant_id, domain_name)
    
    async def bulk_update_settings(
        self,
        tenant_id: UUID,
        update_data: BulkSettingUpdate,
        domain_name: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Update multiple settings at once."""
        updated = await self.repository.bulk_update_settings(
            tenant_id,
            update_data.settings,
            domain_name,
            user_id
        )
        
        return {"updated": updated}
    
    async def validate_settings(
        self, 
        values: Dict[str, Any], 
        tenant_id: UUID,
        domain_name: Optional[str] = None
    ) -> SettingValidationResult:
        """Validate a set of settings against their schemas."""
        # Get all settings for the domain
        domain_id = None
        if domain_name:
            domain = await self.repository.get_domain_by_name(domain_name, tenant_id)
            if domain:
                domain_id = UUID(domain.id)
                
        settings = await self.repository.list_settings(tenant_id, domain_id)
        
        errors = []
        
        # Validate each setting
        for setting in settings:
            if setting.key in values and setting.schema:
                try:
                    validate(instance=values[setting.key], schema=setting.schema)
                except ValidationError as e:
                    errors.append(SettingValidationError(
                        key=setting.key,
                        error=str(e)
                    ))
        
        # Check for required settings
        for setting in settings:
            if setting.is_required and setting.key not in values:
                errors.append(SettingValidationError(
                    key=setting.key,
                    error="Required setting is missing"
                ))
                
        return SettingValidationResult(
            valid=len(errors) == 0,
            errors=errors
        )
    
    async def initialize_default_domains(self, tenant_id: UUID) -> List[SettingsDomainInDB]:
        """Initialize default settings domains for a new tenant."""
        default_domains = [
            SettingsDomainCreate(
                name="store",
                description="Store information and general settings",
                icon="store", 
                order=10
            ),
            SettingsDomainCreate(
                name="payment", 
                description="Payment processing and gateway settings",
                icon="credit_card", 
                order=20
            ),
            SettingsDomainCreate(
                name="shipping",
                description="Shipping and fulfillment settings",
                icon="local_shipping", 
                order=30
            ),
            SettingsDomainCreate(
                name="notifications",
                description="Notification preferences and templates",
                icon="notifications", 
                order=40
            ),
            SettingsDomainCreate(
                name="integrations",
                description="Third-party service integrations",
                icon="integration_instructions", 
                order=50
            ),
        ]
        
        created_domains = []
        for domain_data in default_domains:
            # Check if domain already exists
            existing = await self.repository.get_domain_by_name(domain_data.name, tenant_id)
            if not existing:
                domain = await self.repository.create_domain(domain_data, tenant_id)
                created_domains.append(SettingsDomainInDB.from_orm(domain))
                
        return created_domains
