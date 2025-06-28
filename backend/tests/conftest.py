"""
Main conftest.py for pytest setup.
This file imports fixtures from modular fixture files to maintain a clean structure
with each file under 500 lines per coding standards.
"""
import logging
import os
import sys

# Set testing environment variable before importing any app modules
# This ensures all database connections use the test database
os.environ["TESTING"] = "true"

import pytest

# Configure test logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Make sure tests directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import fixtures from modular files for better organization
# Database fixtures
from tests.fixtures.db import (
    async_db_engine,
    async_db_session,
    check_leaked_connections,
    db_engine, 
    db_session,
)

# Environment and test data fixtures
from tests.fixtures.environment import (
    debug_test_environment,
    set_test_environment,
    test_tenant,
    test_user,
    test_admin_user,
)

# Mocking fixtures
from tests.fixtures.mocks import (
    mock_payment_client,
    mock_s3_client,
    mock_sms_client,
    patch_content_analysis,
)

# API testing fixtures
from tests.fixtures.api import (
    admin_auth_headers,
    auth_headers,
    client,
    create_test_token,
    test_idempotency_key,
    webhook_auth_headers,
)

# Print a message when conftest is loaded to confirm imports
logger.info("=== Pytest configuration loaded with modular fixtures ===")
