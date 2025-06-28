"""Add webhook events table for payment idempotency

Revision ID: a539da45f726
Revises: previous_revision_id
Create Date: 2025-06-26 18:50:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision = 'a539da45f726'
down_revision = 'previous_revision_id'  # Update this to the actual previous migration ID
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'webhook_events',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('provider', sa.String(), nullable=False),
        sa.Column('event_id', sa.String(), nullable=False),
        sa.Column('event_type', sa.String(), nullable=False),
        sa.Column('payload', sa.Text(), nullable=True),
        sa.Column('processed_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
    )
    
    # Create index for fast lookups by provider and event_id
    op.create_index(
        'ix_webhook_events_provider_event_id',
        'webhook_events',
        ['provider', 'event_id'],
        unique=True
    )


def downgrade() -> None:
    op.drop_index('ix_webhook_events_provider_event_id', table_name='webhook_events')
    op.drop_table('webhook_events')
