"""
Minimal test script to identify hanging issues in pytest
"""
import asyncio
import logging
import os
import sys
import time
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent.parent.absolute()
sys.path.insert(0, str(backend_dir))

# Set environment variables
os.environ['TESTING'] = 'true'
os.environ['PYTHONUNBUFFERED'] = '1'
os.environ['HF_HUB_OFFLINE'] = '1'
os.environ['TRANSFORMERS_OFFLINE'] = '1'

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stdout
)
logger = logging.getLogger(__name__)

# Import required modules with careful sequencing to identify issues
def log_step(step_name):
    """Log a step with clear separators"""
    logger.info(f"{'='*20} STEP: {step_name} {'='*20}")

async def main():
    """Main testing function"""
    log_step("Starting minimal debug test")
    
    # Step 1: Import basic modules
    log_step("Importing SQLAlchemy")
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
    from sqlalchemy import text
    logger.info("SQLAlchemy imported successfully")
    
    # Step 2: Import database session
    log_step("Importing DB session")
    from app.db.session import get_async_session_local
    logger.info("DB session imported successfully")
    
    # Step 3: Create engine and session
    log_step("Creating test database connection")
    TEST_DATABASE_URL = "postgresql+asyncpg://postgres:postgres@127.0.0.1/conversational_commerce_test"
    
    # Create engine with debug flags
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=True,  # SQL debug output
        pool_size=5,
        max_overflow=10
    )
    logger.info("Engine created successfully")
    
    # Create session maker
    async_session_local = async_sessionmaker(
        engine, 
        class_=AsyncSession,
        expire_on_commit=False
    )
    logger.info("Session maker created successfully")
    
    # Step 4: Create and use session
    log_step("Testing database session")
    async with async_session_local() as session:
        logger.info("Session created")
        
        # Try a simple query
        result = await session.execute(text("SELECT 1"))
        logger.info(f"Query result: {result.scalar()}")
        
        # Commit changes
        await session.commit()
        logger.info("Changes committed")
    
    logger.info("Session closed automatically by context manager")
    
    # Step 5: Import content analysis (potential hang point)
    log_step("Importing content analysis")
    try:
        logger.info("About to import content analysis service...")
        from app.core.content.content_analysis import content_analysis_service
        logger.info("Content analysis service imported successfully")
    except Exception as e:
        logger.error(f"Failed to import content analysis: {e}")
    
    # Step 6: Import test client and create app
    log_step("Importing FastAPI test client")
    try:
        from fastapi.testclient import TestClient
        from app.main import app
        logger.info("FastAPI components imported successfully")
        
        # Create test client
        client = TestClient(app)
        logger.info(f"Test client created: {client}")
    except Exception as e:
        logger.error(f"Failed to create test client: {e}")
    
    # Step 7: Check client behavior
    log_step("Testing client operation")
    try:
        # Make a simple request
        response = client.get("/api/v1/health")
        logger.info(f"Health check response: {response.status_code}")
    except Exception as e:
        logger.error(f"Failed to make test request: {e}")
        
    # Step 8: Test complete
    log_step("Test completed successfully")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as e:
        logger.error(f"Test failed with error: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
