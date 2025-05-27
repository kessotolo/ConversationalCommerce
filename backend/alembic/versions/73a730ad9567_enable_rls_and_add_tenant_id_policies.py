"""Enable RLS and add tenant_id policies

Revision ID: 73a730ad9567
Revises: c28529718993
Create Date: 2025-05-26 11:35:35.403047

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '73a730ad9567'
down_revision: Union[str, None] = 'c28529718993'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Enable RLS and add tenant_id policies for all relevant tables
    tables = [
        'users',
        'seller_profiles',
        'products',
        'orders',
        'conversation_history',
        'ai_config',
    ]
    for table in tables:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;")
        op.execute(
            f"CREATE POLICY tenant_isolation_policy ON {table} USING (tenant_id::uuid = current_setting('my.tenant_id')::uuid);")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY;")


def downgrade() -> None:
    """Downgrade schema."""
    # Remove RLS and policies for all relevant tables
    tables = [
        'users',
        'seller_profiles',
        'products',
        'orders',
        'conversation_history',
        'ai_config',
    ]
    for table in tables:
        op.execute(
            f"DROP POLICY IF EXISTS tenant_isolation_policy ON {table};")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;")
