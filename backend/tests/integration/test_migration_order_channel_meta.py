from sqlalchemy import text


def test_order_channel_meta_table_exists_and_empty(db_session):
    # Check that the table exists
    result = db_session.execute(
        text(
            """
        SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_name = 'order_channel_meta'
        )
    """
        )
    ).scalar()
    assert result, "order_channel_meta table should exist"

    # Check that the table is empty
    count = db_session.execute(text("SELECT COUNT(*) FROM order_channel_meta")).scalar()
    assert (
        count == 0
    ), "order_channel_meta table should be empty after migration with no WhatsApp data"
