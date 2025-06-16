"""add storefront_enabled to tenant

Revision ID: 0b7c4ede31ea
Revises:
Create Date: 2025-06-09 02:38:04.945743

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0b7c4ede31ea"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "tenants", sa.Column("storefront_enabled", sa.Boolean(), nullable=True)
    )
    op.execute("UPDATE tenants SET storefront_enabled = TRUE")
    op.alter_column("tenants", "storefront_enabled", nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("tenants", "storefront_enabled")
