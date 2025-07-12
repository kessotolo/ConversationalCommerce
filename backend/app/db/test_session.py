from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from backend.app.core.config.test_settings import get_test_settings

# Get the test settings that include PostgreSQL database URL
settings = get_test_settings()

# Use the PostgreSQL database URL from test settings
TEST_SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

# Create test engine with PostgreSQL
test_async_engine = create_async_engine(
    TEST_SQLALCHEMY_DATABASE_URL, pool_size=5, max_overflow=10
)

TestAsyncSessionLocal = async_sessionmaker(
    autocommit=False, autoflush=False, bind=test_async_engine, class_=AsyncSession
)


async def get_test_db():
    """Dependency for getting test database session"""
    async with TestAsyncSessionLocal() as db:
        yield db
