from fastapi import APIRouter, Depends, HTTPException, UploadFile, Form, Query
from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc, asc
from app.core.cloudinary import CloudinaryClient
from app.core.security.dependencies import require_auth
from app.db.session import get_db
from app.models.product import Product
from app.schemas.product import (
    ProductCreate,
    ProductUpdate,
    ProductResponse,
    ProductSearchParams
)

router = APIRouter()


@router.post("/products", response_model=ProductResponse)
async def create_product(
    name: str = Form(...),
    description: str = Form(...),
    price: float = Form(...),
    image: Optional[UploadFile] = None,
    video: Optional[UploadFile] = None,
    whatsapp_status: Optional[UploadFile] = None,
    instagram_story: Optional[UploadFile] = None,
    is_featured: bool = Form(False),
    db: Session = Depends(get_db),
    user=Depends(require_auth)
):
    try:
        # Upload image to Cloudinary if provided
        image_url = None
        if image:
            image_url = await CloudinaryClient.upload_file(
                file=image,
                folder="products/images"
            )

        # Upload video to Cloudinary if provided
        video_url = None
        if video:
            video_url = await CloudinaryClient.upload_file(
                file=video,
                folder="products/videos",
                resource_type="video"
            )

        # Upload WhatsApp status video if provided
        whatsapp_status_url = None
        if whatsapp_status:
            whatsapp_status_url = await CloudinaryClient.upload_file(
                file=whatsapp_status,
                folder="products/whatsapp",
                resource_type="video",
                transformation={
                    "width": 1080,
                    "height": 1920,
                    "crop": "fill"
                }
            )

        # Upload Instagram story video if provided
        instagram_story_url = None
        if instagram_story:
            instagram_story_url = await CloudinaryClient.upload_file(
                file=instagram_story,
                folder="products/instagram",
                resource_type="video",
                transformation={
                    "width": 1080,
                    "height": 1920,
                    "crop": "fill"
                }
            )

        # Create product
        product = Product(
            name=name,
            description=description,
            price=price,
            image_url=str(image_url) if image_url else None,
            video_url=str(video_url) if video_url else None,
            whatsapp_status_url=str(
                whatsapp_status_url) if whatsapp_status_url else None,
            instagram_story_url=str(
                instagram_story_url) if instagram_story_url else None,
            is_featured=is_featured,
            seller_id=user.id
        )
        db.add(product)
        db.commit()
        db.refresh(product)
        return product

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error creating product: {str(e)}"
        )


@router.get("/products", response_model=List[ProductResponse])
async def list_products(
    search_params: ProductSearchParams = Depends(),
    db: Session = Depends(get_db),
    user=Depends(require_auth)
):
    try:
        query = db.query(Product)

        # Apply search filters
        if search_params.query:
            search_term = f"%{search_params.query}%"
            query = query.filter(
                or_(
                    Product.name.ilike(search_term),
                    Product.description.ilike(search_term)
                )
            )

        # Apply price filters
        if search_params.min_price is not None:
            query = query.filter(Product.price >= search_params.min_price)
        if search_params.max_price is not None:
            query = query.filter(Product.price <= search_params.max_price)

        # Apply seller filter
        if search_params.seller_id:
            query = query.filter(Product.seller_id == search_params.seller_id)

        # Apply video filter
        if search_params.has_video is not None:
            if search_params.has_video:
                query = query.filter(Product.video_url.isnot(None))
            else:
                query = query.filter(Product.video_url.is_(None))

        # Apply featured filter
        if search_params.is_featured is not None:
            query = query.filter(Product.is_featured ==
                                 search_params.is_featured)

        # Apply sorting
        if search_params.sort_by:
            sort_column = getattr(Product, search_params.sort_by)
            if search_params.sort_order == "desc":
                query = query.order_by(desc(sort_column))
            else:
                query = query.order_by(asc(sort_column))
        else:
            # Default sorting by created_at desc
            query = query.order_by(desc(Product.created_at))

        # Apply pagination
        skip = (search_params.page - 1) * search_params.limit
        query = query.offset(skip).limit(search_params.limit)

        products = query.all()
        return products

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching products: {str(e)}"
        )


@router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: UUID,
    db: Session = Depends(get_db),
    user=Depends(require_auth)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )
    return product


@router.put("/products/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: UUID,
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    price: Optional[float] = Form(None),
    image: Optional[UploadFile] = None,
    video: Optional[UploadFile] = None,
    whatsapp_status: Optional[UploadFile] = None,
    instagram_story: Optional[UploadFile] = None,
    is_featured: Optional[bool] = Form(None),
    db: Session = Depends(get_db),
    user=Depends(require_auth)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    if product.seller_id != user.id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to update this product"
        )

    try:
        # Update fields if provided
        if name is not None:
            product.name = name
        if description is not None:
            product.description = description
        if price is not None:
            product.price = price
        if is_featured is not None:
            product.is_featured = is_featured

        # Handle image upload if provided
        if image:
            # Delete old image if exists
            if product.image_url:
                await CloudinaryClient.delete_file(product.image_url)

            # Upload new image
            image_url = await CloudinaryClient.upload_file(
                file=image,
                folder="products/images"
            )
            product.image_url = str(image_url)

        # Handle video upload if provided
        if video:
            # Delete old video if exists
            if product.video_url:
                await CloudinaryClient.delete_file(product.video_url)

            # Upload new video
            video_url = await CloudinaryClient.upload_file(
                file=video,
                folder="products/videos",
                resource_type="video"
            )
            product.video_url = str(video_url)

        # Handle WhatsApp status upload if provided
        if whatsapp_status:
            # Delete old status if exists
            if product.whatsapp_status_url:
                await CloudinaryClient.delete_file(product.whatsapp_status_url)

            # Upload new status
            whatsapp_status_url = await CloudinaryClient.upload_file(
                file=whatsapp_status,
                folder="products/whatsapp",
                resource_type="video",
                transformation={
                    "width": 1080,
                    "height": 1920,
                    "crop": "fill"
                }
            )
            product.whatsapp_status_url = str(whatsapp_status_url)

        # Handle Instagram story upload if provided
        if instagram_story:
            # Delete old story if exists
            if product.instagram_story_url:
                await CloudinaryClient.delete_file(product.instagram_story_url)

            # Upload new story
            instagram_story_url = await CloudinaryClient.upload_file(
                file=instagram_story,
                folder="products/instagram",
                resource_type="video",
                transformation={
                    "width": 1080,
                    "height": 1920,
                    "crop": "fill"
                }
            )
            product.instagram_story_url = str(instagram_story_url)

        db.commit()
        db.refresh(product)
        return product

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error updating product: {str(e)}"
        )


@router.delete("/products/{product_id}", response_model=ProductResponse)
async def delete_product(
    product_id: UUID,
    db: Session = Depends(get_db),
    user=Depends(require_auth)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    if product.seller_id != user.id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to delete this product"
        )

    try:
        # Delete all media files from Cloudinary
        if product.image_url:
            await CloudinaryClient.delete_file(product.image_url)
        if product.video_url:
            await CloudinaryClient.delete_file(product.video_url)
        if product.whatsapp_status_url:
            await CloudinaryClient.delete_file(product.whatsapp_status_url)
        if product.instagram_story_url:
            await CloudinaryClient.delete_file(product.instagram_story_url)

        db.delete(product)
        db.commit()
        return product

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting product: {str(e)}"
        )
