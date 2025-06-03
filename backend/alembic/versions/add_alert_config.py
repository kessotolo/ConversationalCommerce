"""
Add alert_config table for event-based alert configuration

Revision ID: add_alert_config
Revises:
Create Date: 2025-06-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


def upgrade():
    op.create_table(
        'alert_config',
        sa.Column('id', postgresql.UUID(as_uuid=True),
                  primary_key=True, nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('tenants.id'), nullable=False),
        sa.Column('event_type', sa.String(), nullable=False),
        sa.Column('enabled', sa.Boolean(), nullable=False, default=True),
    )


def downgrade():
    op.drop_table('alert_config')
