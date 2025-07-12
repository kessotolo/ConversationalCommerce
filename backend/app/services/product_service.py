from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID

from fastapi import Request
from sqlalchemy import and_, desc, or_, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from backend.app.core.exceptions import (
    DatabaseError,
    ProductNotFoundError,
    ProductPermissionError,
    ProductValidationError,
    AppError,
)
from backend.app.models.product import Product as ProductModel
from backend.app.schemas.product import ProductCreate, ProductSearchParams, ProductUpdate

# Add a new exception for optimistic locking conflicts


class ConcurrentModificationError(AppError):
    """Raised when a concurrent modification is detected via optimistic locking"""
    # Extend with context attributes as needed


async def create_product(
    db: AsyncSession, product_in: ProductCreate, request: Request = None
) -> ProductModel:
    """
    Create a new product with text and image validation.

    Args:
        db: Database session
        product_in: Product creation data
        request: FastAPI request object for tenant context

    Returns:
        Created product

    Raises:
        ProductValidationError: If product data is invalid
        ProductPermissionError: If user doesn't have permission
        DatabaseError: If database operation fails
    """
    # Add debug logging
    import logging
    logger = logging.getLogger(__name__)
    
    logger.debug(f"create_product called with request: {request}")
    
    # Check tenant context
    tenant_id = None
    if request and hasattr(request.state, 'tenant_id'):
        tenant_id = request.state.tenant_id
        logger.debug(f"Found tenant_id in request.state: {tenant_id}")
    elif request and hasattr(request.state, 'tenant_context') and request.state.tenant_context:
        tenant_id = request.state.tenant_context.get('tenant_id')
        logger.debug(f"Found tenant_id in tenant_context: {tenant_id}")
    else:
        logger.warning("No tenant_id found in request state")
        
    # For test debugging only
    import os
    if os.getenv("TESTING", "").lower() in ("true", "1", "t", "yes", "y"):
        logger.debug("Running in TEST mode")
        try:
            # Verify database connection can see test data
            from sqlalchemy import text
            result = await db.execute(text("SELECT COUNT(*) FROM tenants"))
            count = result.scalar()
            logger.debug(f"Found {count} tenants in database")
            
            if tenant_id:
                result = await db.execute(
                    text("SELECT name FROM tenants WHERE id = :tenant_id"),
                    {"tenant_id": tenant_id}
                )
                tenant_name = result.scalar()
                logger.debug(f"Tenant name for ID {tenant_id}: {tenant_name}")
        except Exception as e:
            logger.error(f"Error querying test data: {e}")
    
    try:
        async with db.begin():
            logger.debug(f"Creating product with data: {product_in.model_dump()}")
            product = ProductModel(**product_in.model_dump())
            
            # Ensure tenant_id is set if available
            if tenant_id and not product.tenant_id:
                product.tenant_id = tenant_id
                logger.debug(f"Setting product tenant_id from request: {tenant_id}")
            
            db.add(product)
            await db.flush()
            await db.refresh(product)
            logger.debug(f"Product created successfully: {product.id}")
            return product
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in create_product: {type(e).__name__}: {e}")
        if isinstance(e, ProductValidationError):
            raise
        # Wrap other exceptions
        raise DatabaseError(f"Error creating product: {str(e)}")


def get_product(db: Session, product_id: UUID) -> Optional[ProductModel]:
    """
    Get a product by ID.

    Args:
        db: Database session
        product_id: Product ID

    Returns:
        Product if found, None otherwise

    Raises:
        DatabaseError: If database operation fails
    """
    try:
        return (
            db.query(ProductModel)
            .filter(ProductModel.id == product_id, not ProductModel.is_deleted)
            .first()
        )
    except Exception as e:
        raise DatabaseError(f"Error fetching product: {str(e)}")


def get_products(
    db: Session, search_params: ProductSearchParams
) -> Tuple[List[ProductModel], int]:
    """
    Get products with filtering and traditional offset pagination.

    Args:
        db: Database session
        search_params: Search parameters

    Returns:
        Tuple of (list of products, total count)

    Raises:
        DatabaseError: If database operation fails
    """
    try:
        query = db.query(ProductModel).filter(not ProductModel.is_deleted)

        # Apply filters
        if search_params.search:
            search_term = f"%{search_params.search}%"
            query = query.filter(
                or_(
                    ProductModel.name.ilike(search_term),
                    ProductModel.description.ilike(search_term),
                )
            )

        if search_params.min_price is not None:
            query = query.filter(ProductModel.price >= search_params.min_price)

        if search_params.max_price is not None:
            query = query.filter(ProductModel.price <= search_params.max_price)

        if search_params.featured is not None:
            query = query.filter(ProductModel.is_featured ==
                                 search_params.featured)

        if search_params.show_on_storefront is not None:
            query = query.filter(
                ProductModel.show_on_storefront == search_params.show_on_storefront
            )

        # Get total count before pagination
        total = query.count()

        # Apply pagination
        query = query.offset(search_params.offset).limit(search_params.limit)

        # Execute query
        products = query.all()

        return products, total
    except Exception as e:
        raise DatabaseError(f"Error fetching products: {str(e)}")


def get_products_keyset(
    db: Session,
    search_params: ProductSearchParams,
    last_id: Optional[UUID] = None,
    last_updated: Optional[datetime] = None,
) -> Tuple[List[ProductModel], bool]:
    """
    Get products with filtering and efficient keyset pagination.
    This is more efficient for large datasets than offset pagination.

    Args:
        db: Database session
        search_params: Search parameters
        last_id: ID of the last product from previous page
        last_updated: Updated timestamp of the last product from previous page

    Returns:
        Tuple of (list of products, has_more flag)

    Raises:
        DatabaseError: If database operation fails
    """
    try:
        query = db.query(ProductModel).filter(not ProductModel.is_deleted)

        # Apply filters same as in get_products
        if search_params.search:
            search_term = f"%{search_params.search}%"
            query = query.filter(
                or_(
                    ProductModel.name.ilike(search_term),
                    ProductModel.description.ilike(search_term),
                )
            )

        if search_params.min_price is not None:
            query = query.filter(ProductModel.price >= search_params.min_price)

        if search_params.max_price is not None:
            query = query.filter(ProductModel.price <= search_params.max_price)

        if search_params.featured is not None:
            query = query.filter(ProductModel.is_featured ==
                                 search_params.featured)

        if search_params.show_on_storefront is not None:
            query = query.filter(
                ProductModel.show_on_storefront == search_params.show_on_storefront
            )

        # Apply keyset pagination (more efficient than offset for large datasets)
        if last_id and last_updated:
            query = query.filter(
                or_(
                    ProductModel.updated_at < last_updated,
                    and_(
                        ProductModel.updated_at == last_updated,
                        ProductModel.id < last_id,
                    ),
                )
            )

        # Order by updated_at and id for consistent keyset pagination
        query = query.order_by(
            desc(ProductModel.updated_at), desc(ProductModel.id))

        # Get one more item than requested to determine if there are more items
        limit_plus_one = search_params.limit + 1
        query = query.limit(limit_plus_one)

        # Execute query
        products = query.all()

        # Check if there are more items
        has_more = len(products) > search_params.limit

        # Return only the requested number of items
        return products[: search_params.limit], has_more

    except Exception as e:
        raise DatabaseError(
            f"Error fetching products with keyset pagination: {str(e)}")


async def update_product(
    db: AsyncSession, product_id: UUID, product_in: ProductUpdate, seller_id: UUID
) -> ProductModel:
    """
    Update a product with optimistic locking to prevent concurrent modifications.

    Args:
        db: Database session
        product_id: Product ID
        product_in: Product update data
        seller_id: ID of the seller performing the update

    Returns:
        Updated product

    Raises:
        ProductNotFoundError: If product not found
        ProductPermissionError: If seller is not the owner
        ProductValidationError: If update data is invalid
        ConcurrentModificationError: If product was modified concurrently
        DatabaseError: If database operation fails
    """
    try:
        product = await get_product(db, product_id)
        if not product:
            raise ProductNotFoundError(
                f"Product with ID {product_id} not found")

        # Permission check
        if str(product.seller_id).lower() != str(seller_id).lower():
            raise ProductPermissionError(
                "Not authorized to update this product.")

        current_version = product.version
        update_data = product_in.dict(exclude_unset=True)
        update_data["version"] = current_version + 1
        update_data["updated_at"] = datetime.now(timezone.utc)
        result = await db.execute(
            update(ProductModel)
            .where(
                and_(
                    ProductModel.id == product_id,
                    ProductModel.version == current_version,
                )
            )
            .values(**update_data)
        )
        await db.commit()
        if result.rowcount == 0:
            await db.rollback()
            raise ConcurrentModificationError(
                f"Product with ID {product_id} was modified concurrently"
            )
        await db.refresh(product)
        return product
    except (
        ProductNotFoundError,
        ProductPermissionError,
        ProductValidationError,
        ConcurrentModificationError,
    ):
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        raise DatabaseError(f"Error updating product: {str(e)}")


async def batch_update_products(
    db: AsyncSession,
    product_ids: List[UUID],
    update_data: Dict[str, Any],
    seller_id: UUID,
) -> int:
    """
    Batch update multiple products at once for better performance.

    Args:
        db: Database session
        product_ids: List of product IDs to update
        update_data: Dictionary of fields to update
        seller_id: ID of the seller performing the update

    Returns:
        Number of products updated

    Raises:
        ProductPermissionError: If seller is not the owner of all products
        DatabaseError: If database operation fails
    """
    try:
        # First, verify the seller has permission to update all products
        authorized_products = await db.execute(
            select(ProductModel.id).filter(
                ProductModel.id.in_(product_ids),
                ProductModel.seller_id == seller_id,
                not ProductModel.is_deleted,
            )
        )

        authorized_ids = [str(p.id) for p in authorized_products.scalars()]
        unauthorized_ids = [
            str(pid) for pid in product_ids if str(pid) not in authorized_ids
        ]

        if unauthorized_ids:
            raise ProductPermissionError(
                f"Not authorized to update these products: {', '.join(unauthorized_ids)}"
            )

        # Add updated_at timestamp
        update_data["updated_at"] = datetime.now(timezone.utc)

        # Perform batch update with version increment
        result = await db.execute(
            update(ProductModel)
            .where(
                and_(
                    ProductModel.id.in_(product_ids),
                    ProductModel.seller_id == seller_id,
                )
            )
            .values(**update_data)
            # Increment version for each product
            .values(version=ProductModel.version + 1)
        )

        await db.commit()
        return result.rowcount

    except ProductPermissionError:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        raise DatabaseError(f"Error batch updating products: {str(e)}")


async def delete_product(db: AsyncSession, product_id: UUID, seller_id: UUID) -> None:
    """
    Soft delete a product.

    Args:
        db: Database session
        product_id: Product ID
        seller_id: ID of the seller performing the delete

    Raises:
        ProductNotFoundError: If product not found
        ProductPermissionError: If seller is not the owner
        DatabaseError: If database operation fails
    """
    try:
        product = await get_product(db, product_id)
        if not product:
            raise ProductNotFoundError(
                f"Product with ID {product_id} not found")

        # Convert both to strings and compare to handle UUID vs string comparison properly
        product_seller_id = str(product.seller_id).lower()
        current_user_id = str(seller_id).lower()

        if product_seller_id != current_user_id:
            raise ProductPermissionError(
                f"Not authorized to delete this product. Owner: {product_seller_id}, Current user: {current_user_id}"
            )

        product.is_deleted = True
        product.updated_at = datetime.now(timezone.utc)
        await db.commit()
    except (ProductNotFoundError, ProductPermissionError):
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        raise DatabaseError(f"Error deleting product: {str(e)}")


async def restore_product(
    db: AsyncSession, product_id: UUID, seller_id: UUID
) -> ProductModel:
    """
    Restore a soft-deleted product.

    Args:
        db: Database session
        product_id: Product ID
        seller_id: ID of the seller performing the restore

    Returns:
        Restored product

    Raises:
        ProductNotFoundError: If product not found
        ProductPermissionError: If seller is not the owner
        DatabaseError: If database operation fails
    """
    try:
        product = await db.execute(
            select(ProductModel).filter(
                ProductModel.id == product_id, ProductModel.is_deleted
            )
        )

        product = product.scalars().first()

        if not product:
            raise ProductNotFoundError(
                f"Product with ID {product_id} not found")

        if product.seller_id != seller_id:
            raise ProductPermissionError(
                "Not authorized to restore this product")

        product.is_deleted = False
        product.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(product)
        return product
    except (ProductNotFoundError, ProductPermissionError):
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        raise DatabaseError(f"Error restoring product: {str(e)}")
