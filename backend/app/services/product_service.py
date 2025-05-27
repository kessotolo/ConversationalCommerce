from sqlalchemy.orm import Session
from app.models.product import Product as ProductModel
from app.schemas.product import ProductCreate, ProductUpdate, ProductSearchParams
from uuid import UUID
from fastapi import HTTPException, status, Request
from typing import List, Optional, Tuple, Dict, Any
from datetime import datetime, timezone
from sqlalchemy import or_, desc, asc, and_, update, func
from decimal import Decimal
from app.core.exceptions import (
    ProductNotFoundError,
    ProductPermissionError,
    ProductValidationError,
    DatabaseError
)
from app.db.session import get_tenant_id_from_request

# Add a new exception for optimistic locking conflicts
class ConcurrentModificationError(Exception):
    """Raised when a concurrent modification is detected via optimistic locking"""
    pass


def create_product(db: Session, product_in: ProductCreate, request: Request = None) -> ProductModel:
    """
    Create a new product.

    Args:
        db: Database session
        product_in: Product creation data
        request: FastAPI request object for tenant context

    Returns:
        Created product

    Raises:
        ProductValidationError: If product data is invalid
        DatabaseError: If database operation fails
    """
    try:
        # Convert Pydantic model to dict and convert HttpUrl to str
        product_data = product_in.model_dump()
        
        # Convert HttpUrl types to strings for SQLAlchemy
        for field in ['image_url', 'video_url', 'whatsapp_status_url', 'instagram_story_url', 'storefront_url']:
            if field in product_data and product_data[field] is not None:
                product_data[field] = str(product_data[field])
        
        # Ensure tenant_id is set from request context
        if request and not product_data.get('tenant_id'):
            tenant_id = get_tenant_id_from_request(request)
            if tenant_id:
                product_data['tenant_id'] = tenant_id
        
        # Create the product model
        product = ProductModel(**product_data)
        db.add(product)
        db.commit()
        db.refresh(product)
        return product
    except Exception as e:
        db.rollback()
        if isinstance(e, ProductValidationError):
            raise
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
        return db.query(ProductModel).filter(
            ProductModel.id == product_id,
            ProductModel.is_deleted == False
        ).first()
    except Exception as e:
        raise DatabaseError(f"Error fetching product: {str(e)}")


def get_products(
    db: Session,
    search_params: ProductSearchParams
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
        query = db.query(ProductModel).filter(ProductModel.is_deleted == False)

        # Apply filters
        if search_params.search:
            search_term = f"%{search_params.search}%"
            query = query.filter(
                or_(
                    ProductModel.name.ilike(search_term),
                    ProductModel.description.ilike(search_term)
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
    last_updated: Optional[datetime] = None
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
        query = db.query(ProductModel).filter(ProductModel.is_deleted == False)
        
        # Apply filters same as in get_products
        if search_params.search:
            search_term = f"%{search_params.search}%"
            query = query.filter(
                or_(
                    ProductModel.name.ilike(search_term),
                    ProductModel.description.ilike(search_term)
                )
            )

        if search_params.min_price is not None:
            query = query.filter(ProductModel.price >= search_params.min_price)

        if search_params.max_price is not None:
            query = query.filter(ProductModel.price <= search_params.max_price)

        if search_params.featured is not None:
            query = query.filter(ProductModel.is_featured == search_params.featured)

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
                        ProductModel.id < last_id
                    )
                )
            )
        
        # Order by updated_at and id for consistent keyset pagination
        query = query.order_by(desc(ProductModel.updated_at), desc(ProductModel.id))
        
        # Get one more item than requested to determine if there are more items
        limit_plus_one = search_params.limit + 1
        query = query.limit(limit_plus_one)
        
        # Execute query
        products = query.all()
        
        # Check if there are more items
        has_more = len(products) > search_params.limit
        
        # Return only the requested number of items
        return products[:search_params.limit], has_more
        
    except Exception as e:
        raise DatabaseError(f"Error fetching products with keyset pagination: {str(e)}")


def update_product(
    db: Session,
    product_id: UUID,
    product_in: ProductUpdate,
    seller_id: UUID
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
        product = get_product(db, product_id)
        if not product:
            raise ProductNotFoundError(
                f"Product with ID {product_id} not found")

        # Convert both to strings and compare to handle UUID vs string comparison properly
        product_seller_id = str(product.seller_id).lower()
        current_user_id = str(seller_id).lower()
        
        if product_seller_id != current_user_id:
            raise ProductPermissionError(
                f"Not authorized to update this product. Owner: {product_seller_id}, Current user: {current_user_id}")

        # Store the current version for optimistic locking
        current_version = product.version
        
        # Update only provided fields
        update_data = product_in.model_dump(exclude_unset=True)
        
        # Add version increment and update timestamp
        update_data["version"] = current_version + 1
        update_data["updated_at"] = datetime.now(timezone.utc)
        
        # Execute update with version check to prevent concurrent modifications
        result = db.execute(
            update(ProductModel)
            .where(
                and_(
                    ProductModel.id == product_id,
                    ProductModel.version == current_version
                )
            )
            .values(**update_data)
        )
        
        db.commit()
        
        # If no rows were updated, it means someone else modified the product
        if result.rowcount == 0:
            db.rollback()
            raise ConcurrentModificationError(f"Product with ID {product_id} was modified concurrently")
            
        # Refresh the product to get the updated version
        db.refresh(product)
        return product
        
    except (ProductNotFoundError, ProductPermissionError, ProductValidationError, ConcurrentModificationError):
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise DatabaseError(f"Error updating product: {str(e)}")


def batch_update_products(
    db: Session,
    product_ids: List[UUID],
    update_data: Dict[str, Any],
    seller_id: UUID
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
        authorized_products = db.query(ProductModel.id).filter(
            ProductModel.id.in_(product_ids),
            ProductModel.seller_id == seller_id,
            ProductModel.is_deleted == False
        ).all()
        
        authorized_ids = [str(p.id) for p in authorized_products]
        unauthorized_ids = [str(pid) for pid in product_ids if str(pid) not in authorized_ids]
        
        if unauthorized_ids:
            raise ProductPermissionError(
                f"Not authorized to update these products: {', '.join(unauthorized_ids)}"
            )
            
        # Add updated_at timestamp
        update_data["updated_at"] = datetime.now(timezone.utc)
        
        # Perform batch update with version increment
        result = db.execute(
            update(ProductModel)
            .where(
                and_(
                    ProductModel.id.in_(product_ids),
                    ProductModel.seller_id == seller_id
                )
            )
            .values(**update_data)
            # Increment version for each product
            .values(version=ProductModel.version + 1)
        )
        
        db.commit()
        return result.rowcount
        
    except ProductPermissionError:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise DatabaseError(f"Error batch updating products: {str(e)}")


def delete_product(db: Session, product_id: UUID, seller_id: UUID) -> None:
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
        product = get_product(db, product_id)
        if not product:
            raise ProductNotFoundError(
                f"Product with ID {product_id} not found")

        # Convert both to strings and compare to handle UUID vs string comparison properly
        product_seller_id = str(product.seller_id).lower()
        current_user_id = str(seller_id).lower()
        
        if product_seller_id != current_user_id:
            raise ProductPermissionError(
                f"Not authorized to delete this product. Owner: {product_seller_id}, Current user: {current_user_id}")

        product.is_deleted = True
        product.updated_at = datetime.now(timezone.utc)
        db.commit()
    except (ProductNotFoundError, ProductPermissionError):
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise DatabaseError(f"Error deleting product: {str(e)}")


def restore_product(db: Session, product_id: UUID, seller_id: UUID) -> ProductModel:
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
        product = db.query(ProductModel).filter(
            ProductModel.id == product_id,
            ProductModel.is_deleted == True
        ).first()

        if not product:
            raise ProductNotFoundError(
                f"Product with ID {product_id} not found")

        if product.seller_id != seller_id:
            raise ProductPermissionError(
                "Not authorized to restore this product")

        product.is_deleted = False
        product.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(product)
        return product
    except (ProductNotFoundError, ProductPermissionError):
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise DatabaseError(f"Error restoring product: {str(e)}")
