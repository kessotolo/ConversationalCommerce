from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Use SQLite in-memory database for tests to avoid requiring PostgreSQL
TEST_SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

# For in-memory SQLite testing
# TEST_SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

# Create test engine with SQLite
test_engine = create_engine(
    TEST_SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False}  # Needed for SQLite
)

TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def get_test_db():
    """Dependency for getting test database session"""
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()
