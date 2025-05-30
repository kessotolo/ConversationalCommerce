"""
WSGI/ASGI compatibility module for all deployment platforms
"""

# Import the app directly from main module
from app.main import app as application

# Make app available for different WSGI servers
app = application
