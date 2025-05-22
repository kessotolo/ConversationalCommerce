from fastapi import APIRouter, UploadFile, Form, Depends, HTTPException
from typing import Optional
from app.core.cloudinary import CloudinaryClient
from app.core.security.dependencies import require_auth
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductResponse

router = APIRouter()


@router.post("/products", response_model=ProductResponse)
async def create_product(
    name: str = Form(...),
    description: str = Form(...),
    price: float = Form(...),
    image: Optional[UploadFile] = None,
    user=Depends(require_auth)
):
    try:
        # Upload image to Cloudinary if provided
        image_url = None
        if image:
            image_url = await CloudinaryClient.upload_file(
                file=image,
                folder="products"
            )

        # Create product data
        product_data = ProductCreate(
            name=name,
            description=description,
            price=price,
            image_url=image_url,
            seller_id=user.id
        )

        # Save to database (implement this based on your database setup)
        # product = await Product.create(**product_data.dict())

        return {
            "id": "temp_id",  # Replace with actual product ID
            "name": product_data.name,
            "description": product_data.description,
            "price": product_data.price,
            "image_url": product_data.image_url,
            "seller_id": product_data.seller_id
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error creating product: {str(e)}"
        )
