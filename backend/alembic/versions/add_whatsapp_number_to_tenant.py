"""
Add whatsapp_number column to tenants table

Revision ID: add_whatsapp_number_to_tenant
Revises:
Create Date: 2025-06-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


def upgrade():
    op.add_column('tenants', sa.Column(
        'whatsapp_number', sa.String(), nullable=True))


def downgrade():
    op.drop_column('tenants', 'whatsapp_number')
