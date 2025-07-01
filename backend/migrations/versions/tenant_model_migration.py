"""
Tenant model migration.

Revision ID: 2023062801
Revises: tenant_model_migration
Create Date: 2023-06-28 09:15:23.123456

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '2023062801'
down_revision = None  # Update this to point to your previous migration
branch_labels = None
depends_on = None


def upgrade():
    """Upgrade database schema with tenant model."""
    op.create_table('tenants',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('subdomain', sa.String(length=63), nullable=False),
        sa.Column('custom_domain', sa.String(length=253), nullable=True),
        sa.Column('admin_user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('display_name', sa.String(length=100), nullable=True),
        sa.Column('logo_url', sa.String(length=255), nullable=True),
        sa.Column('primary_color', sa.String(length=7), nullable=True),
        sa.Column('secondary_color', sa.String(length=7), nullable=True),
        sa.Column('contact_email', sa.String(length=255), nullable=True),
        sa.Column('contact_phone', sa.String(length=20), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('stripe_customer_id', sa.String(length=100), nullable=True),
        sa.ForeignKeyConstraint(['admin_user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for performance
    op.create_index(op.f('ix_tenants_name'), 'tenants', ['name'], unique=False)
    op.create_index(op.f('ix_tenants_subdomain'), 'tenants', ['subdomain'], unique=True)
    op.create_index(op.f('ix_tenants_custom_domain'), 'tenants', ['custom_domain'], unique=True)
    
    # Add tenant_id column to relevant tables that need tenant isolation
    # You may need to adjust these based on your actual schema
    for table in ['users', 'products', 'orders', 'conversations', 'payments']:
        try:
            op.add_column(
                table,
                sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True)
            )
            op.create_index(
                f'ix_{table}_tenant_id',
                table,
                ['tenant_id']
            )
            op.create_foreign_key(
                f'fk_{table}_tenant_id',
                table,
                'tenants',
                ['tenant_id'],
                ['id']
            )
        except Exception as e:
            # If table doesn't exist yet, we'll create it with tenant_id in future migrations
            print(f"Warning: Could not add tenant_id to {table}. Error: {e}")


def downgrade():
    """Downgrade database schema by removing tenant model and references."""
    # Remove tenant_id foreign keys and columns from related tables
    # You may need to adjust these based on your actual schema
    for table in ['users', 'products', 'orders', 'conversations', 'payments']:
        try:
            op.drop_constraint(f'fk_{table}_tenant_id', table, type_='foreignkey')
            op.drop_index(f'ix_{table}_tenant_id', table_name=table)
            op.drop_column(table, 'tenant_id')
        except Exception as e:
            print(f"Warning: Could not remove tenant_id from {table}. Error: {e}")

    # Drop the tenants table
    op.drop_index(op.f('ix_tenants_custom_domain'), table_name='tenants')
    op.drop_index(op.f('ix_tenants_subdomain'), table_name='tenants')
    op.drop_index(op.f('ix_tenants_name'), table_name='tenants')
    op.drop_table('tenants')
