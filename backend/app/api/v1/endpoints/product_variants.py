from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_current_tenant_user, get_db
from backend.app.models.users import User
from backend.app.services.product_variant_service import ProductVariantService
from backend.app.schemas.product_variant import (
    ProductVariant,
    ProductVariantCreate,
    ProductVariantUpdate,
    VariantOption,
    VariantOptionCreate,
    VariantOptionUpdate,
    VariantOptionValue,
    VariantOptionValueCreate,
    VariantOptionValueUpdate,
)

router = APIRouter()


@router.get("/products/{product_id}/variants/options",
            response_model=List[VariantOption],
            summary="Get product variant options")
async def get_variant_options(
    product_id: uuid.UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_tenant_user),
):
    """
    Get all variant options for a product
    """
    tenant_id = current_user.tenant_id
    options = await ProductVariantService.get_variant_options(db, product_id, tenant_id)
    return options


@router.post("/products/{product_id}/variants/options",
             response_model=VariantOption,
             status_code=201,
             summary="Create a variant option")
async def create_variant_option(
    option_data: VariantOptionCreate,
    product_id: uuid.UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_tenant_user),
):
    """
    Create a new variant option for a product
    """
    tenant_id = current_user.tenant_id
    option = await ProductVariantService.create_variant_option(
        db, product_id, option_data, tenant_id
    )
    return option


@router.get("/products/variants/options/{option_id}",
            response_model=VariantOption,
            summary="Get a variant option")
async def get_variant_option(
    option_id: uuid.UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_tenant_user),
):
    """
    Get a specific variant option by ID
    """
    tenant_id = current_user.tenant_id
    option = await ProductVariantService.get_variant_option(db, option_id, tenant_id)
    return option


@router.patch("/products/variants/options/{option_id}",
              response_model=VariantOption,
              summary="Update a variant option")
async def update_variant_option(
    option_data: VariantOptionUpdate,
    option_id: uuid.UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_tenant_user),
):
    """
    Update a variant option
    """
    tenant_id = current_user.tenant_id
    option = await ProductVariantService.update_variant_option(
        db, option_id, option_data, tenant_id
    )
    return option


@router.delete("/products/variants/options/{option_id}",
               status_code=204,
               summary="Delete a variant option")
async def delete_variant_option(
    option_id: uuid.UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_tenant_user),
):
    """
    Delete a variant option and its values
    """
    tenant_id = current_user.tenant_id
    await ProductVariantService.delete_variant_option(db, option_id, tenant_id)
    return None


@router.post("/products/variants/options/{option_id}/values",
             response_model=VariantOptionValue,
             status_code=201,
             summary="Create an option value")
async def create_option_value(
    value_data: VariantOptionValueCreate,
    option_id: uuid.UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_tenant_user),
):
    """
    Create a new value for a variant option
    """
    tenant_id = current_user.tenant_id
    value = await ProductVariantService.create_option_value(
        db, option_id, value_data, tenant_id
    )
    return value


@router.patch("/products/variants/options/values/{value_id}",
              response_model=VariantOptionValue,
              summary="Update an option value")
async def update_option_value(
    value_data: VariantOptionValueUpdate,
    value_id: uuid.UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_tenant_user),
):
    """
    Update a variant option value
    """
    tenant_id = current_user.tenant_id
    value = await ProductVariantService.update_option_value(
        db, value_id, value_data, tenant_id
    )
    return value


@router.delete("/products/variants/options/values/{value_id}",
               status_code=204,
               summary="Delete an option value")
async def delete_option_value(
    value_id: uuid.UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_tenant_user),
):
    """
    Delete a variant option value
    """
    tenant_id = current_user.tenant_id
    await ProductVariantService.delete_option_value(db, value_id, tenant_id)
    return None


@router.get("/products/{product_id}/variants",
            response_model=List[ProductVariant],
            summary="Get product variants")
async def get_product_variants(
    product_id: uuid.UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_tenant_user),
):
    """
    Get all variants for a product
    """
    tenant_id = current_user.tenant_id
    variants = await ProductVariantService.get_product_variants(db, product_id, tenant_id)
    return variants


@router.post("/products/{product_id}/variants",
             response_model=ProductVariant,
             status_code=201,
             summary="Create a product variant")
async def create_product_variant(
    variant_data: ProductVariantCreate,
    product_id: uuid.UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_tenant_user),
):
    """
    Create a new product variant
    """
    tenant_id = current_user.tenant_id
    variant = await ProductVariantService.create_product_variant(
        db, product_id, variant_data, tenant_id
    )
    return variant


@router.get("/products/variants/{variant_id}",
            response_model=ProductVariant,
            summary="Get a product variant")
async def get_product_variant(
    variant_id: uuid.UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_tenant_user),
):
    """
    Get a specific product variant by ID
    """
    tenant_id = current_user.tenant_id
    variant = await ProductVariantService.get_product_variant(db, variant_id, tenant_id)
    return variant


@router.patch("/products/variants/{variant_id}",
              response_model=ProductVariant,
              summary="Update a product variant")
async def update_product_variant(
    variant_data: ProductVariantUpdate,
    variant_id: uuid.UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_tenant_user),
):
    """
    Update a product variant
    """
    tenant_id = current_user.tenant_id
    variant = await ProductVariantService.update_product_variant(
        db, variant_id, variant_data, tenant_id
    )
    return variant


@router.delete("/products/variants/{variant_id}",
               status_code=204,
               summary="Delete a product variant")
async def delete_product_variant(
    variant_id: uuid.UUID = Path(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_tenant_user),
):
    """
    Delete a product variant
    """
    tenant_id = current_user.tenant_id
    await ProductVariantService.delete_product_variant(db, variant_id, tenant_id)
    return None
