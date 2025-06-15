"""
Debug script to identify pytest hanging issue
"""
import asyncio
import logging
import os
import time
import sys
import traceback
from pathlib import Path

# Add the parent directory to Python path
backend_dir = Path(__file__).parent.parent.absolute()
sys.path.insert(0, str(backend_dir))

# Set testing mode
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

async def main():
    """Main debug function"""
    # Print startup info
    logger.info("Starting debug hang test")
    logger.info(f"Python version: {sys.version}")
    logger.info(f"Event loop: {asyncio.get_running_loop()}")

    # Step 1: Import database session to test DB connection
    logger.info("Step 1: Importing DB session...")
    from app.db.session import get_async_session_local
    logger.info("DB session imported successfully")

    # Step 2: Import content_analysis to check if it tries to download models
    logger.info("Step 2: Importing content analysis service...")
    try:
        from app.core.content.content_analysis import content_analysis_service
        logger.info("Content analysis service imported successfully")
    except Exception as e:
        logger.error(f"Failed to import content_analysis_service: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")

    # Step 3: Import test fixtures
    logger.info("Step 3: Importing test fixtures...")
    try:
        from tests.conftest import async_db_session, client, test_user, auth_headers, test_product, test_tenant
        logger.info("Test fixtures imported successfully")
    except Exception as e:
        logger.error(f"Failed to import fixtures: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
    
    # Step 4: Try to create a test DB session
    logger.info("Step 4: Creating test DB session...")
    try:
        # get_async_session_local returns a factory, we need to call it to get a session
        session_factory = get_async_session_local()
        logger.info(f"DB session factory created: {session_factory}")
        
        # Now create an actual session
        async_session = session_factory()
        logger.info(f"Async session created: {async_session}")
        
        # Test the session with a simple query
        logger.info("Testing session with a simple query...")
        from sqlalchemy import text
        result = await async_session.execute(text("SELECT 1"))
        logger.info(f"Query result: {result.scalar()}")
        
        # Close the session properly
        await async_session.close()
        logger.info("DB session closed successfully")
    except Exception as e:
        logger.error(f"Failed to create/use DB session: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
    
    # Step 5: End test
    logger.info("Debug test completed successfully")

if __name__ == "__main__":
    import traceback
    try:
        asyncio.run(main())
    except Exception as e:
        logger.error(f"Debug test failed with error: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
