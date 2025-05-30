"""
ASGI entry point for uvicorn to properly import the app
"""

from app.main import app

# This file allows uvicorn to import the application using a simpler path:
# uvicorn asgi:app instead of uvicorn app.main:app
