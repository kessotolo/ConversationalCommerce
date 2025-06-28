#!/usr/bin/env python3
from sqlalchemy import create_engine, text
import os

# Explicitly use the Railway database URL
database_url = "postgresql://postgres:qlyoNCThVQOAsOeZQwzARisTxBKchGbP@yamanote.proxy.rlwy.net:49343/railway"
print(f"Using DATABASE_URL: {database_url}")

# Create SQLAlchemy engine with search_path set to public
database_url += "?options=-c%20search_path=public"
engine = create_engine(database_url)

# Connect and query for tables
with engine.connect() as conn:
    # Check search_path
    search_path = conn.execute(text("SHOW search_path")).scalar()
    print(f"\nCurrent search_path: {search_path}")
    
    # Check for alembic_version table
    print("\nChecking for alembic_version table:")
    try:
        alembic_result = conn.execute(text("SELECT EXISTS(SELECT 1 FROM pg_tables WHERE tablename = 'alembic_version')"))
        if alembic_result.scalar():
            print("- alembic_version table exists")
            # Get schema
            schema_result = conn.execute(text("SELECT schemaname FROM pg_tables WHERE tablename = 'alembic_version'"))
            schema = schema_result.scalar()
            print(f"  In schema: {schema}")
            
            # Check version
            try:
                versions = conn.execute(text(f"SELECT version_num FROM {schema}.alembic_version"))
                for version in versions:
                    print(f"  Version: {version[0]}")
            except Exception as e:
                print(f"  Error reading version: {e}")
        else:
            print("- alembic_version table does not exist")
    except Exception as e:
        print(f"- Error checking alembic_version: {e}")
    
    # List schemas
    print("\nAll schemas in database:")
    try:
        schemas = conn.execute(text("SELECT nspname FROM pg_catalog.pg_namespace"))
        for schema in schemas:
            print(f"- {schema[0]}")
    except Exception as e:
        print(f"- Error listing schemas: {e}")
    
    # Check all tables
    print("\nAll user tables in database:")
    try:
        tables = conn.execute(text("""
            SELECT schemaname, tablename 
            FROM pg_catalog.pg_tables 
            WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
        """))
        
        tables_found = False
        for row in tables:
            tables_found = True
            print(f"- {row[0]}.{row[1]}")
        
        if not tables_found:
            print("No user tables found!")
    except Exception as e:
        print(f"- Error listing tables: {e}")
