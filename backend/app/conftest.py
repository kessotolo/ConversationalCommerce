import os
try:
    from dotenv import load_dotenv
    # Only load if not already loaded
    if not os.environ.get('CLERK_SECRET_KEY'):
        load_dotenv(dotenv_path=os.path.join(
            os.path.dirname(os.path.dirname(__file__)), '.env'))
except ImportError:
    pass

import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest_asyncio.fixture(scope="function")
async def async_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac
