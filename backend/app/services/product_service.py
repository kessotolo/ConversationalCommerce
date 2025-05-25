from sqlalchemy.orm import Session
from app.models.product import Product as ProductModel
from app.schemas.product import ProductCreate, ProductUpdate
from uuid import UUID
from fastapi import HTTPException, status
from typing import List, Optional
from datetime import datetime


def create_product(db: Session, product_in: ProductCreate) -> ProductModel:
    product = ProductModel(**product_in.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def get_product(db: Session, product_id: UUID) -> Optional[ProductModel]:
    return db.query(ProductModel).filter(ProductModel.id == product_id, ProductModel.is_deleted == False).first()


def get_products(db: Session, skip: int = 0, limit: int = 10) -> List[ProductModel]:
    return db.query(ProductModel).filter(ProductModel.is_deleted == False).offset(skip).limit(limit).all()


def update_product(db: Session, product_id: UUID, product_in: ProductUpdate, seller_id: UUID) -> ProductModel:
    product = db.query(ProductModel).filter(
        ProductModel.id == product_id, ProductModel.is_deleted == False).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    if product.seller_id != seller_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Not authorized to update this product")
    for field, value in product_in.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    product.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(product)
    return product


def delete_product(db: Session, product_id: UUID, seller_id: UUID) -> None:
    product = db.query(ProductModel).filter(
        ProductModel.id == product_id, ProductModel.is_deleted == False).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    if product.seller_id != seller_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Not authorized to delete this product")
    product.is_deleted = True
    product.updated_at = datetime.utcnow()
    db.commit()
