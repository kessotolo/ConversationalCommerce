"""fix behavior analysis datatypes

Revision ID: fix_behavior_analysis_datatypes
Revises: fix_content_moderation_datatypes
Create Date: 2025-05-27 02:55:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'fix_behavior_analysis_datatypes'
down_revision = 'fix_content_moderation_datatypes'
branch_labels = None
depends_on = None


def upgrade():
    # First drop existing tables (if they exist)
    try:
        # Drop related tables in correct order to avoid constraint issues
        op.drop_table('evidence')
        op.drop_table('pattern_detections')
        op.drop_table('behavior_patterns')
    except:
        # Tables might not exist yet, so continue
        pass
    
    # Create behavior_patterns table with correct data types
    op.create_table(
        'behavior_patterns',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('pattern_type', sa.String(), nullable=False),
        sa.Column('conditions', postgresql.JSONB(), nullable=False),
        sa.Column('severity', sa.String(), nullable=False),
        sa.Column('threshold', sa.Float(), nullable=False),
        sa.Column('cooldown_minutes', sa.Integer(), nullable=True, default=60),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create pattern_detections table with correct data types
    op.create_table(
        'pattern_detections',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('pattern_id', sa.String(), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('detection_type', sa.String(), nullable=False),
        sa.Column('confidence_score', sa.Float(), nullable=False),
        sa.Column('evidence', postgresql.JSONB(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('review_status', sa.String(), nullable=True),
        sa.Column('reviewed_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('resolution_notes', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
        sa.ForeignKeyConstraint(['pattern_id'], ['behavior_patterns.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['reviewed_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create evidence table with correct data types
    op.create_table(
        'evidence',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('detection_id', sa.String(), nullable=False),
        sa.Column('evidence_type', sa.String(), nullable=False),
        sa.Column('source', sa.String(), nullable=False),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('collected_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
        sa.ForeignKeyConstraint(['detection_id'], ['pattern_detections.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Add indexes
    op.create_index('ix_behavior_patterns_tenant_id', 'behavior_patterns', ['tenant_id'])
    op.create_index('ix_behavior_patterns_pattern_type', 'behavior_patterns', ['pattern_type'])
    op.create_index('ix_pattern_detections_tenant_id', 'pattern_detections', ['tenant_id'])
    op.create_index('ix_pattern_detections_status', 'pattern_detections', ['status'])
    op.create_index('ix_pattern_detections_user_id', 'pattern_detections', ['user_id'])
    op.create_index('ix_evidence_tenant_id', 'evidence', ['tenant_id'])
    op.create_index('ix_evidence_detection_id', 'evidence', ['detection_id'])


def downgrade():
    # Drop tables in reverse order to respect foreign key constraints
    op.drop_table('evidence')
    op.drop_table('pattern_detections')
    op.drop_table('behavior_patterns')
