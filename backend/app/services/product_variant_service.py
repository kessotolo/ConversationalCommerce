from typing import Dict, List, Optional, Union, Any
import uuid
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.future import select
from sqlalchemy import func

from app.app.models.product import Product
from app.app.models.product_variant import ProductVariant, VariantOption, VariantOptionValue
from app.app.schemas.product_variant import (
    ProductVariantCreate,
    ProductVariantUpdate,
    VariantOptionCreate,
    VariantOptionUpdate,
    VariantOptionValueCreate,
    VariantOptionValueUpdate,
)


class ProductVariantService:
    """
    Service for managing product variants and variant options
    """
    
    @staticmethod
    async def get_variant_options(db: Session, product_id: uuid.UUID, tenant_id: Optional[uuid.UUID] = None) -> List[VariantOption]:
        """
        Get all variant options for a product
        """
        query = select(VariantOption).where(VariantOption.product_id == product_id)
        
        if tenant_id:
            query = query.where(VariantOption.tenant_id == tenant_id)
            
        result = await db.execute(query)
        variant_options = result.scalars().all()
        
        return variant_options
    
    @staticmethod
    async def get_variant_option(db: Session, option_id: uuid.UUID, tenant_id: Optional[uuid.UUID] = None) -> VariantOption:
        """
        Get a specific variant option by ID
        """
        query = select(VariantOption).where(VariantOption.id == option_id)
        
        if tenant_id:
            query = query.where(VariantOption.tenant_id == tenant_id)
            
        result = await db.execute(query)
        variant_option = result.scalars().first()
        
        if not variant_option:
            raise HTTPException(status_code=404, detail="Variant option not found")
        
        return variant_option
    
    @staticmethod
    async def create_variant_option(
        db: Session, 
        product_id: uuid.UUID, 
        option_data: VariantOptionCreate,
        tenant_id: Optional[uuid.UUID] = None
    ) -> VariantOption:
        """
        Create a new variant option with values for a product
        """
        # Check if the product exists
        product_query = select(Product).where(Product.id == product_id)
        if tenant_id:
            product_query = product_query.where(Product.tenant_id == tenant_id)
        
        product_result = await db.execute(product_query)
        product = product_result.scalars().first()
        
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        # Get next display order if not specified
        if option_data.display_order == 0:
            max_order_query = select(func.max(VariantOption.display_order)).where(
                VariantOption.product_id == product_id
            )
            max_order_result = await db.execute(max_order_query)
            max_order = max_order_result.scalar() or 0
            display_order = max_order + 1
        else:
            display_order = option_data.display_order
        
        # Create the variant option
        variant_option = VariantOption(
            product_id=product_id,
            name=option_data.name,
            type=option_data.type,
            display_order=display_order,
            metadata=option_data.metadata,
            tenant_id=tenant_id
        )
        
        db.add(variant_option)
        await db.flush()
        
        # Create option values if provided
        for i, value_data in enumerate(option_data.values):
            value = VariantOptionValue(
                option_id=variant_option.id,
                name=value_data.name,
                display_order=value_data.display_order or i,
                metadata=value_data.metadata,
                tenant_id=tenant_id
            )
            db.add(value)
        
        await db.commit()
        await db.refresh(variant_option)
        
        return variant_option
    
    @staticmethod
    async def update_variant_option(
        db: Session,
        option_id: uuid.UUID,
        option_data: VariantOptionUpdate,
        tenant_id: Optional[uuid.UUID] = None
    ) -> VariantOption:
        """
        Update a variant option
        """
        # Get the variant option
        query = select(VariantOption).where(VariantOption.id == option_id)
        if tenant_id:
            query = query.where(VariantOption.tenant_id == tenant_id)
        
        result = await db.execute(query)
        variant_option = result.scalars().first()
        
        if not variant_option:
            raise HTTPException(status_code=404, detail="Variant option not found")
        
        # Update the fields
        if option_data.name is not None:
            variant_option.name = option_data.name
        
        if option_data.type is not None:
            variant_option.type = option_data.type
        
        if option_data.display_order is not None:
            variant_option.display_order = option_data.display_order
        
        if option_data.metadata is not None:
            variant_option.metadata = option_data.metadata
        
        await db.commit()
        await db.refresh(variant_option)
        
        return variant_option
    
    @staticmethod
    async def delete_variant_option(
        db: Session,
        option_id: uuid.UUID,
        tenant_id: Optional[uuid.UUID] = None
    ) -> bool:
        """
        Delete a variant option and its values
        """
        # Get the variant option
        query = select(VariantOption).where(VariantOption.id == option_id)
        if tenant_id:
            query = query.where(VariantOption.tenant_id == tenant_id)
        
        result = await db.execute(query)
        variant_option = result.scalars().first()
        
        if not variant_option:
            raise HTTPException(status_code=404, detail="Variant option not found")
        
        # Delete the variant option (cascade will delete values)
        await db.delete(variant_option)
        await db.commit()
        
        return True
    
    @staticmethod
    async def create_option_value(
        db: Session,
        option_id: uuid.UUID,
        value_data: VariantOptionValueCreate,
        tenant_id: Optional[uuid.UUID] = None
    ) -> VariantOptionValue:
        """
        Add a new value to a variant option
        """
        # Check if option exists
        option_query = select(VariantOption).where(VariantOption.id == option_id)
        if tenant_id:
            option_query = option_query.where(VariantOption.tenant_id == tenant_id)
        
        option_result = await db.execute(option_query)
        option = option_result.scalars().first()
        
        if not option:
            raise HTTPException(status_code=404, detail="Variant option not found")
        
        # Get next display order if not specified
        if value_data.display_order == 0:
            max_order_query = select(func.max(VariantOptionValue.display_order)).where(
                VariantOptionValue.option_id == option_id
            )
            max_order_result = await db.execute(max_order_query)
            max_order = max_order_result.scalar() or 0
            display_order = max_order + 1
        else:
            display_order = value_data.display_order
        
        # Create the value
        value = VariantOptionValue(
            option_id=option_id,
            name=value_data.name,
            display_order=display_order,
            metadata=value_data.metadata,
            tenant_id=tenant_id
        )
        
        db.add(value)
        await db.commit()
        await db.refresh(value)
        
        return value
    
    @staticmethod
    async def update_option_value(
        db: Session,
        value_id: uuid.UUID,
        value_data: VariantOptionValueUpdate,
        tenant_id: Optional[uuid.UUID] = None
    ) -> VariantOptionValue:
        """
        Update a variant option value
        """
        # Get the value
        query = select(VariantOptionValue).where(VariantOptionValue.id == value_id)
        if tenant_id:
            query = query.where(VariantOptionValue.tenant_id == tenant_id)
        
        result = await db.execute(query)
        value = result.scalars().first()
        
        if not value:
            raise HTTPException(status_code=404, detail="Option value not found")
        
        # Update fields
        if value_data.name is not None:
            value.name = value_data.name
        
        if value_data.display_order is not None:
            value.display_order = value_data.display_order
        
        if value_data.metadata is not None:
            value.metadata = value_data.metadata
        
        await db.commit()
        await db.refresh(value)
        
        return value
    
    @staticmethod
    async def delete_option_value(
        db: Session,
        value_id: uuid.UUID,
        tenant_id: Optional[uuid.UUID] = None
    ) -> bool:
        """
        Delete a variant option value
        """
        # Get the value
        query = select(VariantOptionValue).where(VariantOptionValue.id == value_id)
        if tenant_id:
            query = query.where(VariantOptionValue.tenant_id == tenant_id)
        
        result = await db.execute(query)
        value = result.scalars().first()
        
        if not value:
            raise HTTPException(status_code=404, detail="Option value not found")
        
        # Delete the value
        await db.delete(value)
        await db.commit()
        
        return True
    
    @staticmethod
    async def get_product_variants(
        db: Session,
        product_id: uuid.UUID,
        tenant_id: Optional[uuid.UUID] = None
    ) -> List[ProductVariant]:
        """
        Get all variants for a product
        """
        query = select(ProductVariant).where(ProductVariant.product_id == product_id)
        
        if tenant_id:
            query = query.where(ProductVariant.tenant_id == tenant_id)
        
        result = await db.execute(query)
        variants = result.scalars().all()
        
        return variants
    
    @staticmethod
    async def get_product_variant(
        db: Session,
        variant_id: uuid.UUID,
        tenant_id: Optional[uuid.UUID] = None
    ) -> ProductVariant:
        """
        Get a specific product variant by ID
        """
        query = select(ProductVariant).where(ProductVariant.id == variant_id)
        
        if tenant_id:
            query = query.where(ProductVariant.tenant_id == tenant_id)
        
        result = await db.execute(query)
        variant = result.scalars().first()
        
        if not variant:
            raise HTTPException(status_code=404, detail="Product variant not found")
        
        return variant
    
    @staticmethod
    async def create_product_variant(
        db: Session,
        product_id: uuid.UUID,
        variant_data: ProductVariantCreate,
        tenant_id: Optional[uuid.UUID] = None
    ) -> ProductVariant:
        """
        Create a new product variant
        """
        # Check if product exists
        product_query = select(Product).where(Product.id == product_id)
        if tenant_id:
            product_query = product_query.where(Product.tenant_id == tenant_id)
        
        product_result = await db.execute(product_query)
        product = product_result.scalars().first()
        
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        # Check if SKU is unique
        sku_query = select(ProductVariant).where(ProductVariant.sku == variant_data.sku)
        sku_result = await db.execute(sku_query)
        existing_variant = sku_result.scalars().first()
        
        if existing_variant:
            raise HTTPException(status_code=400, detail="SKU already exists")
        
        # Create the variant
        variant = ProductVariant(
            product_id=product_id,
            sku=variant_data.sku,
            name=variant_data.name,
            price=variant_data.price,
            inventory_quantity=variant_data.inventory_quantity,
            image_url=variant_data.image_url,
            barcode=variant_data.barcode,
            weight=variant_data.weight,
            weight_unit=variant_data.weight_unit,
            dimensions=variant_data.dimensions,
            is_default=variant_data.is_default,
            tenant_id=tenant_id
        )
        
        db.add(variant)
        await db.flush()
        
        # Add option values if provided
        if variant_data.option_value_ids:
            for value_id in variant_data.option_value_ids:
                # Check if value exists
                value_query = select(VariantOptionValue).where(VariantOptionValue.id == value_id)
                if tenant_id:
                    value_query = value_query.where(VariantOptionValue.tenant_id == tenant_id)
                
                value_result = await db.execute(value_query)
                value = value_result.scalars().first()
                
                if not value:
                    await db.rollback()
                    raise HTTPException(status_code=404, detail=f"Option value with ID {value_id} not found")
                
                variant.option_values.append(value)
        
        # If this is the default variant, unset other defaults
        if variant.is_default:
            default_query = (
                select(ProductVariant)
                .where(ProductVariant.product_id == product_id)
                .where(ProductVariant.is_default == True)
                .where(ProductVariant.id != variant.id)
            )
            
            if tenant_id:
                default_query = default_query.where(ProductVariant.tenant_id == tenant_id)
            
            default_result = await db.execute(default_query)
            default_variants = default_result.scalars().all()
            
            for default_variant in default_variants:
                default_variant.is_default = False
        
        await db.commit()
        await db.refresh(variant)
        
        return variant
    
    @staticmethod
    async def update_product_variant(
        db: Session,
        variant_id: uuid.UUID,
        variant_data: ProductVariantUpdate,
        tenant_id: Optional[uuid.UUID] = None
    ) -> ProductVariant:
        """
        Update a product variant
        """
        # Get the variant
        query = select(ProductVariant).where(ProductVariant.id == variant_id)
        if tenant_id:
            query = query.where(ProductVariant.tenant_id == tenant_id)
        
        result = await db.execute(query)
        variant = result.scalars().first()
        
        if not variant:
            raise HTTPException(status_code=404, detail="Product variant not found")
        
        # Check if SKU exists for another variant
        if variant_data.sku is not None and variant_data.sku != variant.sku:
            sku_query = (
                select(ProductVariant)
                .where(ProductVariant.sku == variant_data.sku)
                .where(ProductVariant.id != variant_id)
            )
            
            sku_result = await db.execute(sku_query)
            existing_variant = sku_result.scalars().first()
            
            if existing_variant:
                raise HTTPException(status_code=400, detail="SKU already exists")
            
            variant.sku = variant_data.sku
        
        # Update other fields
        if variant_data.name is not None:
            variant.name = variant_data.name
        
        if variant_data.price is not None:
            variant.price = variant_data.price
        
        if variant_data.inventory_quantity is not None:
            variant.inventory_quantity = variant_data.inventory_quantity
        
        if variant_data.image_url is not None:
            variant.image_url = variant_data.image_url
        
        if variant_data.barcode is not None:
            variant.barcode = variant_data.barcode
        
        if variant_data.weight is not None:
            variant.weight = variant_data.weight
        
        if variant_data.weight_unit is not None:
            variant.weight_unit = variant_data.weight_unit
        
        if variant_data.dimensions is not None:
            variant.dimensions = variant_data.dimensions
        
        # Handle default flag
        if variant_data.is_default is not None and variant_data.is_default != variant.is_default:
            variant.is_default = variant_data.is_default
            
            # If this is now the default variant, unset other defaults
            if variant.is_default:
                default_query = (
                    select(ProductVariant)
                    .where(ProductVariant.product_id == variant.product_id)
                    .where(ProductVariant.is_default == True)
                    .where(ProductVariant.id != variant_id)
                )
                
                if tenant_id:
                    default_query = default_query.where(ProductVariant.tenant_id == tenant_id)
                
                default_result = await db.execute(default_query)
                default_variants = default_result.scalars().all()
                
                for default_variant in default_variants:
                    default_variant.is_default = False
        
        # Update option values if provided
        if variant_data.option_value_ids is not None:
            # Clear existing values
            variant.option_values = []
            
            # Add new values
            for value_id in variant_data.option_value_ids:
                value_query = select(VariantOptionValue).where(VariantOptionValue.id == value_id)
                if tenant_id:
                    value_query = value_query.where(VariantOptionValue.tenant_id == tenant_id)
                
                value_result = await db.execute(value_query)
                value = value_result.scalars().first()
                
                if not value:
                    await db.rollback()
                    raise HTTPException(status_code=404, detail=f"Option value with ID {value_id} not found")
                
                variant.option_values.append(value)
        
        await db.commit()
        await db.refresh(variant)
        
        return variant
    
    @staticmethod
    async def delete_product_variant(
        db: Session,
        variant_id: uuid.UUID,
        tenant_id: Optional[uuid.UUID] = None
    ) -> bool:
        """
        Delete a product variant
        """
        # Get the variant
        query = select(ProductVariant).where(ProductVariant.id == variant_id)
        if tenant_id:
            query = query.where(ProductVariant.tenant_id == tenant_id)
        
        result = await db.execute(query)
        variant = result.scalars().first()
        
        if not variant:
            raise HTTPException(status_code=404, detail="Product variant not found")
        
        # Delete the variant
        await db.delete(variant)
        await db.commit()
        
        return True
