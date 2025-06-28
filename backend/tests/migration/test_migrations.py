"""
Tests for Alembic migrations to ensure they're correctly defined and consistent.

These tests validate that:
1. Migration head matches current SQLAlchemy models
2. All migrations can be applied to a clean database
3. All migrations have both upgrade and downgrade paths
"""
import os
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.engine.reflection import Inspector
import alembic.config
from alembic.migration import MigrationContext
from alembic.autogenerate import compare_metadata

# Import SQLAlchemy models and Base
from app.db import Base
from app.models import *  # This imports all models to ensure they're registered with metadata


class TestAlembicMigrations:
    """Test suite for Alembic migrations."""

    @pytest.fixture
    def alembic_config(self):
        """Create a test Alembic configuration."""
        config = alembic.config.Config("alembic.ini")
        # Override database URL if needed for testing
        db_url = os.environ.get("TEST_DATABASE_URL")
        if db_url:
            config.set_main_option("sqlalchemy.url", db_url)
        return config

    @pytest.fixture
    def db_engine(self):
        """Create a test database engine."""
        # Get database URL from environment or use a test default
        db_url = os.environ.get(
            "TEST_DATABASE_URL",
            "postgresql+asyncpg://postgres:postgres@localhost/test_migrations"
        )
        
        # Convert asyncpg URL to regular postgresql for tests if necessary
        if "+asyncpg" in db_url:
            db_url = db_url.replace("+asyncpg", "", 1)
            
        # Create engine with isolation level suitable for DDL operations
        engine = create_engine(db_url, isolation_level="AUTOCOMMIT")
        
        # Create database if it doesn't exist (for tests)
        try:
            with engine.connect() as conn:
                conn.execute(text("CREATE DATABASE test_migrations"))
        except Exception as e:
            # Database might already exist, which is fine
            print(f"Note: {e}")
            
        # Connect to the test database
        test_db_url = db_url
        if "test_migrations" not in test_db_url:
            if "/" in test_db_url:
                test_db_url = test_db_url.rsplit("/", 1)[0] + "/test_migrations"
        
        test_engine = create_engine(test_db_url)
        
        yield test_engine
        
        # Clean up - don't drop DB here, as we want to inspect it for debugging if needed
    
    def test_migration_head_matches_models(self, db_engine, alembic_config):
        """Test that migration head matches SQLAlchemy models."""
        # Set up migration context with connection
        with db_engine.connect() as connection:
            # Apply all migrations first
            alembic.command.upgrade(alembic_config, "head")
            
            # Get current DB schema via migration context
            context = MigrationContext.configure(connection)
            
            # Compare current schema with models metadata
            diffs = compare_metadata(context, Base.metadata)
            
            # Filter out certain noise differences that aren't real issues
            real_diffs = []
            for diff in diffs:
                # Example: Filter out server_default differences for timestamps
                if diff[0] == 'modify_column' and 'server_default' in str(diff):
                    continue
                real_diffs.append(diff)
            
            # If there are real differences, format them for reporting
            if real_diffs:
                diff_msg = "\nDifferences between models and migration head:\n"
                for diff in real_diffs:
                    diff_msg += f"- {diff}\n"
                    
                # Fail with detailed message about the differences
                assert not real_diffs, diff_msg
    
    def test_migration_reversibility(self, db_engine, alembic_config):
        """Test that all migrations can be applied and reversed."""
        # Get migration versions
        from alembic.script import ScriptDirectory
        script = ScriptDirectory.from_config(alembic_config)
        revisions = list(script.walk_revisions())
        rev_ids = [rev.revision for rev in revisions]
        
        # Apply migrations one by one and check each can be reversed
        for rev_id in reversed(rev_ids):
            # Upgrade to this revision
            alembic.command.upgrade(alembic_config, rev_id)
            
            # Then downgrade one step
            alembic.command.downgrade(alembic_config, "-1")
            
            # Then upgrade again to continue testing
            alembic.command.upgrade(alembic_config, rev_id)
            
        # Final assertion - we should be able to reach head
        with db_engine.connect() as conn:
            result = conn.execute(text(
                "SELECT version_num FROM alembic_version"
            )).scalar()
            
            # Get the expected head revision
            head_rev = script.get_current_head()
            
            assert result == head_rev, \
                f"Failed to reach migration head. Current: {result}, Expected: {head_rev}"
    
    def test_all_tables_have_primary_keys(self, db_engine, alembic_config):
        """Ensure all tables have primary keys defined."""
        # Apply all migrations
        alembic.command.upgrade(alembic_config, "head")
        
        # Check all tables
        inspector = Inspector.from_engine(db_engine)
        tables = inspector.get_table_names()
        
        tables_without_pk = []
        for table in tables:
            if table == 'alembic_version':
                continue  # Skip Alembic's version table
                
            pk = inspector.get_pk_constraint(table)
            if not pk['constrained_columns']:
                tables_without_pk.append(table)
        
        assert not tables_without_pk, \
            f"The following tables are missing primary keys: {', '.join(tables_without_pk)}"
