import pytest
from sqlalchemy import text


@pytest.mark.usefixtures("setup_test_db")
def test_db_connection(setup_test_db):
    """Test that we can connect to the test database"""
    from app.db.test_session import test_engine
    
    with test_engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        assert result.scalar() == 1


def test_session_local(db_session):
    """Test that the session factory works correctly"""
    result = db_session.execute(text("SELECT 1"))
    assert result.scalar() == 1
