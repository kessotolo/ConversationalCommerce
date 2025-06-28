#!/usr/bin/env python3
"""
Migration Squashing Utility

This script helps consolidate multiple Alembic migration files into a single baseline
migration, reducing clutter and potential conflicts in the migration directory.

Usage:
    python squash_migrations.py --help
    python squash_migrations.py --dry-run  # Preview what would happen
    python squash_migrations.py            # Create squashed migration file
"""

import argparse
import os
import re
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

# Base directories
BASE_DIR = Path(__file__).parent.parent
ALEMBIC_DIR = BASE_DIR / "alembic"
VERSIONS_DIR = ALEMBIC_DIR / "versions"
BACKUP_DIR = BASE_DIR / "alembic_backup"

# Ensure backup directory exists
BACKUP_DIR.mkdir(exist_ok=True)


def get_current_revision():
    """Get the current head revision from Alembic."""
    result = subprocess.run(
        ["alembic", "current"],
        cwd=BASE_DIR,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(f"Error running alembic current: {result.stderr}")
        sys.exit(1)

    # Parse output like "INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.\nINFO  [alembic.runtime.migration] Will assume transactional DDL.\nc2409a51f8d1 (head)"
    match = re.search(r"(\w+) \(head\)", result.stdout)
    if not match:
        print("Could not determine current revision. Make sure database is up to date.")
        sys.exit(1)
    return match.group(1)


def backup_current_migrations():
    """Backup current migration files."""
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    backup_path = BACKUP_DIR / f"versions_backup_{timestamp}"
    print(f"Backing up current migrations to {backup_path}")
    shutil.copytree(VERSIONS_DIR, backup_path)
    return backup_path


def create_squashed_migration(dry_run=False):
    """Create a squashed migration file that captures current state."""
    # 1. Backup current migrations
    backup_path = backup_current_migrations()
    
    # 2. Set up for squashing
    timestamp = datetime.now().strftime("%Y%m%d")
    rev_id = f"squashed_{timestamp}"
    message = "squashed_migrations"
    
    print(f"\n{'-'*80}")
    print("MIGRATION SQUASHING PROCESS")
    print(f"{'-'*80}")
    print(f"1. Current migrations backed up to: {backup_path}")
    
    if dry_run:
        print("\nDRY RUN: Would execute the following steps:")
        print("2. Create temporary clean database")
        print("3. Generate new squashed migration")
        print("4. Replace existing migrations with squashed migration")
        print("\nTo proceed with actual squashing, run without --dry-run")
        return
    
    # 3. Create a new squashed migration
    try:
        # Create a new baseline migration
        print("\n2. Creating new squashed migration...")
        result = subprocess.run(
            [
                "alembic", "revision", "--autogenerate",
                "--rev-id", rev_id,
                "-m", message
            ],
            cwd=BASE_DIR,
            capture_output=True,
            text=True,
        )
        
        if result.returncode != 0:
            print(f"Error creating squashed migration: {result.stderr}")
            print(f"Original migrations have been backed up to {backup_path}")
            sys.exit(1)
            
        print(f"3. Successfully created squashed migration with ID: {rev_id}")
        
        # 4. Clean up old migrations
        new_migration_file = None
        for file in VERSIONS_DIR.glob(f"*{rev_id}*.py"):
            new_migration_file = file
            break
            
        if not new_migration_file:
            print("Could not find newly created migration file.")
            sys.exit(1)
            
        # Move to a temporary location
        temp_file = VERSIONS_DIR / f"TEMP_{new_migration_file.name}"
        shutil.move(new_migration_file, temp_file)
        
        # Remove old migration files
        for file in VERSIONS_DIR.glob("*.py"):
            if file.name.startswith("TEMP_"):
                continue
            os.remove(file)
            
        # Move new file back
        final_file = VERSIONS_DIR / new_migration_file.name
        shutil.move(temp_file, final_file)
        
        print(f"4. Replaced old migrations with new squashed migration: {final_file.name}")
        print(f"\n{'-'*80}")
        print("MIGRATION SQUASHING COMPLETED SUCCESSFULLY")
        print(f"{'-'*80}")
        print(f"Original migrations backed up to: {backup_path}")
        print(f"New squashed migration: {final_file}")
        print("\nNext steps:")
        print("1. Review the new migration file to ensure it's correct")
        print("2. Run tests to verify functionality")
        print("3. Apply the migration to a clean development database to verify")
        print("4. Commit the changes")
        
    except Exception as e:
        print(f"Error during squashing: {str(e)}")
        print(f"Original migrations have been backed up to {backup_path}")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description="Squash multiple Alembic migrations into a single migration file"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would happen without making changes"
    )
    args = parser.parse_args()
    
    create_squashed_migration(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
