"""Add tenant quotas

Revision ID: add_tenant_quotas
Revises: 73a730ad9567
Create Date: 2025-05-26 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_tenant_quotas'
down_revision: Union[str, None] = '73a730ad9567'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add rate limiting quota fields
    op.add_column('tenants', sa.Column('requests_per_minute',
                  sa.Integer(), nullable=False, server_default='60'))
    op.add_column('tenants', sa.Column('requests_per_hour',
                  sa.Integer(), nullable=False, server_default='1000'))
    op.add_column('tenants', sa.Column('requests_per_day',
                  sa.Integer(), nullable=False, server_default='10000'))

    # Add resource quota fields
    op.add_column('tenants', sa.Column('max_storage_mb',
                  sa.Integer(), nullable=False, server_default='1024'))
    op.add_column('tenants', sa.Column('max_products',
                  sa.Integer(), nullable=False, server_default='1000'))
    op.add_column('tenants', sa.Column('max_users', sa.Integer(),
                  nullable=False, server_default='100'))

    # Add usage tracking fields
    op.add_column('tenants', sa.Column('current_storage_mb',
                  sa.Integer(), nullable=False, server_default='0'))
    op.add_column('tenants', sa.Column('current_products',
                  sa.Integer(), nullable=False, server_default='0'))
    op.add_column('tenants', sa.Column('current_users',
                  sa.Integer(), nullable=False, server_default='0'))

    # Add API usage tracking fields
    op.add_column('tenants', sa.Column('api_calls_today',
                  sa.BigInteger(), nullable=False, server_default='0'))
    op.add_column('tenants', sa.Column('api_calls_hour',
                  sa.BigInteger(), nullable=False, server_default='0'))
    op.add_column('tenants', sa.Column('api_calls_minute',
                  sa.BigInteger(), nullable=False, server_default='0'))
    op.add_column('tenants', sa.Column(
        'last_api_reset', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove API usage tracking fields
    op.drop_column('tenants', 'last_api_reset')
    op.drop_column('tenants', 'api_calls_minute')
    op.drop_column('tenants', 'api_calls_hour')
    op.drop_column('tenants', 'api_calls_today')

    # Remove usage tracking fields
    op.drop_column('tenants', 'current_users')
    op.drop_column('tenants', 'current_products')
    op.drop_column('tenants', 'current_storage_mb')

    # Remove resource quota fields
    op.drop_column('tenants', 'max_users')
    op.drop_column('tenants', 'max_products')
    op.drop_column('tenants', 'max_storage_mb')

    # Remove rate limiting quota fields
    op.drop_column('tenants', 'requests_per_day')
    op.drop_column('tenants', 'requests_per_hour')
    op.drop_column('tenants', 'requests_per_minute')
