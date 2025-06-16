def upgrade() -> None:
    op.create_table(
        "order_channel_meta",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "order_id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            sa.ForeignKey("orders.id"),
            nullable=False,
        ),
        sa.Column(
            "channel",
            sa.Enum("whatsapp", "instagram", "storefront", name="channeltype"),
            nullable=False,
        ),
        sa.Column("message_id", sa.String(), nullable=True),
        sa.Column("chat_session_id", sa.String(), nullable=True),
        sa.Column("user_response_log", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.create_index(
        "ix_order_channel_meta_order_id", "order_channel_meta", ["order_id"]
    )
    op.create_index("ix_order_channel_meta_channel", "order_channel_meta", ["channel"])


def downgrade() -> None:
    op.drop_index("ix_order_channel_meta_order_id", table_name="order_channel_meta")
    op.drop_index("ix_order_channel_meta_channel", table_name="order_channel_meta")
    op.drop_table("order_channel_meta")
