"""fix violation datatypes

Revision ID: fix_violation_datatypes
Revises: fix_behavior_analysis_datatypes
Create Date: 2025-05-27 03:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'fix_violation_datatypes'
down_revision = 'fix_behavior_analysis_datatypes'
branch_labels = None
depends_on = None


def upgrade():
    # First drop the table (if it exists)
    try:
        op.drop_table('violations')
    except:
        # Table might not exist yet, so continue
        pass
    
    # Create violations table with correct data types
    op.create_table(
        'violations',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('detection_id', sa.String(), nullable=True),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('severity', sa.String(), nullable=False),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='active'),
        sa.Column('reason', sa.String(), nullable=True),
        sa.Column('details', postgresql.JSONB(), nullable=True),
        sa.Column('start_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('end_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['detection_id'], ['pattern_detections.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Add indexes
    op.create_index('ix_violations_tenant_id', 'violations', ['tenant_id'])
    op.create_index('ix_violations_user_id', 'violations', ['user_id'])
    op.create_index('ix_violations_type', 'violations', ['type'])
    op.create_index('ix_violations_status', 'violations', ['status'])
    op.create_index('ix_violations_severity', 'violations', ['severity'])
    op.create_index('ix_violations_action', 'violations', ['action'])


def downgrade():
    op.drop_table('violations')
