from typing import Dict, List, Set, Tuple, Optional
import uuid
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.future import select
from sqlalchemy import func

from app.models.product import Product
from app.models.product_variant import ProductVariant, VariantOption, VariantOptionValue
from app.schemas.product_variant import ProductVariantCreate, ProductVariantUpdate


class ProductVariantValidationService:
    """
    Service for validating product variants and their combinations
    """
    
    @staticmethod
    async def validate_variant_combination(
        db: Session,
        product_id: uuid.UUID,
        option_value_ids: List[uuid.UUID],
        variant_id: Optional[uuid.UUID] = None,
        tenant_id: Optional[uuid.UUID] = None
    ) -> bool:
        """
        Validate that a variant combination does not already exist for a product
        
        Args:
            db: Database session
            product_id: Product ID
            option_value_ids: List of option value IDs for the variant combination
            variant_id: Optional variant ID to exclude from the duplicate check
            tenant_id: Optional tenant ID for multi-tenancy
            
        Returns:
            True if the combination is valid, False otherwise
            
        Raises:
            HTTPException: If the combination is not valid
        """
        if not option_value_ids:
            return True
            
        # Get all variants for the product
        query = select(ProductVariant).where(ProductVariant.product_id == product_id)
        
        if tenant_id:
            query = query.where(ProductVariant.tenant_id == tenant_id)
            
        if variant_id:
            query = query.where(ProductVariant.id != variant_id)
            
        result = await db.execute(query)
        variants = result.scalars().all()
        
        # Check if any existing variant has the same option values
        for variant in variants:
            existing_value_ids = {value.id for value in variant.option_values}
            
            # Check if the sets of option value IDs are the same
            if set(option_value_ids) == existing_value_ids:
                raise HTTPException(
                    status_code=400,
                    detail="A variant with this combination of options already exists"
                )
                
        return True
    
    @staticmethod
    async def validate_option_value_compatibility(
        db: Session,
        product_id: uuid.UUID,
        option_value_ids: List[uuid.UUID],
        tenant_id: Optional[uuid.UUID] = None
    ) -> bool:
        """
        Validate that option values in a combination belong to different options
        
        Args:
            db: Database session
            product_id: Product ID
            option_value_ids: List of option value IDs for the variant combination
            tenant_id: Optional tenant ID for multi-tenancy
            
        Returns:
            True if the values are compatible, False otherwise
            
        Raises:
            HTTPException: If the option values are not compatible
        """
        if not option_value_ids:
            return True
            
        # Get all option values and their option IDs
        option_ids = set()
        
        for value_id in option_value_ids:
            query = select(VariantOptionValue).where(VariantOptionValue.id == value_id)
            
            if tenant_id:
                query = query.where(VariantOptionValue.tenant_id == tenant_id)
                
            result = await db.execute(query)
            value = result.scalars().first()
            
            if not value:
                raise HTTPException(
                    status_code=404,
                    detail=f"Option value with ID {value_id} not found"
                )
                
            # Check if the value belongs to an option of this product
            option_query = select(VariantOption).where(
                VariantOption.id == value.option_id,
                VariantOption.product_id == product_id
            )
            
            if tenant_id:
                option_query = option_query.where(VariantOption.tenant_id == tenant_id)
                
            option_result = await db.execute(option_query)
            option = option_result.scalars().first()
            
            if not option:
                raise HTTPException(
                    status_code=400,
                    detail=f"Option value with ID {value_id} does not belong to this product"
                )
                
            # Check if we already have a value for this option
            if value.option_id in option_ids:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot use multiple values from the same option in a variant"
                )
                
            option_ids.add(value.option_id)
            
        return True
    
    @staticmethod
    async def generate_variant_matrix(
        db: Session,
        product_id: uuid.UUID,
        tenant_id: Optional[uuid.UUID] = None
    ) -> List[List[uuid.UUID]]:
        """
        Generate all possible variant combinations for a product
        
        Args:
            db: Database session
            product_id: Product ID
            tenant_id: Optional tenant ID for multi-tenancy
            
        Returns:
            List of option value ID combinations
        """
        # Get all variant options for the product
        options_query = select(VariantOption).where(VariantOption.product_id == product_id)
        
        if tenant_id:
            options_query = options_query.where(VariantOption.tenant_id == tenant_id)
            
        options_result = await db.execute(options_query)
        options = options_result.scalars().all()
        
        if not options:
            return []
            
        # Get option values for each option
        option_values: List[List[uuid.UUID]] = []
        
        for option in options:
            values_query = select(VariantOptionValue).where(
                VariantOptionValue.option_id == option.id
            )
            
            if tenant_id:
                values_query = values_query.where(VariantOptionValue.tenant_id == tenant_id)
                
            values_result = await db.execute(values_query)
            values = values_result.scalars().all()
            
            if values:
                option_values.append([value.id for value in values])
        
        # Generate all possible combinations
        if not option_values:
            return []
            
        result = [[]]
        for value_ids in option_values:
            result = [x + [y] for x in result for y in value_ids]
            
        return result
        
    @staticmethod
    async def validate_inventory_quantity(
        inventory_quantity: int,
        track_inventory: bool
    ) -> bool:
        """
        Validate inventory quantity value
        
        Args:
            inventory_quantity: Inventory quantity to validate
            track_inventory: Whether inventory is being tracked
            
        Returns:
            True if the inventory quantity is valid, False otherwise
            
        Raises:
            HTTPException: If the inventory quantity is not valid
        """
        if track_inventory and inventory_quantity < 0:
            raise HTTPException(
                status_code=400,
                detail="Inventory quantity cannot be negative"
            )
            
        return True
    
    @staticmethod
    async def validate_default_variant(
        db: Session,
        product_id: uuid.UUID,
        is_default: bool,
        variant_id: Optional[uuid.UUID] = None,
        tenant_id: Optional[uuid.UUID] = None
    ) -> bool:
        """
        Validate default variant setting
        
        Args:
            db: Database session
            product_id: Product ID
            is_default: Whether the variant is default
            variant_id: Optional variant ID to exclude from the check
            tenant_id: Optional tenant ID for multi-tenancy
            
        Returns:
            True if the default setting is valid, False otherwise
        """
        # If not setting as default, no validation needed
        if not is_default:
            return True
            
        # Check if there's already a default variant
        query = select(ProductVariant).where(
            ProductVariant.product_id == product_id,
            ProductVariant.is_default == True
        )
        
        if variant_id:
            query = query.where(ProductVariant.id != variant_id)
            
        if tenant_id:
            query = query.where(ProductVariant.tenant_id == tenant_id)
            
        result = await db.execute(query)
        existing_default = result.scalars().first()
        
        # It's okay if there's no existing default or we're updating the default
        return True
