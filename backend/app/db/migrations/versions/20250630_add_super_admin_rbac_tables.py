"""
Add Super Admin RBAC tables

This migration creates the tables required for the Super Admin RBAC system:
- admin_roles
- admin_permissions
- admin_role_permissions
- admin_role_hierarchy
- admin_users
- admin_user_roles

Revision ID: 20250630_admin_rbac
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid


# revision identifiers, used by Alembic
revision = '20250630_admin_rbac'
down_revision = '20250626_add_webhook_events_table'
branch_labels = None
depends_on = None


def upgrade():
    # Create admin_roles table
    op.create_table(
        'admin_roles',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('is_system', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_tenant_scoped', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.UniqueConstraint('name', name='uq_admin_role_name')
    )
    
    # Create enum type for permission scopes
    op.execute("CREATE TYPE permissionscope AS ENUM ('global', 'tenant', 'self')")
    
    # Create admin_permissions table
    op.create_table(
        'admin_permissions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('resource', sa.String(), nullable=False),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('scope', sa.Enum('global', 'tenant', 'self', name='permissionscope'), nullable=False, server_default='tenant'),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('is_system', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('condition', sa.Text()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.UniqueConstraint('resource', 'action', 'scope', name='uq_permission_resource_action_scope')
    )
    
    # Create admin_role_hierarchy table
    op.create_table(
        'admin_role_hierarchy',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('parent_role_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('admin_roles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('child_role_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('admin_roles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint('parent_role_id', 'child_role_id', name='uq_role_hierarchy')
    )
    
    # Create admin_role_permissions table
    op.create_table(
        'admin_role_permissions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('role_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('admin_roles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('permission_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('admin_permissions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('condition', sa.Text()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.UniqueConstraint('role_id', 'permission_id', name='uq_role_permission')
    )
    
    # Create admin_users table
    op.create_table(
        'admin_users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_super_admin', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('require_2fa', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('allowed_ip_ranges', postgresql.JSONB(astext_type=sa.Text())),
        sa.Column('preferences', postgresql.JSONB(astext_type=sa.Text())),
        sa.Column('last_login_at', sa.DateTime(timezone=True)),
        sa.Column('last_login_ip', sa.String()),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.UniqueConstraint('user_id', name='uq_admin_user_user_id')
    )
    
    # Create admin_user_roles table
    op.create_table(
        'admin_user_roles',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('admin_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('admin_users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('admin_roles.id', ondelete='CASCADE'), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.Column('created_by_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.UniqueConstraint('admin_user_id', 'role_id', 'tenant_id', name='uq_admin_user_role_tenant')
    )
    
    # Create indexes
    op.create_index('ix_admin_roles_name', 'admin_roles', ['name'])
    op.create_index('ix_admin_permissions_resource', 'admin_permissions', ['resource'])
    op.create_index('ix_admin_permissions_action', 'admin_permissions', ['action'])
    op.create_index('ix_admin_users_user_id', 'admin_users', ['user_id'])
    op.create_index('ix_admin_user_roles_admin_user_id', 'admin_user_roles', ['admin_user_id'])
    op.create_index('ix_admin_user_roles_role_id', 'admin_user_roles', ['role_id'])
    op.create_index('ix_admin_user_roles_tenant_id', 'admin_user_roles', ['tenant_id'])


def downgrade():
    # Drop tables in reverse order of creation
    op.drop_table('admin_user_roles')
    op.drop_table('admin_users')
    op.drop_table('admin_role_permissions')
    op.drop_table('admin_role_hierarchy')
    op.drop_table('admin_permissions')
    
    # Drop enum type
    op.execute("DROP TYPE permissionscope")
    
    op.drop_table('admin_roles')
