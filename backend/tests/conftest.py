"""
Main conftest.py for pytest setup.
This file imports fixtures from modular fixture files to maintain a clean structure
with each file under 500 lines per coding standards.
"""
from tests.fixtures.api import async_client, client, auth_headers, admin_auth_headers, super_admin_auth_headers
from tests.fixtures.mocks import patch_content_analysis
from tests.fixtures.environment import test_tenant, test_user, test_admin_user
from tests.fixtures.db import apply_migrations_once, async_db_session, db_session
import logging
import os
import sys
import uuid
import pytest
import asyncio
from typing import AsyncGenerator, Generator
from unittest import mock

# Set testing environment variable before importing any app modules
# This ensures all database connections use the test database
os.environ["TESTING"] = "true"


# Configure test logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Make sure tests directory is in path
sys.path.insert(0, os.path.abspath(
    os.path.join(os.path.dirname(__file__), '..')))

# Import fixtures from modular files for better organization
# Database fixtures

# Environment and test data fixtures

# Mocking fixtures

# API testing fixtures

# Test user ID used in authentication and user-related tests
TEST_USER_ID = "00000000-0000-0000-0000-000000000001"

# Expose async_client fixture globally
pytest.async_client = async_client

# Print a message when conftest is loaded to confirm imports
logger.info("=== Pytest configuration loaded with modular fixtures ===")


@pytest.fixture(scope="session", autouse=True)
def ensure_migrations_applied_first():
    """
    Ensure migrations are applied before any other session-scoped fixtures run.
    This fixture has autouse=True and session scope to run first.
    """
    logger.info("=== Ensuring migrations are applied before any tests ===")
    # The apply_migrations_once fixture will be called automatically
    # due to its autouse=True and session scope
    yield
    logger.info("=== Test session completed ===")


@pytest.fixture(scope="function", autouse=True)
def ensure_test_environment_ready(apply_migrations_once):
    """
    Ensure the test environment is ready before each test.
    This runs after migrations are applied but before each test.
    """
    logger.debug("=== Test environment ready ===")
    yield
    logger.debug("=== Test completed ===")


@pytest.fixture(scope="session")
async def setup_test_ip_allowlist():
    """Set up global IP allowlist entries for test IPs."""
    import logging
    logger = logging.getLogger(__name__)
    logger.info("DEBUG: Setting up test IP allowlist entries...")

    from backend.app.services.security.ip_allowlist_service import IPAllowlistService
    from backend.app.db.deps import get_async_session_local

    # Get a database session
    AsyncSessionLocal = get_async_session_local()
    async with AsyncSessionLocal() as db:
        ip_allowlist_service = IPAllowlistService()

        # Add test IPs to global allowlist
        test_ips = ["127.0.0.1", "::1", "testclient", "testserver"]

        for ip in test_ips:
            try:
                logger.info(f"DEBUG: Adding test IP to allowlist: {ip}")
                await ip_allowlist_service.add_allowlist_entry(
                    db=db,
                    ip_range=f"{ip}/32",  # Single IP
                    description=f"Test IP allowlist for {ip}",
                    is_global=True,
                    created_by=uuid.uuid4()  # Use a test admin user ID
                )
                logger.info(f"DEBUG: Successfully added {ip} to allowlist")
            except Exception as e:
                # Ignore if entry already exists
                logger.info(f"DEBUG: Failed to add {ip} to allowlist: {e}")
                pass

        await db.commit()
        logger.info("DEBUG: Test IP allowlist setup complete")

    yield

    # Cleanup is not needed as test database is recreated for each session
