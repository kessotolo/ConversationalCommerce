from fastapi import APIRouter, Depends
from app.core.security.dependencies import require_auth
from app.core.security.clerk import ClerkTokenData
from pydantic import BaseModel
from typing import List
from datetime import datetime

router = APIRouter()


class Order(BaseModel):
    product_id: str
    quantity: int
    total_price: float
    created_at: datetime = datetime.now()


@router.get("/orders")
async def get_orders(user: ClerkTokenData = Depends(require_auth)):
    # Here you would typically fetch orders from your database
    return {
        "message": "Orders retrieved successfully",
        "orders": []  # Replace with actual orders from database
    }
