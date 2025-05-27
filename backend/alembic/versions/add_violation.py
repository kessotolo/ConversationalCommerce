"""add violation tracking

Revision ID: add_violation
Revises: add_behavior_analysis
Create Date: 2024-03-21 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_violation'
down_revision = 'add_behavior_analysis'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'violations',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=True),
        sa.Column('detection_id', sa.String(), nullable=True),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('severity', sa.String(), nullable=False),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False,
                  server_default='active'),
        sa.Column('reason', sa.String(), nullable=True),
        sa.Column('details', postgresql.JSONB(), nullable=True),
        sa.Column('start_at', sa.DateTime(), nullable=False,
                  server_default=sa.text('now()')),
        sa.Column('end_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False,
                  server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False,
                  server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['detection_id'], ['pattern_detections.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_violations_tenant_id', 'violations', ['tenant_id'])
    op.create_index('ix_violations_user_id', 'violations', ['user_id'])
    op.create_index('ix_violations_status', 'violations', ['status'])
    op.create_index('ix_violations_action', 'violations', ['action'])
    op.create_index('ix_violations_severity', 'violations', ['severity'])


def downgrade():
    op.drop_index('ix_violations_severity')
    op.drop_index('ix_violations_action')
    op.drop_index('ix_violations_status')
    op.drop_index('ix_violations_user_id')
    op.drop_index('ix_violations_tenant_id')
    op.drop_table('violations')
