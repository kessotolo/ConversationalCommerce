"""
Test to validate that all required database tables exist at the start of the test suite.
This helps catch schema issues early and ensures migrations are properly applied.
"""
import pytest
from sqlalchemy import text, inspect, create_engine
import os


@pytest.fixture(scope="function")
def validate_database_schema():
    """Validate that all required tables exist in the test database."""
    # Use direct connection instead of db_session fixture to avoid scope issues
    TEST_DATABASE_URL_SYNC = os.environ.get(
        "TEST_DATABASE_URL_SYNC", "postgresql+psycopg2://postgres:postgres@localhost/conversational_commerce_test"
    )

    engine = create_engine(TEST_DATABASE_URL_SYNC)
    with engine.connect() as conn:
        inspector = inspect(conn)
        existing_tables = set(inspector.get_table_names())

        # List of required tables that should exist after migrations
        # Only including tables that actually have models and migrations
        required_tables = {
            # Core tables (these exist)
            'tenants',
            'users',
            'products',
            'orders',
            'order_channel_meta',
            'conversation_history',

            # Admin RBAC tables (these exist)
            'admin_users',
            'admin_roles',
            'admin_permissions',
            'admin_role_permissions',
            'admin_user_roles',

            # Other existing tables
            'address_book',
            'audit_logs',
            'alembic_version',
            'customers',
            'complaints',
            'cart_items',
            'carts',
            'order_items',
            'conversation_events',
            'violations',
            'behavior_patterns',
            'pattern_detections',
            'evidence',
            'content_filter_rules',
            'content_analysis_results',
            'kyc_info',
            'kyc_document',
            'saved_payment_methods',
            'seller_profiles',
            'seller_shipping_providers',
            'shipping_couriers',
            'storefront_assets',
            'storefront_banners',
            'storefront_components',
            'storefront_configs',
            'storefront_drafts',
            'storefront_logos',
            'storefront_page_templates',
            'storefront_permissions',
            'storefront_themes',
            'storefront_versions',
            'team_invite',
            'payments',
            'payment_audit_logs',
            'payment_provider_configurations',
            'payment_rate_limit_logs',
            'payment_settings',
            'payment_split_rules',
            'manual_payment_proofs',
            'ai_config',
            'alert_config',
            'notification_preferences',
        }

        missing_tables = required_tables - existing_tables
        if missing_tables:
            pytest.fail(
                f"Missing required tables in test database: {missing_tables}\n"
                f"Existing tables: {sorted(existing_tables)}\n"
                "This indicates that migrations were not applied correctly or tables were dropped."
            )

        # Also check that alembic_version table exists and has a version
        try:
            result = conn.execute(
                text("SELECT version_num FROM alembic_version"))
            version = result.scalar()
            if not version:
                pytest.fail(
                    "alembic_version table exists but has no version - migrations may not be applied")
            print(f"✓ Database schema validated - Alembic version: {version}")
        except Exception as e:
            pytest.fail(f"Failed to check alembic_version: {e}")

        return existing_tables


def test_database_schema_validation(validate_database_schema):
    """Test that validates all required database tables exist."""
    # This test will fail if validate_database_schema fixture fails
    assert len(validate_database_schema) > 0, "No tables found in database"


def test_core_tables_have_data(db_session):
    """Test that core tables can be queried without errors."""
    # Test that we can query core tables without "relation does not exist" errors
    try:
        # Test tenants table
        result = db_session.execute(text("SELECT COUNT(*) FROM tenants"))
        tenant_count = result.scalar()
        assert tenant_count >= 0, "Should be able to count tenants"

        # Test users table
        result = db_session.execute(text("SELECT COUNT(*) FROM users"))
        user_count = result.scalar()
        assert user_count >= 0, "Should be able to count users"

        # Test products table
        result = db_session.execute(text("SELECT COUNT(*) FROM products"))
        product_count = result.scalar()
        assert product_count >= 0, "Should be able to count products"

        print(
            f"✓ Core tables accessible - Tenants: {tenant_count}, Users: {user_count}, Products: {product_count}")

    except Exception as e:
        pytest.fail(f"Failed to query core tables: {e}")


def test_admin_tables_exist(db_session):
    """Test that admin RBAC tables exist and are accessible."""
    try:
        # Test admin_users table
        result = db_session.execute(text("SELECT COUNT(*) FROM admin_users"))
        admin_user_count = result.scalar()
        assert admin_user_count >= 0, "Should be able to count admin users"

        # Test admin_roles table
        result = db_session.execute(text("SELECT COUNT(*) FROM admin_roles"))
        admin_role_count = result.scalar()
        assert admin_role_count >= 0, "Should be able to count admin roles"

        print(
            f"✓ Admin tables accessible - Admin Users: {admin_user_count}, Admin Roles: {admin_role_count}")

    except Exception as e:
        pytest.fail(f"Failed to query admin tables: {e}")
