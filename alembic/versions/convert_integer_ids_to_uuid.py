"""Convert integer IDs to UUIDs for consistency

Revision ID: convert_integer_ids_to_uuid
Revises: 457474329562_final_schema_with_all_uuid_foreign_keys
Create Date: 2024-01-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers, used by Alembic.
revision = 'convert_integer_ids_to_uuid'
down_revision = '457474329562_final_schema_with_all_uuid_foreign_keys'
branch_labels = None
depends_on = None


def upgrade():
    """Convert Integer IDs to UUIDs for consistency."""

    # Analytics Events table
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')

    # Step 1: Add new UUID columns
    op.add_column('analytics_events', sa.Column(
        'new_id', postgresql.UUID(as_uuid=True), default=uuid.uuid4))
    op.add_column('analytics_events', sa.Column(
        'new_tenant_id', postgresql.UUID(as_uuid=True)))
    op.add_column('analytics_events', sa.Column(
        'new_user_id', postgresql.UUID(as_uuid=True)))

    # Step 2: Populate UUID columns with new values
    op.execute("""
        UPDATE analytics_events
        SET new_id = uuid_generate_v4(),
            new_tenant_id = (SELECT id FROM tenants WHERE tenants.id::text = analytics_events.tenant_id::text LIMIT 1),
            new_user_id = (SELECT id FROM users WHERE users.id::text = analytics_events.user_id::text LIMIT 1)
    """)

    # Step 3: Drop old columns and constraints
    op.drop_constraint('analytics_events_tenant_id_fkey',
                       'analytics_events', type_='foreignkey')
    op.drop_constraint('analytics_events_user_id_fkey',
                       'analytics_events', type_='foreignkey')
    op.drop_column('analytics_events', 'id')
    op.drop_column('analytics_events', 'tenant_id')
    op.drop_column('analytics_events', 'user_id')

    # Step 4: Rename new columns
    op.alter_column('analytics_events', 'new_id', new_column_name='id')
    op.alter_column('analytics_events', 'new_tenant_id',
                    new_column_name='tenant_id')
    op.alter_column('analytics_events', 'new_user_id',
                    new_column_name='user_id')

    # Step 5: Add constraints
    op.create_primary_key('analytics_events_pkey', 'analytics_events', ['id'])
    op.create_foreign_key(None, 'analytics_events',
                          'tenants', ['tenant_id'], ['id'])
    op.create_foreign_key(None, 'analytics_events',
                          'users', ['user_id'], ['id'])

    # Repeat similar process for analytics_metrics
    op.add_column('analytics_metrics', sa.Column(
        'new_id', postgresql.UUID(as_uuid=True), default=uuid.uuid4))
    op.add_column('analytics_metrics', sa.Column(
        'new_tenant_id', postgresql.UUID(as_uuid=True)))

    op.execute("""
        UPDATE analytics_metrics
        SET new_id = uuid_generate_v4(),
            new_tenant_id = (SELECT id FROM tenants WHERE tenants.id::text = analytics_metrics.tenant_id::text LIMIT 1)
    """)

    op.drop_constraint('analytics_metrics_tenant_id_fkey',
                       'analytics_metrics', type_='foreignkey')
    op.drop_column('analytics_metrics', 'id')
    op.drop_column('analytics_metrics', 'tenant_id')

    op.alter_column('analytics_metrics', 'new_id', new_column_name='id')
    op.alter_column('analytics_metrics', 'new_tenant_id',
                    new_column_name='tenant_id')

    op.create_primary_key('analytics_metrics_pkey',
                          'analytics_metrics', ['id'])
    op.create_foreign_key(None, 'analytics_metrics',
                          'tenants', ['tenant_id'], ['id'])

    # Repeat for analytics_reports
    op.add_column('analytics_reports', sa.Column(
        'new_id', postgresql.UUID(as_uuid=True), default=uuid.uuid4))
    op.add_column('analytics_reports', sa.Column(
        'new_tenant_id', postgresql.UUID(as_uuid=True)))
    op.add_column('analytics_reports', sa.Column(
        'new_created_by', postgresql.UUID(as_uuid=True)))

    op.execute("""
        UPDATE analytics_reports
        SET new_id = uuid_generate_v4(),
            new_tenant_id = (SELECT id FROM tenants WHERE tenants.id::text = analytics_reports.tenant_id::text LIMIT 1),
            new_created_by = (SELECT id FROM users WHERE users.id::text = analytics_reports.created_by::text LIMIT 1)
    """)

    op.drop_constraint('analytics_reports_tenant_id_fkey',
                       'analytics_reports', type_='foreignkey')
    op.drop_constraint('analytics_reports_created_by_fkey',
                       'analytics_reports', type_='foreignkey')
    op.drop_column('analytics_reports', 'id')
    op.drop_column('analytics_reports', 'tenant_id')
    op.drop_column('analytics_reports', 'created_by')

    op.alter_column('analytics_reports', 'new_id', new_column_name='id')
    op.alter_column('analytics_reports', 'new_tenant_id',
                    new_column_name='tenant_id')
    op.alter_column('analytics_reports', 'new_created_by',
                    new_column_name='created_by')

    op.create_primary_key('analytics_reports_pkey',
                          'analytics_reports', ['id'])
    op.create_foreign_key(None, 'analytics_reports',
                          'tenants', ['tenant_id'], ['id'])
    op.create_foreign_key(None, 'analytics_reports',
                          'users', ['created_by'], ['id'])

    # Payment-related tables
    # payment_provider_configurations
    op.add_column('payment_provider_configurations', sa.Column(
        'new_id', postgresql.UUID(as_uuid=True), default=uuid.uuid4))
    op.add_column('payment_provider_configurations', sa.Column(
        'new_settings_id', postgresql.UUID(as_uuid=True)))

    op.execute("""
        UPDATE payment_provider_configurations
        SET new_id = uuid_generate_v4(),
            new_settings_id = (SELECT new_id FROM payment_settings WHERE payment_settings.id = payment_provider_configurations.settings_id)
    """)

    # payment_settings
    op.add_column('payment_settings', sa.Column(
        'new_id', postgresql.UUID(as_uuid=True), default=uuid.uuid4))
    op.execute("UPDATE payment_settings SET new_id = uuid_generate_v4()")

    # Update references first
    op.execute("""
        UPDATE payment_provider_configurations
        SET new_settings_id = (SELECT new_id FROM payment_settings WHERE payment_settings.id = payment_provider_configurations.settings_id)
    """)

    # Drop and recreate payment_settings
    op.drop_constraint('payment_provider_configurations_settings_id_fkey',
                       'payment_provider_configurations', type_='foreignkey')
    op.drop_column('payment_settings', 'id')
    op.alter_column('payment_settings', 'new_id', new_column_name='id')
    op.create_primary_key('payment_settings_pkey', 'payment_settings', ['id'])

    # Drop and recreate payment_provider_configurations
    op.drop_column('payment_provider_configurations', 'id')
    op.drop_column('payment_provider_configurations', 'settings_id')
    op.alter_column('payment_provider_configurations',
                    'new_id', new_column_name='id')
    op.alter_column('payment_provider_configurations',
                    'new_settings_id', new_column_name='settings_id')
    op.create_primary_key('payment_provider_configurations_pkey',
                          'payment_provider_configurations', ['id'])
    op.create_foreign_key(None, 'payment_provider_configurations',
                          'payment_settings', ['settings_id'], ['id'])

    # payment_rate_limit_logs
    op.add_column('payment_rate_limit_logs', sa.Column(
        'new_id', postgresql.UUID(as_uuid=True), default=uuid.uuid4))
    op.execute("UPDATE payment_rate_limit_logs SET new_id = uuid_generate_v4()")
    op.drop_column('payment_rate_limit_logs', 'id')
    op.alter_column('payment_rate_limit_logs', 'new_id', new_column_name='id')
    op.create_primary_key('payment_rate_limit_logs_pkey',
                          'payment_rate_limit_logs', ['id'])

    # payment_split_rules
    op.add_column('payment_split_rules', sa.Column(
        'new_id', postgresql.UUID(as_uuid=True), default=uuid.uuid4))
    op.execute("UPDATE payment_split_rules SET new_id = uuid_generate_v4()")
    op.drop_column('payment_split_rules', 'id')
    op.alter_column('payment_split_rules', 'new_id', new_column_name='id')
    op.create_primary_key('payment_split_rules_pkey',
                          'payment_split_rules', ['id'])

    # activity_logs - just update user_id type
    op.alter_column('activity_logs', 'user_id', type_=postgresql.UUID(
        as_uuid=True), postgresql_using='user_id::uuid')


def downgrade():
    """Revert UUID changes back to integers."""

    # This is a destructive operation and should be used with caution
    # Convert UUIDs back to integers (will lose data if UUIDs can't be converted)

    # Analytics tables
    op.alter_column('analytics_events', 'id', type_=sa.Integer())
    op.alter_column('analytics_events', 'tenant_id', type_=sa.Integer())
    op.alter_column('analytics_events', 'user_id', type_=sa.Integer())

    op.alter_column('analytics_metrics', 'id', type_=sa.Integer())
    op.alter_column('analytics_metrics', 'tenant_id', type_=sa.Integer())

    op.alter_column('analytics_reports', 'id', type_=sa.Integer())
    op.alter_column('analytics_reports', 'tenant_id', type_=sa.Integer())
    op.alter_column('analytics_reports', 'created_by', type_=sa.Integer())

    # Payment tables
    op.alter_column('payment_provider_configurations',
                    'id', type_=sa.Integer())
    op.alter_column('payment_provider_configurations',
                    'settings_id', type_=sa.Integer())

    op.alter_column('payment_settings', 'id', type_=sa.Integer())

    op.alter_column('payment_rate_limit_logs', 'id', type_=sa.Integer())
    op.alter_column('payment_split_rules', 'id', type_=sa.Integer())

    # Activity logs
    op.alter_column('activity_logs', 'user_id',
                    type_=sa.String(), postgresql_using='user_id::text')
