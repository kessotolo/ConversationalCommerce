from typing import List, Optional, Dict, Any
import uuid
from sqlalchemy import select, update, delete, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.shipping import SellerShippingProvider, ShippingCourier


class SellerShippingRepository:
    """Repository for managing seller shipping providers and couriers"""

    def __init__(self, session: AsyncSession):
        self.session = session

    # Shipping Provider methods
    async def create_provider(self, tenant_id: uuid.UUID, provider_data: Dict[str, Any]) -> SellerShippingProvider:
        """Create a new shipping provider for a tenant"""
        db_provider = SellerShippingProvider(tenant_id=tenant_id, **provider_data)
        self.session.add(db_provider)
        await self.session.flush()
        return db_provider

    async def get_provider(self, provider_id: uuid.UUID, tenant_id: uuid.UUID) -> Optional[SellerShippingProvider]:
        """Get a shipping provider by ID for a specific tenant"""
        stmt = select(SellerShippingProvider).where(
            and_(
                SellerShippingProvider.id == provider_id,
                SellerShippingProvider.tenant_id == tenant_id
            )
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def list_providers(self, tenant_id: uuid.UUID, skip: int = 0, limit: int = 100) -> List[SellerShippingProvider]:
        """List all shipping providers for a tenant with optional pagination"""
        stmt = select(SellerShippingProvider).where(
            SellerShippingProvider.tenant_id == tenant_id
        ).offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def update_provider(
        self, provider_id: uuid.UUID, tenant_id: uuid.UUID, provider_data: Dict[str, Any]
    ) -> Optional[SellerShippingProvider]:
        """Update a shipping provider"""
        stmt = update(SellerShippingProvider).where(
            and_(
                SellerShippingProvider.id == provider_id,
                SellerShippingProvider.tenant_id == tenant_id
            )
        ).values(**provider_data).returning(SellerShippingProvider)
        
        result = await self.session.execute(stmt)
        await self.session.flush()
        return result.scalars().first()

    async def delete_provider(self, provider_id: uuid.UUID, tenant_id: uuid.UUID) -> bool:
        """Delete a shipping provider"""
        stmt = delete(SellerShippingProvider).where(
            and_(
                SellerShippingProvider.id == provider_id,
                SellerShippingProvider.tenant_id == tenant_id
            )
        )
        result = await self.session.execute(stmt)
        await self.session.flush()
        return result.rowcount > 0

    async def get_default_provider(self, tenant_id: uuid.UUID) -> Optional[SellerShippingProvider]:
        """Get the default shipping provider for a tenant"""
        stmt = select(SellerShippingProvider).where(
            and_(
                SellerShippingProvider.tenant_id == tenant_id,
                SellerShippingProvider.is_default == True,
                SellerShippingProvider.is_active == True
            )
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def set_default_provider(self, provider_id: uuid.UUID, tenant_id: uuid.UUID) -> bool:
        """Set a provider as the default for a tenant, unsetting any previous default"""
        # First, unset any existing default
        clear_stmt = update(SellerShippingProvider).where(
            and_(
                SellerShippingProvider.tenant_id == tenant_id,
                SellerShippingProvider.is_default == True
            )
        ).values(is_default=False)
        
        await self.session.execute(clear_stmt)
        
        # Then set the new default
        set_stmt = update(SellerShippingProvider).where(
            and_(
                SellerShippingProvider.id == provider_id,
                SellerShippingProvider.tenant_id == tenant_id
            )
        ).values(is_default=True)
        
        result = await self.session.execute(set_stmt)
        await self.session.flush()
        return result.rowcount > 0

    # Courier methods
    async def create_courier(self, tenant_id: uuid.UUID, provider_id: uuid.UUID, courier_data: Dict[str, Any]) -> ShippingCourier:
        """Create a new courier for a shipping provider"""
        db_courier = ShippingCourier(
            tenant_id=tenant_id, 
            provider_id=provider_id,
            **courier_data
        )
        self.session.add(db_courier)
        await self.session.flush()
        return db_courier

    async def get_courier(self, courier_id: uuid.UUID, tenant_id: uuid.UUID) -> Optional[ShippingCourier]:
        """Get a courier by ID for a specific tenant"""
        stmt = select(ShippingCourier).where(
            and_(
                ShippingCourier.id == courier_id,
                ShippingCourier.tenant_id == tenant_id
            )
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def list_couriers(
        self, tenant_id: uuid.UUID, provider_id: Optional[uuid.UUID] = None
    ) -> List[ShippingCourier]:
        """List all couriers for a tenant, optionally filtered by provider"""
        conditions = [ShippingCourier.tenant_id == tenant_id]
        if provider_id:
            conditions.append(ShippingCourier.provider_id == provider_id)
            
        stmt = select(ShippingCourier).where(and_(*conditions))
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def update_courier(
        self, courier_id: uuid.UUID, tenant_id: uuid.UUID, courier_data: Dict[str, Any]
    ) -> Optional[ShippingCourier]:
        """Update a courier"""
        stmt = update(ShippingCourier).where(
            and_(
                ShippingCourier.id == courier_id,
                ShippingCourier.tenant_id == tenant_id
            )
        ).values(**courier_data).returning(ShippingCourier)
        
        result = await self.session.execute(stmt)
        await self.session.flush()
        return result.scalars().first()

    async def delete_courier(self, courier_id: uuid.UUID, tenant_id: uuid.UUID) -> bool:
        """Delete a courier"""
        stmt = delete(ShippingCourier).where(
            and_(
                ShippingCourier.id == courier_id,
                ShippingCourier.tenant_id == tenant_id
            )
        )
        result = await self.session.execute(stmt)
        await self.session.flush()
        return result.rowcount > 0
