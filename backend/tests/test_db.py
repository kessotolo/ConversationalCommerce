import pytest
from sqlalchemy import text


def test_db_connection(db_engine):
    """Test that we can connect to the test database"""
    # Use the existing db_engine fixture instead of setup_test_db
    with db_engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        assert result.scalar() == 1


def test_session_local(db_session):
    """Test that the session factory works correctly"""
    result = db_session.execute(text("SELECT 1"))
    assert result.scalar() == 1
