#!/usr/bin/env python3
"""
Reset Alembic Migrations Script
This script completely removes and reinitializes the Alembic migration environment,
creating a single clean baseline migration from current SQLAlchemy models.
"""
import os
import shutil
import subprocess
import sys
from pathlib import Path

# Add the app directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__))))

# Import required components
from backend.app.db.engines.sync_engine import get_sync_engine
from sqlalchemy import text

def reset_migrations():
    """Reset migrations completely and create a new baseline."""
    # Step 1: Get database connection
    print("Connecting to database...")
    engine = get_sync_engine()
    
    # Step 2: Drop alembic_version table if it exists
    print("Dropping alembic_version table if it exists...")
    with engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS alembic_version"))
        conn.commit()
    
    # Step 3: Clean up migrations directory
    print("Cleaning up migration directory...")
    versions_dir = Path("alembic/versions")
    
    # Create backup directory if it doesn't exist
    backup_dir = Path("alembic/backup")
    backup_dir.mkdir(exist_ok=True)
    
    # Move existing migration files to backup
    for migration_file in versions_dir.glob("*.py"):
        backup_file = backup_dir / migration_file.name
        if not backup_file.exists():  # Don't overwrite existing backups
            shutil.copy(migration_file, backup_dir)
        os.remove(migration_file)
    
    # Step 4: Create new initial migration
    print("Creating new baseline migration...")
    subprocess.run(["alembic", "revision", "--autogenerate", "-m", "clean_baseline"])
    
    print("\nMigration reset complete!")
    print("\nNext steps:")
    print("1. Review the newly created migration in alembic/versions/")
    print("2. Apply the migration with: alembic upgrade head")

if __name__ == "__main__":
    reset_migrations()
