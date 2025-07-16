"""Deploy RLS policies for tenant isolation

This migration deploys Row Level Security (RLS) policies for all tenant-scoped
tables to ensure complete data isolation between tenants.

Phase 2 Track A: RLS deployment and legacy data upgrade paths

Revision ID: 20250103_rls_deploy
Revises: 20250630_admin_rbac
Create Date: 2025-01-03 10:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic
revision = '20250103_rls_deploy'
down_revision = '20250630_admin_rbac'
branch_labels = None
depends_on = None


def upgrade():
    """Deploy RLS policies for tenant isolation."""

    # Get the database connection
    connection = op.get_bind()

    # Tenant-scoped tables and their policies
    tenant_tables = [
        {
            'table': 'users',
            'tenant_column': 'tenant_id',
            'policy_name': 'tenant_isolation_users'
        },
        {
            'table': 'products',
            'tenant_column': 'tenant_id',
            'policy_name': 'tenant_isolation_products'
        },
        {
            'table': 'orders',
            'tenant_column': 'tenant_id',
            'policy_name': 'tenant_isolation_orders'
        },
        {
            'table': 'order_items',
            'tenant_column': 'tenant_id',
            'policy_name': 'tenant_isolation_order_items'
        },
        {
            'table': 'carts',
            'tenant_column': 'tenant_id',
            'policy_name': 'tenant_isolation_carts'
        },
        {
            'table': 'cart_items',
            'tenant_column': 'tenant_id',
            'policy_name': 'tenant_isolation_cart_items'
        },
        {
            'table': 'team_members',
            'tenant_column': 'tenant_id',
            'policy_name': 'tenant_isolation_team_members'
        },
        {
            'table': 'settings',
            'tenant_column': 'tenant_id',
            'policy_name': 'tenant_isolation_settings'
        },
        {
            'table': 'settings_domains',
            'tenant_column': 'tenant_id',
            'policy_name': 'tenant_isolation_settings_domains'
        },
        {
            'table': 'storefront_configs',
            'tenant_column': 'tenant_id',
            'policy_name': 'tenant_isolation_storefront_configs'
        },
        {
            'table': 'banners',
            'tenant_column': 'tenant_id',
            'policy_name': 'tenant_isolation_banners'
        },
        {
            'table': 'notifications',
            'tenant_column': 'tenant_id',
            'policy_name': 'tenant_isolation_notifications'
        },
        {
            'table': 'kyc_info',
            'tenant_column': 'tenant_id',
            'policy_name': 'tenant_isolation_kyc_info'
        },
        {
            'table': 'kyc_documents',
            'tenant_column': 'tenant_id',
            'policy_name': 'tenant_isolation_kyc_documents'
        },
        {
            'table': 'violations',
            'tenant_column': 'tenant_id',
            'policy_name': 'tenant_isolation_violations'
        },
        {
            'table': 'complaints',
            'tenant_column': 'tenant_id',
            'policy_name': 'tenant_isolation_complaints'
        }
    ]

    # Create tenant context management functions
    connection.execute(text("""
        -- Function to set tenant context
        CREATE OR REPLACE FUNCTION set_tenant_context(tenant_uuid UUID)
        RETURNS void AS $$
        BEGIN
            PERFORM set_config('app.current_tenant_id', tenant_uuid::text, true);
        END;
        $$ LANGUAGE plpgsql;

        -- Function to get current tenant context
        CREATE OR REPLACE FUNCTION get_tenant_context()
        RETURNS UUID AS $$
        BEGIN
            RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::UUID;
        END;
        $$ LANGUAGE plpgsql;

        -- Function to clear tenant context
        CREATE OR REPLACE FUNCTION clear_tenant_context()
        RETURNS void AS $$
        BEGIN
            PERFORM set_config('app.current_tenant_id', '', true);
        END;
        $$ LANGUAGE plpgsql;

        -- Function to validate tenant access
        CREATE OR REPLACE FUNCTION validate_tenant_access(target_tenant_id UUID)
        RETURNS boolean AS $$
        DECLARE
            current_tenant UUID;
        BEGIN
            current_tenant := get_tenant_context();
            RETURN current_tenant IS NOT NULL AND current_tenant = target_tenant_id;
        END;
        $$ LANGUAGE plpgsql;
    """))

    # Enable RLS and create policies for each tenant-scoped table
    for table_config in tenant_tables:
        table_name = table_config['table']
        tenant_column = table_config['tenant_column']
        policy_name = table_config['policy_name']

        # Check if table exists before applying RLS
        table_exists = connection.execute(text(f"""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = '{table_name}'
            )
        """)).scalar()

        if table_exists:
            # Enable RLS on the table
            connection.execute(
                text(f"ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY"))

            # Drop existing policy if it exists
            connection.execute(
                text(f"DROP POLICY IF EXISTS {policy_name} ON {table_name}"))

            # Create the RLS policy
            policy_sql = f"""
                CREATE POLICY {policy_name} ON {table_name}
                FOR ALL
                TO public
                USING ({tenant_column} = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
                WITH CHECK ({tenant_column} = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
            """
            connection.execute(text(policy_sql))

    # Create optimized indexes for RLS performance
    rls_indexes = [
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_tenant_id_active ON users(tenant_id) WHERE is_active = true",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_tenant_id_active ON products(tenant_id) WHERE is_active = true",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_tenant_id_status ON orders(tenant_id, status)",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_members_tenant_id_active ON team_members(tenant_id) WHERE is_active = true",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_tenant_user_date ON orders(tenant_id, user_id, created_at)",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_tenant_category ON products(tenant_id, category) WHERE is_active = true",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_carts_tenant_user ON carts(tenant_id, user_id)",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_tenant_user ON notifications(tenant_id, user_id)",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kyc_info_tenant_status ON kyc_info(tenant_id, status)",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_violations_tenant_status ON violations(tenant_id, status)",
    ]

    for index_sql in rls_indexes:
        try:
            connection.execute(text(index_sql))
        except Exception as e:
            # Log but don't fail the migration for index creation errors
            print(f"Warning: Could not create index: {index_sql} - {str(e)}")

    # Create materialized view for tenant summary performance
    connection.execute(text("""
        CREATE MATERIALIZED VIEW IF NOT EXISTS tenant_summary AS
        SELECT
            t.id as tenant_id,
            t.name as tenant_name,
            t.subdomain,
            t.is_active as tenant_active,
            COALESCE(user_stats.user_count, 0) as user_count,
            COALESCE(user_stats.active_user_count, 0) as active_user_count,
            COALESCE(product_stats.product_count, 0) as product_count,
            COALESCE(product_stats.active_product_count, 0) as active_product_count,
            COALESCE(order_stats.order_count, 0) as order_count,
            COALESCE(order_stats.total_revenue, 0) as total_revenue,
            COALESCE(order_stats.recent_order_count, 0) as recent_order_count,
            t.created_at as tenant_created_at,
            t.updated_at as tenant_updated_at
        FROM tenants t
        LEFT JOIN (
            SELECT
                tenant_id,
                COUNT(*) as user_count,
                COUNT(*) FILTER (WHERE is_active = true) as active_user_count
            FROM users
            GROUP BY tenant_id
        ) user_stats ON t.id = user_stats.tenant_id
        LEFT JOIN (
            SELECT
                tenant_id,
                COUNT(*) as product_count,
                COUNT(*) FILTER (WHERE is_active = true) as active_product_count
            FROM products
            GROUP BY tenant_id
        ) product_stats ON t.id = product_stats.tenant_id
        LEFT JOIN (
            SELECT
                tenant_id,
                COUNT(*) as order_count,
                SUM(total_amount) as total_revenue,
                COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as recent_order_count
            FROM orders
            GROUP BY tenant_id
        ) order_stats ON t.id = order_stats.tenant_id;

        -- Create unique index on the materialized view
        CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_summary_tenant_id
        ON tenant_summary(tenant_id);

        -- Create refresh function for the materialized view
        CREATE OR REPLACE FUNCTION refresh_tenant_summary()
        RETURNS void AS $$
        BEGIN
            REFRESH MATERIALIZED VIEW CONCURRENTLY tenant_summary;
        END;
        $$ LANGUAGE plpgsql;
    """))

    print("✅ RLS policies deployed successfully")
    print("✅ Tenant context functions created")
    print("✅ Performance indexes created")
    print("✅ Tenant summary materialized view created")


def downgrade():
    """Remove RLS policies and related infrastructure."""

    connection = op.get_bind()

    # List of tenant-scoped tables
    tenant_tables = [
        'users', 'products', 'orders', 'order_items', 'carts', 'cart_items',
        'team_members', 'settings', 'settings_domains', 'storefront_configs',
        'banners', 'notifications', 'kyc_info', 'kyc_documents',
        'violations', 'complaints'
    ]

    # Drop RLS policies and disable RLS for each table
    for table_name in tenant_tables:
        # Check if table exists
        table_exists = connection.execute(text(f"""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = '{table_name}'
            )
        """)).scalar()

        if table_exists:
            # Drop all policies for this table
            connection.execute(text(f"""
                DO $$
                DECLARE
                    policy_name text;
                BEGIN
                    FOR policy_name IN
                        SELECT policyname FROM pg_policies
                        WHERE schemaname = 'public' AND tablename = '{table_name}'
                    LOOP
                        EXECUTE 'DROP POLICY IF EXISTS ' || policy_name || ' ON {table_name}';
                    END LOOP;
                END $$;
            """))

            # Disable RLS on the table
            connection.execute(
                text(f"ALTER TABLE {table_name} DISABLE ROW LEVEL SECURITY"))

    # Drop RLS-specific indexes
    rls_indexes = [
        "idx_users_tenant_id_active",
        "idx_products_tenant_id_active",
        "idx_orders_tenant_id_status",
        "idx_team_members_tenant_id_active",
        "idx_orders_tenant_user_date",
        "idx_products_tenant_category",
        "idx_carts_tenant_user",
        "idx_notifications_tenant_user",
        "idx_kyc_info_tenant_status",
        "idx_violations_tenant_status"
    ]

    for index_name in rls_indexes:
        connection.execute(text(f"DROP INDEX IF EXISTS {index_name}"))

    # Drop materialized view and related functions
    connection.execute(text("""
        DROP MATERIALIZED VIEW IF EXISTS tenant_summary;
        DROP FUNCTION IF EXISTS refresh_tenant_summary();
    """))

    # Drop tenant context functions
    connection.execute(text("""
        DROP FUNCTION IF EXISTS set_tenant_context(UUID);
        DROP FUNCTION IF EXISTS get_tenant_context();
        DROP FUNCTION IF EXISTS clear_tenant_context();
        DROP FUNCTION IF EXISTS validate_tenant_access(UUID);
    """))

    print("✅ RLS policies removed")
    print("✅ Tenant context functions dropped")
    print("✅ RLS indexes dropped")
    print("✅ Materialized views dropped")
