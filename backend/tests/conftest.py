import os
import sys
import pytest
from pathlib import Path
from sqlalchemy import text

# Add the backend directory to Python path
backend_dir = str(Path(__file__).parent.parent)
sys.path.insert(0, backend_dir)

# Import after path setup
from app.db.test_session import test_engine, TestSessionLocal
from app.db.base_class import Base

@pytest.fixture(scope="session")
def setup_test_db():
    # Create all tables in the test database
    Base.metadata.create_all(bind=test_engine)
    yield
    # Clean up after tests
    Base.metadata.drop_all(bind=test_engine)
    
@pytest.fixture(scope="function")
def db_session():
    # Create a new session for each test
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()
