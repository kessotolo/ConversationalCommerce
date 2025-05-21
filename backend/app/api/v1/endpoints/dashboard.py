from fastapi import APIRouter, Depends
from app.core.security.dependencies import require_auth
from app.core.security.clerk import ClerkTokenData

router = APIRouter()


@router.get("/dashboard")
async def get_dashboard(user: ClerkTokenData = Depends(require_auth)):
    return {
        "message": "Welcome to your dashboard",
        "user_id": user.sub,
        "email": user.email
    }
