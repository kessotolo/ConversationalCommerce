"""
Database-related fixtures for tests.
"""
from app.db.session import SessionLocal
from app.db.async_session import get_async_session_local
from sqlalchemy.ext.asyncio import AsyncSession
import asyncio
import logging
import os
import time
import uuid
from typing import Any, AsyncGenerator, Generator

import alembic.command
import alembic.config
import pytest
import pytest_asyncio
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import Session

# Setup logging
logger = logging.getLogger(__name__)

# Extract database URLs from environment
TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost/conversational_commerce_test"
)
TEST_DATABASE_URL_SYNC = os.environ.get(
    "TEST_DATABASE_URL_SYNC", "postgresql+psycopg2://postgres:postgres@localhost/conversational_commerce_test"
)

# Fallback URLs in case the configured ones fail
FORCED_ASYNC_URL = "postgresql+asyncpg://postgres:postgres@127.0.0.1/conversational_commerce_test"
FORCED_SYNC_URL = "postgresql+psycopg2://postgres:postgres@127.0.0.1/conversational_commerce_test"

# Validate that both URLs point to the same database


def _validate_database_urls():
    """Ensure both sync and async URLs point to the same database."""
    sync_db = TEST_DATABASE_URL_SYNC.split(
        '/')[-1] if '/' in TEST_DATABASE_URL_SYNC else "unknown"
    async_db = TEST_DATABASE_URL.split(
        '/')[-1] if '/' in TEST_DATABASE_URL else "unknown"

    if sync_db != async_db:
        logger.error(
            f"Database URL mismatch: sync={sync_db}, async={async_db}")
        raise ValueError(
            f"Sync and async database URLs must point to the same database: {sync_db} != {async_db}")

    logger.info(f"✓ Database URLs validated - using database: {sync_db}")


# Validate URLs before creating engines
_validate_database_urls()

# Create database engines with retry logic
try:
    logger.info("Attempting to create engines with configured URLs")
    logger.info(f"Sync URL: {TEST_DATABASE_URL_SYNC}")
    logger.info(f"Async URL: {TEST_DATABASE_URL}")

    # Enhanced engine configuration for improved stability
    sync_engine = create_engine(
        TEST_DATABASE_URL_SYNC,
        pool_size=5,
        max_overflow=10,
        pool_timeout=60,  # Increased from 30s to 60s
        pool_recycle=1800,
        # Remove statement timeout as it's causing schema operation failures
        # But keep idle_in_transaction to prevent connection leaks
        connect_args={
            "options": "-c idle_in_transaction_session_timeout=60000"
        },
    )
    logger.info("Sync engine created successfully")

    async_engine = create_async_engine(
        TEST_DATABASE_URL,
        pool_size=5,
        max_overflow=10,
        pool_timeout=120,  # Increased to 2 minutes
        pool_recycle=1800,
        # For asyncpg, we need to use command_timeout rather than options
        # Significantly increase command_timeout for test environment
        connect_args={
            "command_timeout": 180.0,  # 3 minutes to allow for slower test db operations
            "server_settings": {
                "idle_in_transaction_session_timeout": "60000",  # 60 seconds
                "statement_timeout": "0",  # Disable statement timeout for tests
            },
        },
    )
    logger.info("Async engine created successfully")
except Exception as e:
    logger.error(f"Error creating engines with configured URLs: {e}")
    logger.info("Falling back to hardcoded 127.0.0.1 URLs")
    sync_engine = create_engine(
        FORCED_SYNC_URL,
        pool_size=5,
        max_overflow=10,
        pool_timeout=60,
        pool_recycle=1800,
        connect_args={
            "options": "-c idle_in_transaction_session_timeout=60000"
        },
    )
    async_engine = create_async_engine(
        FORCED_ASYNC_URL,
        pool_size=5,
        max_overflow=10,
        pool_timeout=120,
        pool_recycle=1800,
        connect_args={
            "command_timeout": 180.0,  # 3 minutes to allow for slower test db operations
            "server_settings": {
                "idle_in_transaction_session_timeout": "60000",  # 60 seconds
                "statement_timeout": "0",  # Disable statement timeout for tests
            },
        },
    )
    logger.info("Fallback engines created successfully")

# Import session classes from the application - project has separate modules for sync/async

# Import session factories from the application


def _validate_schema_after_migrations():
    """Validate that key tables exist after migrations."""
    try:
        with sync_engine.connect() as conn:
            # Check that key tables exist
            inspector = inspect(conn)
            existing_tables = set(inspector.get_table_names())

            required_tables = {'tenants', 'users',
                               'products', 'admin_users', 'alembic_version'}
            missing_tables = required_tables - existing_tables

            if missing_tables:
                logger.error(
                    f"Missing required tables after migrations: {missing_tables}")
                logger.error(f"Existing tables: {sorted(existing_tables)}")
                raise RuntimeError(
                    f"Schema validation failed - missing tables: {missing_tables}")

            # Check alembic version
            result = conn.execute(
                text("SELECT version_num FROM alembic_version"))
            version = result.scalar()
            if not version:
                raise RuntimeError(
                    "alembic_version table has no version - migrations may not be applied")

            logger.info(
                f"✓ Schema validation passed - Alembic version: {version}")
            logger.info(f"✓ Found {len(existing_tables)} tables in database")

    except Exception as e:
        logger.error(f"Schema validation failed: {e}")
        raise


# --- NEW: Apply migrations ONCE per session ---
@pytest.fixture(scope="session", autouse=True)
def apply_migrations_once():
    import alembic.config
    logger.info("[TEST] Applying migrations ONCE for test session")

    # Set the DATABASE_URL environment variable to ensure Alembic uses the sync URL
    original_database_url = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = TEST_DATABASE_URL_SYNC

    try:
        alembic_cfg = alembic.config.Config(
            "/Users/kess/Projects/ConversationalCommerce/backend/alembic.ini")
        # Ensure we're using the sync URL
        alembic_cfg.set_main_option("sqlalchemy.url", TEST_DATABASE_URL_SYNC)
        alembic_cfg.set_main_option(
            "script_location", "/Users/kess/Projects/ConversationalCommerce/backend/alembic")
        from alembic import command
        command.upgrade(alembic_cfg, "head")
        logger.info("[TEST] Migrations applied for test session")

        # Validate schema after migrations
        _validate_schema_after_migrations()

    finally:
        # Restore original DATABASE_URL if it existed
        if original_database_url is not None:
            os.environ["DATABASE_URL"] = original_database_url
        else:
            os.environ.pop("DATABASE_URL", None)

# --- Per-test sync DB session (transaction rollback for isolation) ---


@pytest.fixture(scope="function")
def db_session(apply_migrations_once):
    """Provide a database session with transaction rollback for test isolation."""
    connection = sync_engine.connect()
    transaction = connection.begin()
    session = SessionLocal(bind=connection)

    # Log session creation for debugging
    logger.debug(f"[TEST] Created sync DB session {id(session)} for test")

    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()
        logger.debug(f"[TEST] Closed sync DB session {id(session)}")

# --- Per-test async DB session (transaction rollback for isolation) ---


@pytest_asyncio.fixture(scope="function")
async def async_db_session(apply_migrations_once):
    """Provide an async database session with transaction rollback for test isolation."""
    conn = await async_engine.connect()
    trans = await conn.begin()
    async_session_factory = get_async_session_local()
    session = async_session_factory(bind=conn, expire_on_commit=False)

    # Log session creation for debugging
    logger.debug(f"[TEST] Created async DB session {id(session)} for test")

    try:
        yield session
    finally:
        await session.close()
        await trans.rollback()
        await conn.close()
        logger.debug(f"[TEST] Closed async DB session {id(session)}")


# Connection leak checker fixture
@pytest.fixture(scope="session", autouse=True)
def check_leaked_connections():
    """Check for leaked database connections at the end of the test session."""
    # Run the tests
    yield

    # Check for leaked connections at the end of the test session
    try:
        from sqlalchemy import text
        with sync_engine.connect() as conn:
            result = conn.execute(text(
                "SELECT count(*) FROM pg_stat_activity WHERE application_name LIKE '%python%'"
            ))
            active_connections = result.scalar()
            if active_connections > 2:  # Allow for some overhead
                logger.warning(
                    f"Possible connection leak detected: {active_connections} connections still open")
                # Log details of connections to help diagnose the leak
                detailed_result = conn.execute(text(
                    """SELECT pid, application_name, client_addr, backend_start, state,
                       query_start, state_change, wait_event_type, wait_event
                       FROM pg_stat_activity WHERE application_name LIKE '%python%'"""
                ))
                for conn_info in detailed_result:
                    logger.warning(f"Leaked connection: {conn_info}")
    except Exception as e:
        logger.error(f"Error checking for leaked connections: {e}")

    # Attempt to terminate all leaked connections
    try:
        with sync_engine.connect() as conn:
            conn.execute(text(
                """SELECT pg_terminate_backend(pid) FROM pg_stat_activity
                   WHERE application_name LIKE '%python%' AND pid <> pg_backend_pid()"""
            ))
            logger.info("Attempted to terminate any leaked connections")
    except Exception as e:
        logger.error(f"Error terminating leaked connections: {e}")
