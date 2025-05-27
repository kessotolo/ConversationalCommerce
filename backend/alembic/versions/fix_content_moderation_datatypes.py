"""fix content moderation datatypes

Revision ID: fix_content_moderation_datatypes
Revises: add_content_moderation
Create Date: 2025-05-27 02:50:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'fix_content_moderation_datatypes'
down_revision = 'add_content_moderation'
branch_labels = None
depends_on = None


def upgrade():
    # First drop existing tables (if they exist)
    try:
        # Drop indexes
        op.drop_index('ix_content_analysis_results_review_status')
        op.drop_index('ix_content_analysis_results_status')
        op.drop_index('ix_content_analysis_results_content_type')
        op.drop_index('ix_content_analysis_results_tenant_id')
        op.drop_index('ix_content_filter_rules_content_type')
        op.drop_index('ix_content_filter_rules_tenant_id')
        
        # Drop tables
        op.drop_table('content_analysis_results')
        op.drop_table('content_filter_rules')
    except:
        # Tables might not exist yet, so continue
        pass
    
    # Create content_filter_rules table with correct data types
    op.create_table(
        'content_filter_rules',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('content_type', sa.String(), nullable=False),
        sa.Column('field', sa.String(), nullable=False),
        sa.Column('condition', sa.String(), nullable=False),
        sa.Column('value', sa.String(), nullable=False),
        sa.Column('severity', sa.String(), nullable=False),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('enabled', sa.Boolean(),
                  nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False,
                  server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False,
                  server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create content_analysis_results table with correct data types
    op.create_table(
        'content_analysis_results',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('rule_id', sa.String(), nullable=True),
        sa.Column('content_type', sa.String(), nullable=False),
        sa.Column('content_id', sa.String(), nullable=False),
        sa.Column('field', sa.String(), nullable=False),
        sa.Column('original_content', sa.String(), nullable=False),
        sa.Column('analysis_type', sa.String(), nullable=False),
        sa.Column('result', postgresql.JSONB(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('review_status', sa.String(), nullable=True),
        sa.Column('reviewed_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False,
                  server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False,
                  server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['rule_id'], ['content_filter_rules.id'], ),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
        sa.ForeignKeyConstraint(['reviewed_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Add indexes
    op.create_index('ix_content_filter_rules_tenant_id',
                    'content_filter_rules', ['tenant_id'])
    op.create_index('ix_content_filter_rules_content_type',
                    'content_filter_rules', ['content_type'])
    op.create_index('ix_content_analysis_results_tenant_id',
                    'content_analysis_results', ['tenant_id'])
    op.create_index('ix_content_analysis_results_content_type',
                    'content_analysis_results', ['content_type'])
    op.create_index('ix_content_analysis_results_status',
                    'content_analysis_results', ['status'])
    op.create_index('ix_content_analysis_results_review_status',
                    'content_analysis_results', ['review_status'])


def downgrade():
    # Drop indexes
    op.drop_index('ix_content_analysis_results_review_status')
    op.drop_index('ix_content_analysis_results_status')
    op.drop_index('ix_content_analysis_results_content_type')
    op.drop_index('ix_content_analysis_results_tenant_id')
    op.drop_index('ix_content_filter_rules_content_type')
    op.drop_index('ix_content_filter_rules_tenant_id')

    # Drop tables
    op.drop_table('content_analysis_results')
    op.drop_table('content_filter_rules')
