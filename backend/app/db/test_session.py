from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config.test_settings import get_test_settings

# Get the test settings that include PostgreSQL database URL
settings = get_test_settings()

# Use the PostgreSQL database URL from test settings
TEST_SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

# Create test engine with PostgreSQL
test_engine = create_engine(
    TEST_SQLALCHEMY_DATABASE_URL,
    pool_size=5,
    max_overflow=10
)

TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def get_test_db():
    """Dependency for getting test database session"""
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()
