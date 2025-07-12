"""
ASGI entry point for uvicorn to properly import the app
"""

# This file allows uvicorn to import the application using a simpler path:
# uvicorn asgi:app instead of uvicorn app.main:app

from backend.app.main import app

# Make app available for ASGI servers
application = app
