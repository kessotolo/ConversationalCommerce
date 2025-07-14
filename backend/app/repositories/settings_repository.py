from typing import List, Optional, Dict, Any, Union
from uuid import UUID
from sqlalchemy import select, delete, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.settings import Setting, SettingsDomain, SettingHistory
from app.schemas.settings import SettingCreate, SettingsDomainCreate, SettingHistoryCreate


class SettingsRepository:
    """
    Repository for settings operations.
    Provides CRUD operations for settings and settings domains.
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    # Settings Domains Operations
    
    async def create_domain(self, domain_data: SettingsDomainCreate, tenant_id: UUID) -> SettingsDomain:
        """Create a new settings domain."""
        domain = SettingsDomain(tenant_id=str(tenant_id), **domain_data.dict())
        self.db.add(domain)
        await self.db.flush()
        return domain
    
    async def get_domain(self, domain_id: UUID, tenant_id: UUID) -> Optional[SettingsDomain]:
        """Get a settings domain by ID."""
        query = select(SettingsDomain).where(
            SettingsDomain.id == str(domain_id),
            SettingsDomain.tenant_id == str(tenant_id)
        )
        result = await self.db.execute(query)
        return result.scalars().first()
    
    async def get_domain_by_name(self, name: str, tenant_id: UUID) -> Optional[SettingsDomain]:
        """Get a settings domain by name."""
        query = select(SettingsDomain).where(
            SettingsDomain.name == name,
            SettingsDomain.tenant_id == str(tenant_id)
        )
        result = await self.db.execute(query)
        return result.scalars().first()
    
    async def list_domains(self, tenant_id: UUID) -> List[SettingsDomain]:
        """List all settings domains for a tenant."""
        query = select(SettingsDomain).where(
            SettingsDomain.tenant_id == str(tenant_id)
        ).order_by(SettingsDomain.order)
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def update_domain(self, domain_id: UUID, tenant_id: UUID, update_data: Dict[str, Any]) -> Optional[SettingsDomain]:
        """Update a settings domain."""
        query = update(SettingsDomain).where(
            SettingsDomain.id == str(domain_id),
            SettingsDomain.tenant_id == str(tenant_id)
        ).values(**update_data).returning(SettingsDomain)
        result = await self.db.execute(query)
        return result.scalars().first()
    
    async def delete_domain(self, domain_id: UUID, tenant_id: UUID) -> bool:
        """Delete a settings domain."""
        query = delete(SettingsDomain).where(
            SettingsDomain.id == str(domain_id),
            SettingsDomain.tenant_id == str(tenant_id)
        )
        result = await self.db.execute(query)
        return result.rowcount > 0
    
    async def get_domain_with_settings(self, domain_id: UUID, tenant_id: UUID) -> Optional[SettingsDomain]:
        """Get a settings domain with all its settings."""
        query = select(SettingsDomain).options(
            selectinload(SettingsDomain.settings)
        ).where(
            SettingsDomain.id == str(domain_id),
            SettingsDomain.tenant_id == str(tenant_id)
        )
        result = await self.db.execute(query)
        return result.scalars().first()
    
    async def get_domain_by_name_with_settings(self, name: str, tenant_id: UUID) -> Optional[SettingsDomain]:
        """Get a settings domain by name with all its settings."""
        query = select(SettingsDomain).options(
            selectinload(SettingsDomain.settings)
        ).where(
            SettingsDomain.name == name,
            SettingsDomain.tenant_id == str(tenant_id)
        )
        result = await self.db.execute(query)
        return result.scalars().first()
    
    # Settings Operations
    
    async def create_setting(self, setting_data: SettingCreate, tenant_id: UUID) -> Setting:
        """Create a new setting."""
        setting = Setting(tenant_id=str(tenant_id), **setting_data.dict())
        self.db.add(setting)
        await self.db.flush()
        return setting
    
    async def get_setting(self, setting_id: UUID, tenant_id: UUID) -> Optional[Setting]:
        """Get a setting by ID."""
        query = select(Setting).where(
            Setting.id == str(setting_id),
            Setting.tenant_id == str(tenant_id)
        )
        result = await self.db.execute(query)
        return result.scalars().first()
    
    async def get_setting_by_key(self, key: str, domain_id: UUID, tenant_id: UUID) -> Optional[Setting]:
        """Get a setting by key within a domain."""
        query = select(Setting).where(
            Setting.key == key,
            Setting.domain_id == str(domain_id),
            Setting.tenant_id == str(tenant_id)
        )
        result = await self.db.execute(query)
        return result.scalars().first()
    
    async def list_settings(self, tenant_id: UUID, domain_id: Optional[UUID] = None) -> List[Setting]:
        """List settings for a tenant, optionally filtered by domain."""
        query = select(Setting).where(Setting.tenant_id == str(tenant_id))
        if domain_id:
            query = query.where(Setting.domain_id == str(domain_id))
        query = query.order_by(Setting.domain_id, Setting.ui_order)
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def update_setting(
        self, 
        setting_id: UUID, 
        tenant_id: UUID, 
        update_data: Dict[str, Any],
        user_id: Optional[str] = None
    ) -> Optional[Setting]:
        """Update a setting and record history."""
        # Get the current setting
        setting = await self.get_setting(setting_id, tenant_id)
        if not setting:
            return None
        
        # Record history if the value is being updated
        if 'value' in update_data and update_data['value'] != setting.value:
            history_entry = SettingHistory(
                setting_id=str(setting_id),
                previous_value=setting.value,
                new_value=update_data['value'],
                changed_by=user_id
            )
            self.db.add(history_entry)
            
            # Update the last_modified fields
            update_data['last_modified_by'] = user_id
            
        # Update the setting
        query = update(Setting).where(
            Setting.id == str(setting_id),
            Setting.tenant_id == str(tenant_id)
        ).values(**update_data).returning(Setting)
        
        result = await self.db.execute(query)
        return result.scalars().first()
    
    async def delete_setting(self, setting_id: UUID, tenant_id: UUID) -> bool:
        """Delete a setting."""
        query = delete(Setting).where(
            Setting.id == str(setting_id),
            Setting.tenant_id == str(tenant_id)
        )
        result = await self.db.execute(query)
        return result.rowcount > 0
    
    async def get_settings_as_dict(
        self, 
        tenant_id: UUID, 
        domain_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get all settings for a tenant as a dictionary, optionally filtered by domain."""
        settings_dict = {}
        
        # Build the query
        query = select(Setting).where(Setting.tenant_id == str(tenant_id))
        if domain_name:
            domain = await self.get_domain_by_name(domain_name, tenant_id)
            if domain:
                query = query.where(Setting.domain_id == domain.id)
            else:
                return settings_dict
                
        # Execute the query
        result = await self.db.execute(query)
        settings = result.scalars().all()
        
        # Convert to dictionary
        for setting in settings:
            settings_dict[setting.key] = setting.value
            
        return settings_dict
    
    async def bulk_update_settings(
        self,
        tenant_id: UUID,
        settings_data: Dict[str, Any],
        domain_name: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Update multiple settings at once."""
        updated_settings = {}
        
        # Get the domain ID if provided
        domain_id = None
        if domain_name:
            domain = await self.get_domain_by_name(domain_name, tenant_id)
            if domain:
                domain_id = domain.id
            else:
                return updated_settings
        
        # Update each setting
        for key, value in settings_data.items():
            # Find the setting
            query = select(Setting).where(
                Setting.key == key,
                Setting.tenant_id == str(tenant_id)
            )
            if domain_id:
                query = query.where(Setting.domain_id == str(domain_id))
            
            result = await self.db.execute(query)
            setting = result.scalars().first()
            
            if setting:
                # Update the setting
                updated = await self.update_setting(
                    UUID(setting.id),
                    tenant_id,
                    {"value": value},
                    user_id
                )
                if updated:
                    updated_settings[key] = value
        
        return updated_settings
    
    # Setting History Operations
    
    async def create_history_entry(self, history_data: SettingHistoryCreate) -> SettingHistory:
        """Create a new history entry for a setting."""
        history = SettingHistory(**history_data.dict())
        self.db.add(history)
        await self.db.flush()
        return history
    
    async def get_setting_history(
        self, 
        setting_id: UUID, 
        tenant_id: UUID
    ) -> List[SettingHistory]:
        """Get the history for a setting."""
        # First verify the setting belongs to the tenant
        setting = await self.get_setting(setting_id, tenant_id)
        if not setting:
            return []
            
        # Get the history
        query = select(SettingHistory).where(
            SettingHistory.setting_id == str(setting_id)
        ).order_by(SettingHistory.changed_at.desc())
        
        result = await self.db.execute(query)
        return result.scalars().all()
