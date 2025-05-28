"""add complaints table

Revision ID: add_complaint
Revises: add_violation
Create Date: 2024-03-21 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'add_complaint'
down_revision = 'add_violation'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'complaints',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=True),
        sa.Column('product_id', sa.String(), nullable=True),
        sa.Column('order_id', sa.String(), nullable=True),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('status', sa.Enum('pending', 'in_review', 'escalated', 'resolved',
                  name='complaintstatus'), nullable=False, server_default='pending'),
        sa.Column('tier', sa.Enum('tier1', 'tier2', 'tier3',
                  name='complainttier'), nullable=False, server_default='tier1'),
        sa.Column('description', sa.String(), nullable=False),
        sa.Column('resolution', sa.String(), nullable=True),
        sa.Column('escalation_reason', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False,
                  server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False,
                  server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_complaints_tenant_id', 'complaints', ['tenant_id'])
    op.create_index('ix_complaints_user_id', 'complaints', ['user_id'])
    op.create_index('ix_complaints_status', 'complaints', ['status'])
    op.create_index('ix_complaints_tier', 'complaints', ['tier'])
    op.create_index('ix_complaints_type', 'complaints', ['type'])


def downgrade():
    op.drop_index('ix_complaints_type')
    op.drop_index('ix_complaints_tier')
    op.drop_index('ix_complaints_status')
    op.drop_index('ix_complaints_user_id')
    op.drop_index('ix_complaints_tenant_id')
    op.drop_table('complaints')
