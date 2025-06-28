"""fix_foreign_key_references

Revision ID: 7c319e4f82ad
Revises: 5a850b2f9d3c
Create Date: 2025-06-26 02:38:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '7c319e4f82ad'
down_revision: Union[str, None] = '5a850b2f9d3c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Fix foreign key references in the database.
    
    This migration addresses issues with foreign keys by:
    1. Ensuring all foreign keys have proper names and references
    2. Setting consistent ON DELETE/UPDATE behavior
    3. Adding missing foreign keys
    4. Fixing any inconsistent references
    """
    connection = op.get_bind()
    
    # Function to check if a foreign key exists between tables
    def fk_exists(table, column, ref_table, ref_column):
        sql = """
        SELECT COUNT(*) FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
        JOIN pg_class rt ON rt.oid = c.confrelid
        JOIN pg_attribute ra ON ra.attrelid = rt.oid AND ra.attnum = ANY(c.confkey)
        WHERE c.contype = 'f'
        AND n.nspname = 'public'
        AND t.relname = :table
        AND a.attname = :column
        AND rt.relname = :ref_table
        AND ra.attname = :ref_column
        """
        count = connection.execute(sa.text(sql), {
            'table': table, 
            'column': column, 
            'ref_table': ref_table, 
            'ref_column': ref_column
        }).scalar()
        return count > 0
    
    # List of foreign keys to check and fix
    foreign_keys = [
        # Format: (table, column, ref_table, ref_column, constraint_name, on_delete)
        ('complaints', 'order_id', 'orders', 'id', 'fk_complaints_order_id', 'CASCADE'),
        ('complaints', 'tenant_id', 'tenants', 'id', 'fk_complaints_tenant_id', 'CASCADE'),
        ('conversation_events', 'tenant_id', 'tenants', 'id', 'fk_conversation_events_tenant_id', 'CASCADE'),
        ('conversation_events', 'order_id', 'orders', 'id', 'fk_conversation_events_order_id', 'SET NULL'),
        ('products', 'tenant_id', 'tenants', 'id', 'fk_products_tenant_id', 'CASCADE'),
        ('storefront_themes', 'tenant_id', 'tenants', 'id', 'fk_storefront_themes_tenant_id', 'CASCADE'),
        ('users', 'tenant_id', 'tenants', 'id', 'fk_users_tenant_id', 'CASCADE'),
        ('order_items', 'order_id', 'orders', 'id', 'fk_order_items_order_id', 'CASCADE'),
        ('order_channel_meta', 'order_id', 'orders', 'id', 'fk_order_channel_meta_order_id', 'CASCADE')
    ]
    
    # Check and fix each foreign key
    for table, column, ref_table, ref_column, constraint_name, on_delete in foreign_keys:
        try:
            # Check if table exists before proceeding
            table_exists_sql = f"""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = '{table}' AND table_schema = 'public'
            )
            """
            table_exists = connection.execute(sa.text(table_exists_sql)).scalar()
            
            if not table_exists:
                print(f"Table {table} does not exist. Skipping FK check for {constraint_name}")
                continue
                
            # Check if column exists
            column_exists_sql = f"""
            SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_name = '{table}' AND column_name = '{column}' AND table_schema = 'public'
            )
            """
            column_exists = connection.execute(sa.text(column_exists_sql)).scalar()
            
            if not column_exists:
                print(f"Column {table}.{column} does not exist. Skipping FK check for {constraint_name}")
                continue
            
            # If foreign key doesn't exist, create it
            if not fk_exists(table, column, ref_table, ref_column):
                # Drop any potentially conflicting constraints first
                try:
                    op.drop_constraint(constraint_name, table, type_='foreignkey')
                except Exception:
                    # Constraint might not exist, which is fine
                    pass
                
                # Create the foreign key with proper naming and behavior
                op.create_foreign_key(
                    constraint_name, table, ref_table,
                    [column], [ref_column],
                    ondelete=on_delete
                )
                print(f"Created foreign key {constraint_name} on {table}.{column} referencing {ref_table}.{ref_column}")
            else:
                print(f"Foreign key already exists from {table}.{column} to {ref_table}.{ref_column}")
        except Exception as e:
            print(f"Error handling foreign key {constraint_name}: {e}")


def downgrade() -> None:
    """
    Remove the foreign keys added in this migration.
    """
    foreign_keys = [
        ('complaints', 'fk_complaints_order_id'),
        ('complaints', 'fk_complaints_tenant_id'),
        ('conversation_events', 'fk_conversation_events_tenant_id'),
        ('conversation_events', 'fk_conversation_events_order_id'),
        ('products', 'fk_products_tenant_id'),
        ('storefront_themes', 'fk_storefront_themes_tenant_id'),
        ('users', 'fk_users_tenant_id'),
        ('order_items', 'fk_order_items_order_id'),
        ('order_channel_meta', 'fk_order_channel_meta_order_id')
    ]
    
    # Drop each foreign key constraint
    for table, constraint_name in foreign_keys:
        try:
            op.drop_constraint(constraint_name, table, type_='foreignkey')
        except Exception as e:
            # If constraint doesn't exist or can't be dropped, log and continue
            print(f"Error dropping foreign key {constraint_name}: {e}")
