"""
Database-related fixtures for tests.
"""
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
from sqlalchemy import create_engine, text
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
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

# Import session factories from the application
from app.db.async_session import get_async_session_local
from app.db.session import SessionLocal


@pytest.fixture(scope="function")
def db_engine():
    """
    Create a new database engine for each test.
    This fixture prepares the database by dropping and recreating schemas,
    then applying Alembic migrations to ensure all tables exist.
    """
    logger.info("[DEBUG] Entering db_engine fixture")
    
    # Clean database at start of test session
    with sync_engine.connect() as conn:
        try:
            conn.execute(text("DROP SCHEMA public CASCADE"))
            conn.execute(text("CREATE SCHEMA public"))
            conn.commit()
        except Exception as e:
            logger.warning(f"Error resetting database: {e}")
    
    # Apply migrations to create schema
    try:
        logger.info("Applying database migrations for test environment")
        alembic_cfg = alembic.config.Config("/Users/kess/Projects/ConversationalCommerce/backend/alembic.ini")
        # Override the sqlalchemy.url in the config to use our test database
        alembic_cfg.set_main_option("sqlalchemy.url", TEST_DATABASE_URL_SYNC)
        # Fix the script location to point to the correct directory
        alembic_cfg.set_main_option("script_location", "/Users/kess/Projects/ConversationalCommerce/backend/alembic")
        # Run the migrations
        alembic.command.upgrade(alembic_cfg, "head")
        logger.info("Migrations applied successfully")
        
        # Verify tables were created - this helps ensure schema changes are fully committed
        with sync_engine.connect() as conn:
            result = conn.execute(text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenants');"))
            tenant_exists = result.scalar()
            logger.info(f"Tenant table exists in database: {tenant_exists}")
            
            if not tenant_exists:
                logger.error("Tenant table not found after migrations! This will cause test failures.")
                
            # Ensure all transactions are committed so async connections can see the tables
            conn.commit()
    except Exception as e:
        logger.error(f"Error applying migrations: {e}")
        # Don't fail the test setup if migrations fail - continue and let the test
        # fail naturally if the database isn't set up correctly
    
    yield sync_engine
    
    # Database is cleaned up at the start of the next test

@pytest_asyncio.fixture(scope="function")
async def async_db_engine():
    """
    Create a new async database engine for each test.
    Mostly just a wrapper around the global async_engine.
    """
    logger.info("[DEBUG] Entering async_db_engine fixture")
    yield async_engine
    # Tables are dropped by the sync fixture


@pytest.fixture(scope="function")
def db_session(db_engine):
    """Create a sync session for each test, automatically
    rolling back changes to maintain test isolation."""
    logger.info("[DEBUG] Entering db_session fixture")
    
    # Variables to hold resources that need cleanup
    connection = None
    transaction = None
    session = None
    session_id = str(uuid.uuid4())[:8]
    
    try:
        connection = db_engine.connect()
        transaction = connection.begin()
        session = SessionLocal(bind=connection)
        logger.info(f"[DEBUG] Created sync session {session_id}")
        
        yield session
        
    except Exception as e:
        logger.error(f"[ERROR] Exception in db_session: {e}")
        raise
        
    finally:
        # Always clean up resources in finally block to ensure they run
        logger.info(f"[DEBUG] Cleaning up db_session {session_id}")
        
        # Clean up session
        if session:
            try:
                session.close()
                logger.info(f"[DEBUG] Session {session_id} closed successfully")
            except Exception as e:
                logger.warning(f"[WARNING] Error closing session: {e}")
        
        # Roll back transaction
        if transaction:
            try:
                transaction.rollback()
                logger.info(f"[DEBUG] Transaction rolled back successfully")
            except Exception as e:
                logger.warning(f"[WARNING] Error rolling back transaction: {e}")
        
        # Close connection
        if connection:
            try:
                connection.close()
                logger.info(f"[DEBUG] Connection closed successfully")
            except Exception as e:
                logger.warning(f"[WARNING] Error closing connection: {e}")
                
        logger.info("[DEBUG] Exiting db_session successfully")


@pytest_asyncio.fixture(scope="function")
async def async_db_session():
    """Create an async session for each test, automatically
    rolling back changes to maintain test isolation."""
    logger.info("[DEBUG] Entering async_db_session fixture (attempt 1/3)")
    
    # Retry logic with exponential backoff
    retries = 3
    attempt = 1
    backoff_time = 1
    
    # Variables to hold resources that need cleanup
    conn = None
    trans = None
    session = None
    session_id = str(uuid.uuid4())[:8]
    
    while attempt <= retries:
        try:
            # Ensure any previous resources are properly cleaned up
            if session:
                try:
                    await session.close()
                except Exception as e:
                    logger.warning(f"[WARNING] Error closing previous session: {e}")
                    
            if trans:
                try:
                    await trans.rollback()
                except Exception as e:
                    logger.warning(f"[WARNING] Error rolling back previous transaction: {e}")
                    
            if conn:
                try:
                    await conn.close()
                except Exception as e:
                    logger.warning(f"[WARNING] Error closing previous connection: {e}")
            
            # Start a clean connection transaction
            logger.info(f"[DEBUG] Connecting to database (attempt {attempt}/{retries})")
            conn = await async_engine.connect()
            trans = await conn.begin()
            
            # Create a fresh session using the application's session factory
            async_session_factory = get_async_session_local()
            session = async_session_factory(bind=conn, expire_on_commit=False)
            
            logger.info(f"[DEBUG] Created async session {session_id}")
            logger.info("[DEBUG] Yielding async_db_session")
            yield session
            
            # Always roll back to ensure test isolation
            logger.info(f"[DEBUG] Rolling back async session {session_id}")
            
            # Handle resource cleanup carefully with individual try/except blocks
            try:
                await session.close()
                logger.info(f"[DEBUG] Session {session_id} closed successfully")
            except Exception as e:
                logger.warning(f"[WARNING] Error closing session: {e}")
                
            try:
                await trans.rollback()
                logger.info(f"[DEBUG] Transaction rolled back successfully")
            except Exception as e:
                logger.warning(f"[WARNING] Error rolling back transaction: {e}")
                
            try:
                await conn.close()
                logger.info(f"[DEBUG] Connection closed successfully")
            except Exception as e:
                logger.warning(f"[WARNING] Error closing connection: {e}")
            
                
            # If we get here, everything worked
            logger.info("[DEBUG] Exiting async_db_session successfully")
            break
            
        except Exception as e:
            # On failure, increment attempt counter
            attempt += 1
            logger.error(f"[ERROR] async_db_session error (attempt {attempt-1}/{retries}): {str(e)}")
            
            if attempt <= retries:
                logger.info(f"[DEBUG] Retrying in {backoff_time} seconds")
                time.sleep(backoff_time)
                backoff_time *= 2  # Exponential backoff
            else:
                logger.error(f"[ERROR] Failed after {retries} attempts: {str(e)}")
                raise


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
                logger.warning(f"Possible connection leak detected: {active_connections} connections still open")
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
