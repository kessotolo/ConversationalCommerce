"""Add conversation_event table for structured event logging

Revision ID: add_conversation_event
Revises:
Create Date: 2025-06-01 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'add_conversation_event'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: create conversation_event table."""
    op.create_table(
        'conversation_event',
        sa.Column('id', postgresql.UUID(as_uuid=True),
                  primary_key=True, nullable=False),
        sa.Column('conversation_id', postgresql.UUID(
            as_uuid=True), nullable=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id'), nullable=True),
        sa.Column('event_type', sa.Enum('message_sent', 'message_read', 'product_clicked',
                  'order_placed', name='conversationeventtype'), nullable=False),
        sa.Column('payload', postgresql.JSONB(
            astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('tenants.id'), nullable=False),
        sa.Column('event_metadata', postgresql.JSONB(
            astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema: drop conversation_event table."""
    op.drop_table('conversation_event')
    sa.Enum(name='conversationeventtype').drop(op.get_bind(), checkfirst=True)
