"""Storefront Editor Phase 1

Revision ID: storefront_editor_phase1
Revises: f3c8e0fb295b  # Using a revision ID from the list that appears recent
Create Date: 2025-05-30

This migration implements Phase 1 of the Storefront Editor Backend:
- Draft/publish workflow
- Version history tracking
- Permissions and validation
- Asset management
- Banner/logo management
- Layout template and component system
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers, used by Alembic
revision = 'storefront_editor_phase1'
down_revision = 'f3c8e0fb295b'  # Using a revision ID from the list that appears recent
branch_labels = None
depends_on = None

def create_enum(name, values):
    """Helper function to create enum types"""
    op.execute(f"CREATE TYPE {name} AS ENUM ({', '.join(repr(v) for v in values)})")

def upgrade():
    # Create enum types
    create_enum('storefrontstatus', ['draft', 'published', 'scheduled', 'archived'])
    create_enum('storefrontrole', ['viewer', 'editor', 'publisher', 'admin'])
    create_enum('storefrontsectiontype', ['theme', 'layout', 'content', 'products', 'settings', 'banners', 'assets', 'seo'])
    create_enum('assettype', ['image', 'video', 'document', 'audio', 'other'])
    create_enum('bannertype', ['hero', 'promotional', 'announcement', 'category', 'seasonal', 'custom'])
    create_enum('bannerplacement', ['header', 'homepage', 'category_page', 'product_page', 'footer', 'sidebar', 'popup'])
    create_enum('logovariant', ['primary', 'secondary', 'dark', 'light', 'monochrome', 'favicon', 'mobile'])
    create_enum('componenttype', ['hero', 'carousel', 'product_grid', 'product_list', 'featured_products', 'category_showcase', 
                                  'text_block', 'image_block', 'video_block', 'testimonials', 'newsletter_signup', 
                                  'contact_form', 'call_to_action', 'social_feed', 'custom'])
    create_enum('componentplacement', ['header', 'main', 'sidebar', 'footer', 'popup', 'product_page', 'category_page', 'checkout'])
    create_enum('pagetype', ['home', 'product', 'category', 'about', 'contact', 'custom', 'checkout', 'cart', 'account', 'policy'])
    
    # Update storefront_configs table
    op.add_column('storefront_configs', sa.Column('status', sa.Enum('draft', 'published', 'scheduled', 'archived', name='storefrontstatus'), 
                                                 nullable=False, server_default='draft'))
    op.add_column('storefront_configs', sa.Column('published_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('storefront_configs', sa.Column('scheduled_publish_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('storefront_configs', sa.Column('published_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True))
    op.add_column('storefront_configs', sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()))
    op.add_column('storefront_configs', sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()))
    
    # Create storefront_drafts table
    op.create_table(
        'storefront_drafts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('storefront_config_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('storefront_configs.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('name', sa.String(255), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.Column('subdomain_name', sa.String(63), nullable=False),
        sa.Column('custom_domain', sa.String(255), nullable=True),
        sa.Column('meta_title', sa.String(255), nullable=True),
        sa.Column('meta_description', sa.String(500), nullable=True),
        sa.Column('theme_settings', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('layout_config', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('social_links', postgresql.JSONB, nullable=False, server_default='{}'),
    )
    op.create_index('idx_draft_storefront_config', 'storefront_drafts', ['storefront_config_id'])
    
    # Create storefront_versions table
    op.create_table(
        'storefront_versions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('storefront_config_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('storefront_configs.id', ondelete='CASCADE'), nullable=False),
        sa.Column('version_number', sa.Integer, nullable=False),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('change_summary', sa.String(255), nullable=True),
        sa.Column('change_description', sa.Text, nullable=True),
        sa.Column('tags', postgresql.JSONB, nullable=False, server_default='[]'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('configuration_snapshot', postgresql.JSONB, nullable=False),
    )
    op.create_index('idx_unique_storefront_version', 'storefront_versions', ['storefront_config_id', 'version_number'], unique=True)
    op.create_index('idx_storefront_version_created', 'storefront_versions', ['storefront_config_id', 'created_at'])
    
    # Create storefront_permissions table
    op.create_table(
        'storefront_permissions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', sa.Enum('viewer', 'editor', 'publisher', 'admin', name='storefrontrole'), nullable=False, server_default='viewer'),
        sa.Column('section_permissions', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('component_permissions', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.UniqueConstraint('tenant_id', 'user_id', name='uq_user_tenant_permission'),
    )
    op.create_index('idx_storefront_permission_user', 'storefront_permissions', ['user_id'])
    op.create_index('idx_storefront_permission_tenant', 'storefront_permissions', ['tenant_id'])
    
    # Create storefront_assets table
    op.create_table(
        'storefront_assets',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('filename', sa.String(255), nullable=False),
        sa.Column('original_filename', sa.String(255), nullable=True),
        sa.Column('file_path', sa.String(512), nullable=False),
        sa.Column('file_size', sa.Integer, nullable=False),
        sa.Column('mime_type', sa.String(127), nullable=False),
        sa.Column('asset_type', sa.Enum('image', 'video', 'document', 'audio', 'other', name='assettype'), nullable=False),
        sa.Column('alt_text', sa.String(255), nullable=True),
        sa.Column('title', sa.String(255), nullable=True),
        sa.Column('description', sa.String(1000), nullable=True),
        sa.Column('metadata', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('usage_count', sa.Integer, nullable=False, server_default='0'),
        sa.Column('usage_locations', postgresql.JSONB, nullable=False, server_default='[]'),
        sa.Column('version', sa.Integer, nullable=False, server_default='1'),
        sa.Column('parent_asset_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('storefront_assets.id'), nullable=True),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('is_optimized', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )
    op.create_index('idx_asset_tenant', 'storefront_assets', ['tenant_id'])
    op.create_index('idx_asset_type', 'storefront_assets', ['tenant_id', 'asset_type'])
    op.create_index('idx_asset_parent', 'storefront_assets', ['parent_asset_id'])
    
    # Create storefront_banners table
    op.create_table(
        'storefront_banners',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('banner_type', sa.Enum('hero', 'promotional', 'announcement', 'category', 'seasonal', 'custom', name='bannertype'), 
                  nullable=False, server_default='custom'),
        sa.Column('placement', sa.Enum('header', 'homepage', 'category_page', 'product_page', 'footer', 'sidebar', 'popup', name='bannerplacement'), 
                  nullable=False),
        sa.Column('title', sa.String(255), nullable=True),
        sa.Column('subtitle', sa.String(500), nullable=True),
        sa.Column('content', sa.String(1000), nullable=True),
        sa.Column('call_to_action', sa.String(255), nullable=True),
        sa.Column('link_url', sa.String(500), nullable=True),
        sa.Column('asset_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('storefront_assets.id'), nullable=True),
        sa.Column('design_settings', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('end_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('priority', sa.Integer, nullable=False, server_default='0'),
        sa.Column('targeting_rules', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('impressions', sa.Integer, nullable=False, server_default='0'),
        sa.Column('clicks', sa.Integer, nullable=False, server_default='0'),
        sa.Column('conversions', sa.Integer, nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )
    op.create_index('idx_banner_tenant', 'storefront_banners', ['tenant_id'])
    op.create_index('idx_banner_active_tenant', 'storefront_banners', ['tenant_id', 'is_active'])
    op.create_index('idx_banner_scheduling', 'storefront_banners', ['start_date', 'end_date'])
    op.create_index('idx_banner_placement', 'storefront_banners', ['tenant_id', 'placement'])
    
    # Create storefront_logos table
    op.create_table(
        'storefront_logos',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('variant', sa.Enum('primary', 'secondary', 'dark', 'light', 'monochrome', 'favicon', 'mobile', name='logovariant'), 
                  nullable=False, server_default='primary'),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('asset_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('storefront_assets.id'), nullable=False),
        sa.Column('display_settings', postgresql.JSONB, nullable=False, 
                  server_default='{"maxWidth": "200px", "maxHeight": "80px", "padding": "0", "backgroundColor": "transparent"}'),
        sa.Column('alt_text', sa.String(255), nullable=False, server_default='Company Logo'),
        sa.Column('responsive_settings', postgresql.JSONB, nullable=False, 
                  server_default='{"mobile": {"maxWidth": "150px", "maxHeight": "60px"}, "tablet": {"maxWidth": "180px", "maxHeight": "70px"}, "desktop": {"maxWidth": "200px", "maxHeight": "80px"}}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )
    op.create_index('idx_logo_tenant', 'storefront_logos', ['tenant_id'])
    op.create_index('idx_logo_variant', 'storefront_logos', ['tenant_id', 'variant'])
    # Create conditional unique index for active logos
    op.execute(
        "CREATE UNIQUE INDEX idx_unique_active_logo_variant ON storefront_logos (tenant_id, variant) WHERE is_active = true"
    )
    
    # Create storefront_components table
    op.create_table(
        'storefront_components',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('component_type', sa.Enum('hero', 'carousel', 'product_grid', 'product_list', 'featured_products', 'category_showcase', 
                                          'text_block', 'image_block', 'video_block', 'testimonials', 'newsletter_signup', 
                                          'contact_form', 'call_to_action', 'social_feed', 'custom', name='componenttype'), nullable=False),
        sa.Column('properties', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('constraints', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('allowed_placements', postgresql.JSONB, nullable=False, server_default='[]'),
        sa.Column('version', sa.String(50), nullable=False, server_default='1.0.0'),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('property_schema', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )
    op.create_index('idx_component_tenant', 'storefront_components', ['tenant_id'])
    op.create_index('idx_component_type', 'storefront_components', ['tenant_id', 'component_type'])
    
    # Create storefront_page_templates table
    op.create_table(
        'storefront_page_templates',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('page_type', sa.Enum('home', 'product', 'category', 'about', 'contact', 'custom', 
                                     'checkout', 'cart', 'account', 'policy', name='pagetype'), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('layout_structure', postgresql.JSONB, nullable=False, 
                  server_default='{"sections": [{"id": "header", "allowedComponents": ["HEADER"]}, {"id": "main", "allowedComponents": ["*"]}, {"id": "footer", "allowedComponents": ["FOOTER"]}]}'),
        sa.Column('component_slots', postgresql.JSONB, nullable=False, server_default='[]'),
        sa.Column('parent_template_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('storefront_page_templates.id'), nullable=True),
        sa.Column('inheritance_rules', postgresql.JSONB, nullable=False, server_default='{"override": [], "extend": []}'),
        sa.Column('is_system', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )
    op.create_index('idx_template_tenant', 'storefront_page_templates', ['tenant_id'])
    op.create_index('idx_template_type', 'storefront_page_templates', ['tenant_id', 'page_type'])
    op.create_index('idx_template_parent', 'storefront_page_templates', ['parent_template_id'])

def downgrade():
    # Drop tables in reverse order of creation
    op.drop_table('storefront_page_templates')
    op.drop_table('storefront_components')
    op.drop_table('storefront_logos')
    op.drop_table('storefront_banners')
    op.drop_table('storefront_assets')
    op.drop_table('storefront_permissions')
    op.drop_table('storefront_versions')
    op.drop_table('storefront_drafts')
    
    # Remove added columns from storefront_configs
    op.drop_column('storefront_configs', 'updated_at')
    op.drop_column('storefront_configs', 'created_at')
    op.drop_column('storefront_configs', 'published_by')
    op.drop_column('storefront_configs', 'scheduled_publish_at')
    op.drop_column('storefront_configs', 'published_at')
    op.drop_column('storefront_configs', 'status')
    
    # Drop enum types in reverse order
    op.execute('DROP TYPE pagetype')
    op.execute('DROP TYPE componentplacement')
    op.execute('DROP TYPE componenttype')
    op.execute('DROP TYPE logovariant')
    op.execute('DROP TYPE bannerplacement')
    op.execute('DROP TYPE bannertype')
    op.execute('DROP TYPE assettype')
    op.execute('DROP TYPE storefrontsectiontype')
    op.execute('DROP TYPE storefrontrole')
    op.execute('DROP TYPE storefrontstatus')
