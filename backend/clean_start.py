#!/usr/bin/env python3
"""
Complete Database Reset Script

This script creates a completely clean database environment by:
1. Dropping the existing database
2. Creating a new database
3. Creating a clean migration from the current SQLAlchemy models
4. Applying the migration to establish the schema

No hacky migrations, no legacy cruft - just a clean start.
"""
import os
import sys
import subprocess
from pathlib import Path
import shutil

# Add the app directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__))))

# Import database configuration
from app.core.config.settings import get_settings
settings = get_settings()

def clean_start():
    """Perform a complete database reset and clean migration."""
    # Extract database details
    db_name = settings.POSTGRES_DB
    db_user = settings.POSTGRES_USER
    db_password = settings.POSTGRES_PASSWORD
    db_host = settings.POSTGRES_SERVER
    db_port = "5432"  # Default PostgreSQL port
    
    print(f"Starting complete reset for database '{db_name}'")
    
    # Step 1: Drop the database
    print(f"Dropping database '{db_name}'...")
    drop_cmd = f"PGPASSWORD={db_password} psql -U {db_user} -h {db_host} -p {db_port} -d postgres -c 'DROP DATABASE IF EXISTS {db_name};'"
    subprocess.run(drop_cmd, shell=True, check=True)
    
    # Step 2: Create a new database
    print(f"Creating fresh database '{db_name}'...")
    create_cmd = f"PGPASSWORD={db_password} psql -U {db_user} -h {db_host} -p {db_port} -d postgres -c 'CREATE DATABASE {db_name};'"
    subprocess.run(create_cmd, shell=True, check=True)
    
    # Step 2a: Drop all enum types that might exist (at server level)
    print("Dropping existing enum types...")
    # Connect to the new database
    drop_enums_cmd = f"""PGPASSWORD={db_password} psql -U {db_user} -h {db_host} -p {db_port} -d {db_name} -c \"DO $$ 
DECLARE
    enum_type text;
BEGIN
    FOR enum_type IN 
        SELECT t.typname 
        FROM pg_type t 
        JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace 
        WHERE t.typtype = 'e' AND n.nspname = 'public'
    LOOP
        EXECUTE 'DROP TYPE IF EXISTS ' || enum_type || ' CASCADE;';
        RAISE NOTICE 'Dropped enum type: %', enum_type;
    END LOOP;
END $$;\"""
    subprocess.run(drop_enums_cmd, shell=True, check=True)
    
    # Step 3: Clean up migrations directory
    print("Cleaning up migration directory...")
    versions_dir = Path("alembic/versions")
    backup_dir = Path("alembic/backup")
    backup_dir.mkdir(exist_ok=True)
    
    # Move existing migration files to backup
    for migration_file in versions_dir.glob("*.py"):
        backup_file = backup_dir / migration_file.name
        if not backup_file.exists():
            shutil.copy(migration_file, backup_dir)
        os.remove(migration_file)
    
    # Step 4: Create a new baseline migration
    print("Creating new baseline migration...")
    subprocess.run(["alembic", "revision", "--autogenerate", "-m", "clean_baseline"], check=True)
    
    # Step 5: Apply the migration
    print("Applying migration to establish schema...")
    subprocess.run(["alembic", "upgrade", "head"], check=True)
    
    print("\n✅ Clean start complete!")
    print("\nYou now have:")
    print("- A fresh database with no legacy data or schema issues")
    print("- A clean migration history starting from scratch")
    print("- All schema objects properly defined from your SQLAlchemy models")

if __name__ == "__main__":
    clean_start()
