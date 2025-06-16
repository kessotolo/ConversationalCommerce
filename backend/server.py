"""
Universal entry point for all deployment platforms
This file provides a consistent entry point regardless of the hosting platform.
"""

import os
import sys

# Add the current directory to the path to ensure imports work correctly
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import the app from the main module

# This allows both direct uvicorn execution and import by WSGI/ASGI servers
if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=False)
