"""add storefront config

Revision ID: add_storefront_config
Revises: add_content_moderation
Create Date: 2025-05-28 01:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_storefront_config'
down_revision = 'add_content_moderation'
branch_labels = None
depends_on = None


def upgrade():
    # Add storefront_enabled column to tenants table
    op.add_column('tenants', sa.Column('storefront_enabled', sa.Boolean(), nullable=False, server_default='true'))
    
    # Create storefront_configs table
    op.create_table(
        'storefront_configs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('subdomain_name', sa.String(63), nullable=False),
        sa.Column('custom_domain', sa.String(255), nullable=True),
        sa.Column('domain_verified', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('meta_title', sa.String(255), nullable=True),
        sa.Column('meta_description', sa.String(500), nullable=True),
        sa.Column('theme_settings', postgresql.JSONB(), nullable=False, server_default='{}'),
        sa.Column('layout_config', postgresql.JSONB(), nullable=False, server_default='''
        {
            "hero": {
                "enabled": true,
                "type": "banner",
                "content": []
            },
            "featured_products": {
                "enabled": true,
                "title": "Featured Products",
                "limit": 8
            },
            "categories": {
                "enabled": true,
                "display_mode": "grid"
            },
            "about": {
                "enabled": true,
                "content": ""
            }
        }
        '''),
        sa.Column('social_links', postgresql.JSONB(), nullable=False, server_default='''
        {
            "whatsapp": "",
            "instagram": "",
            "facebook": "",
            "twitter": "",
            "tiktok": ""
        }
        '''),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('subdomain_name', name='uq_storefront_subdomain'),
        sa.UniqueConstraint('custom_domain', name='uq_storefront_custom_domain'),
        sa.UniqueConstraint('tenant_id', name='uq_tenant_storefront_config')
    )
    
    # Add indexes
    op.create_index('idx_tenant_storefront', 'storefront_configs', ['tenant_id'])


def downgrade():
    # Drop indexes
    op.drop_index('idx_tenant_storefront')
    
    # Drop table
    op.drop_table('storefront_configs')
