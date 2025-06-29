"""add inventory_quantity to product

Revision ID: a25845ba2c86
Revises: 457474329562
Create Date: 2025-06-28 02:50:05.532067

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a25845ba2c86'
down_revision: Union[str, None] = '457474329562'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('products', sa.Column('inventory_quantity',
                  sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('products', 'inventory_quantity')
