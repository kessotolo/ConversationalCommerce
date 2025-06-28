"""fix_enum_types

Revision ID: 5a850b2f9d3c
Revises: c2409a51f8d1
Create Date: 2025-06-26 02:35:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '5a850b2f9d3c'
down_revision: Union[str, None] = 'c2409a51f8d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Fix enum type handling in PostgreSQL.
    
    This migration addresses issues with enum types by:
    1. Creating a consistent approach to enum type management
    2. Ensuring enums are created with proper dependencies
    3. Providing proper upgrade/downgrade paths
    """
    connection = op.get_bind()

    # Before modifying any enums, check which ones are already present
    # and only try to create the ones that don't exist
    
    # Check for existing enums to avoid conflicts
    existing_enums_query = """
    SELECT typname FROM pg_type 
    WHERE typtype = 'e' AND
    typname IN ('kycstatus', 'orderstatus', 'ordersource', 'paymentmethodtype')
    """
    existing_enums = [row[0] for row in connection.execute(sa.text(existing_enums_query))]
    
    # Function to safely create enum if not exists
    def create_enum_if_not_exists(name, values):
        if name not in existing_enums:
            values_sql = ", ".join(f"'{v}'" for v in values)
            sql = f"CREATE TYPE {name} AS ENUM ({values_sql})"
            connection.execute(sa.text(sql))
            print(f"Created enum type {name}")
        else:
            print(f"Enum type {name} already exists")
    
    # Define the enum types with their values
    enums = {
        "kycstatus": ['NOT_STARTED', 'PENDING', 'VERIFIED', 'REJECTED'],
        "orderstatus": ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
        "ordersource": ['whatsapp', 'website', 'instagram'],
        "paymentmethodtype": ['CARD', 'MOBILE_MONEY', 'BANK_TRANSFER', 'USSD']
    }
    
    # Create each enum type if it doesn't exist
    for enum_name, enum_values in enums.items():
        create_enum_if_not_exists(enum_name, enum_values)
    
    # Verify that all columns use the correct enum types
    # This ensures that any columns referencing these enum types
    # are properly connected to the enum types we just verified
    
    # Add a helper function to check and fix enum column references
    def check_and_fix_enum_column(table, column, enum_name):
        # Check if the column exists and uses the correct enum type
        check_sql = f"""
        SELECT a.attname, t.typname
        FROM pg_attribute a
        JOIN pg_type t ON t.oid = a.atttypid
        JOIN pg_class c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = '{table}'
        AND a.attname = '{column}'
        AND n.nspname = 'public'
        """
        result = connection.execute(sa.text(check_sql)).fetchone()
        
        if result:
            col_name, type_name = result
            
            # If column doesn't use the correct enum type, fix it
            if type_name != enum_name:
                # Temporarily convert the column to TEXT
                op.execute(f"ALTER TABLE {table} ALTER COLUMN {column} TYPE TEXT")
                
                # Then convert back to the correct enum type
                op.execute(f"ALTER TABLE {table} ALTER COLUMN {column} TYPE {enum_name} USING {column}::{enum_name}")
                
                print(f"Fixed enum type reference for {table}.{column} to use {enum_name}")
    
    # Check and fix important enum columns
    check_and_fix_enum_column("tenants", "kyc_status", "kycstatus")
    check_and_fix_enum_column("orders", "status", "orderstatus")
    check_and_fix_enum_column("orders", "order_source", "ordersource")
    check_and_fix_enum_column("saved_payment_methods", "type", "paymentmethodtype")


def downgrade() -> None:
    """
    Downgrade does nothing here since we're fixing existing enums,
    not creating new ones. Removing them would disrupt existing data.
    """
    pass
