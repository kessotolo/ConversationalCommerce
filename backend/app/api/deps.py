"""
Dependencies for API endpoints.
"""
from fastapi import Depends, Request, HTTPException
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.core.security.dependencies import require_auth
from app.core.security.clerk import ClerkTokenData


def get_db():
    """
    Get database session.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(request: Request = None) -> ClerkTokenData:
    """
    Get the current authenticated user.
    Wrapper around require_auth for backward compatibility.
    """
    return require_auth(request)
