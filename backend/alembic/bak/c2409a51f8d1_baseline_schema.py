"""baseline_schema

Revision ID: c2409a51f8d1
Revises: 
Create Date: 2025-06-24 18:29:48.213147

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'c2409a51f8d1'
down_revision = None
branch_labels = None
depends_on = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema using clean SQLAlchemy metadata approach."""
    # Create enum types
    kyc_status_enum = sa.Enum('NOT_STARTED', 'PENDING', 'VERIFIED', 'REJECTED', name='kycstatus')
    payment_method_type_enum = sa.Enum('CARD', 'MOBILE_MONEY', 'BANK_TRANSFER', 'USSD', name='paymentmethodtype')
    order_source_enum = sa.Enum('whatsapp', 'website', 'instagram', name='ordersource')
    order_status_enum = sa.Enum('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', name='orderstatus')
    # Define all enum types for use in tables
    # Note: SQLAlchemy will create these automatically with proper 'IF NOT EXISTS' semantics
    # when tables referencing them are created
    kyc_status_enum = postgresql.ENUM(
        'NOT_STARTED', 'PENDING', 'VERIFIED', 'REJECTED',
        name='kycstatus',
        create_type=True,  # Create the type in the database
        metadata=sa.MetaData()
    )
    
    payment_method_type_enum = postgresql.ENUM(
        'CARD', 'MOBILE_MONEY', 'BANK_TRANSFER', 'USSD',
        name='paymentmethodtype',
        create_type=True,
        metadata=sa.MetaData()
    )
    
    order_source_enum = postgresql.ENUM(
        'whatsapp', 'website', 'instagram',
        name='ordersource',
        create_type=True,
        metadata=sa.MetaData()
    )
    
    order_status_enum = postgresql.ENUM(
        'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled',
        name='orderstatus',
        create_type=True,
        metadata=sa.MetaData()
    )
    
    # Create enum types explicitly with proper PostgreSQL dialect handling
    # This ensures they exist before table creation and handles 'IF NOT EXISTS' logic
    connection = op.get_bind()
    for enum in [kyc_status_enum, payment_method_type_enum, order_source_enum, order_status_enum]:
        enum.create(connection, checkfirst=True)

    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('tenants',
                    sa.Column('id', sa.UUID(), nullable=False),
                    sa.Column('name', sa.String(), nullable=False),
                    sa.Column('subdomain', sa.String(), nullable=False),
                    sa.Column('custom_domain', sa.String(), nullable=True),
                    sa.Column('domain_verified', sa.Boolean(), nullable=True),
                    sa.Column('domain_verification_token',
                              sa.String(), nullable=True),
                    sa.Column('domain_verification_attempts', postgresql.JSONB(
                        astext_type=sa.Text()), nullable=True),
                    sa.Column('country_code', sa.String(
                        length=2), nullable=True),
                    sa.Column('kyc_status', postgresql.ENUM('NOT_STARTED', 'PENDING',
                                             'VERIFIED', 'REJECTED', name='kycstatus',
                                             create_type=False), nullable=True),
                    sa.Column('kyc_data', postgresql.JSONB(
                        astext_type=sa.Text()), nullable=True),
                    sa.Column('kyc_documents', postgresql.JSONB(
                        astext_type=sa.Text()), nullable=True),
                    sa.Column('kyc_updated_at', sa.DateTime(
                        timezone=True), nullable=True),
                    sa.Column('phone_number', sa.String(), nullable=False),
                    sa.Column('whatsapp_number', sa.String(), nullable=True),
                    sa.Column('is_active', sa.Boolean(), nullable=True),
                    sa.Column('storefront_enabled',
                              sa.Boolean(), nullable=True),
                    sa.Column('settings', sa.UUID(), nullable=True),
                    sa.Column('created_at', sa.DateTime(timezone=True),
                              server_default=sa.text('now()'), nullable=True),
                    sa.Column('updated_at', sa.DateTime(
                        timezone=True), nullable=True),
                    sa.Column('email', sa.String(), nullable=True),
                    sa.PrimaryKeyConstraint('id'),
                    sa.UniqueConstraint('custom_domain'),
                    sa.UniqueConstraint('subdomain')
                    )
    op.create_index(op.f('ix_tenants_email'),
                    'tenants', ['email'], unique=True)
    op.create_index(op.f('ix_tenants_phone_number'),
                    'tenants', ['phone_number'], unique=True)
    op.create_table('saved_payment_methods',
                    sa.Column('id', sa.UUID(), nullable=False),
                    sa.Column('customer_id', sa.UUID(), nullable=False),
                    sa.Column('type', postgresql.ENUM('CARD', 'MOBILE_MONEY', 'BANK_TRANSFER',
                                               'USSD', name='paymentmethodtype',
                                               create_type=False), nullable=False),
                    sa.Column('details', sa.JSON(), nullable=False),
                    sa.Column('is_default', sa.Boolean(), nullable=True),
                    sa.Column('created_at', sa.DateTime(timezone=True),
                              server_default=sa.text('now()'), nullable=True),
                    sa.Column('updated_at', sa.DateTime(
                        timezone=True), nullable=True),
                    sa.ForeignKeyConstraint(
                        ['customer_id'], ['customers.id'], ),
                    sa.PrimaryKeyConstraint('id')
                    )
    op.create_index(op.f('ix_saved_payment_methods_customer_id'),
                    'saved_payment_methods', ['customer_id'], unique=False)
    op.create_table('orders',
                    sa.Column('id', sa.UUID(), nullable=False),
                    sa.Column('product_id', sa.UUID(), nullable=True),
                    sa.Column('seller_id', sa.UUID(), nullable=True),
                    sa.Column('buyer_name', sa.String(), nullable=False),
                    sa.Column('buyer_phone', sa.String(), nullable=False),
                    sa.Column('buyer_email', sa.String(), nullable=True),
                    sa.Column('buyer_address', sa.Text(), nullable=True),
                    sa.Column('quantity', sa.Integer(), nullable=True),
                    sa.Column('total_amount', sa.Float(), nullable=False),
                    sa.Column('order_source', postgresql.ENUM('whatsapp', 'website',
                                                       'instagram', name='ordersource',
                                                       create_type=False), nullable=True),
                    sa.Column('status', postgresql.ENUM('pending', 'confirmed', 'processing', 'shipped',
                                                'delivered', 'cancelled', name='orderstatus',
                                                create_type=False), nullable=True),
                    sa.Column('notes', sa.Text(), nullable=True),
                    sa.Column('version', sa.Integer(), nullable=False),
                    sa.Column('notification_sent',
                              sa.Boolean(), nullable=True),
                    sa.Column('last_notification_at', sa.DateTime(
                        timezone=True), nullable=True),
                    sa.Column('is_deleted', sa.Boolean(), nullable=True),
                    sa.Column('created_at', sa.DateTime(timezone=True),
                              server_default=sa.text('now()'), nullable=True),
                    sa.Column('updated_at', sa.DateTime(
                        timezone=True), nullable=True),
                    sa.ForeignKeyConstraint(['product_id'], ['products.id'], ),
                    sa.PrimaryKeyConstraint('id')
                    )
    op.create_index(op.f('ix_orders_buyer_phone'),
                    'orders', ['buyer_phone'], unique=False)
    op.drop_table('alembic_version')
    op.create_foreign_key(None, 'complaints', 'orders', ['order_id'], ['id'])
    op.create_foreign_key(None, 'complaints', 'tenants', ['tenant_id'], ['id'])
    op.create_foreign_key(None, 'conversation_events',
                          'tenants', ['tenant_id'], ['id'])
    op.create_foreign_key(None, 'conversation_events',
                          'orders', ['order_id'], ['id'])
    op.create_foreign_key(None, 'products', 'tenants', ['tenant_id'], ['id'])
    op.create_foreign_key(None, 'storefront_themes',
                          'tenants', ['tenant_id'], ['id'])
    op.create_foreign_key(None, 'users', 'tenants', ['tenant_id'], ['id'])
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_constraint(None, 'users', type_='foreignkey')
    op.drop_constraint(None, 'storefront_themes', type_='foreignkey')
    op.drop_constraint(None, 'products', type_='foreignkey')
    op.drop_constraint(None, 'conversation_events', type_='foreignkey')
    op.drop_constraint(None, 'conversation_events', type_='foreignkey')
    op.drop_constraint(None, 'complaints', type_='foreignkey')
    op.drop_constraint(None, 'complaints', type_='foreignkey')
    op.create_table('alembic_version',
                    sa.Column('version_num', sa.VARCHAR(length=32),
                              autoincrement=False, nullable=False),
                    sa.PrimaryKeyConstraint(
                        'version_num', name=op.f('alembic_version_pkc'))
                    )
    op.drop_index(op.f('ix_orders_buyer_phone'), table_name='orders')
    op.drop_table('orders')
    op.drop_index(op.f('ix_saved_payment_methods_customer_id'),
                  table_name='saved_payment_methods')
    op.drop_table('saved_payment_methods')
    op.drop_index(op.f('ix_tenants_phone_number'), table_name='tenants')
    op.drop_index(op.f('ix_tenants_email'), table_name='tenants')
    op.drop_table('tenants')
    # ### end Alembic commands ###
