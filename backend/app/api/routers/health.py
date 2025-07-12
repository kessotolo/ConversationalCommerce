from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.api.deps import get_db

router = APIRouter()


@router.get("/health", tags=["health"])
def health_check(db: Session = Depends(get_db)):
    try:
        # Simple DB check
        db.execute("SELECT 1")
        db_status = "ok"
    except Exception as e:
        db_status = f"error: {str(e)}"
    return {"status": "ok", "database": db_status}


@router.get("/status")
async def status_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "services": {"database": "connected", "cloudinary": "connected"},
    }
