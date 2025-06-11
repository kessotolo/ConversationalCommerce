"""create order_channel_meta and migrate whatsapp details

Revision ID: e58ec1efcc2a
Revises: 0b7c4ede31ea
Create Date: 2025-06-11 00:04:46.485998

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e58ec1efcc2a'
down_revision: Union[str, None] = '0b7c4ede31ea'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'order_channel_meta',
        sa.Column('id', sa.dialects.postgresql.UUID(
            as_uuid=True), primary_key=True),
        sa.Column('order_id', sa.dialects.postgresql.UUID(
            as_uuid=True), sa.ForeignKey('orders.id'), nullable=False),
        sa.Column('channel', sa.Enum('whatsapp', 'instagram',
                  'storefront', name='channeltype'), nullable=False),
        sa.Column('message_id', sa.String(), nullable=True),
        sa.Column('chat_session_id', sa.String(), nullable=True),
        sa.Column('user_response_log', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_order_channel_meta_order_id',
                    'order_channel_meta', ['order_id'])
    op.create_index('ix_order_channel_meta_channel',
                    'order_channel_meta', ['channel'])
    
    # Migrate existing WhatsApp order details to the new table
    op.execute("""
    INSERT INTO order_channel_meta (id, order_id, channel, message_id, chat_session_id, created_at)
    SELECT 
        uuid_generate_v4(), 
        w.order_id, 
        'whatsapp', 
        w.message_id, 
        w.conversation_id, 
        w.created_at
    FROM whatsapp_order_details w
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_order_channel_meta_order_id',
                  table_name='order_channel_meta')
    op.drop_index('ix_order_channel_meta_channel',
                  table_name='order_channel_meta')
    op.drop_table('order_channel_meta')
