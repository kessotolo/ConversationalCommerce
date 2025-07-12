#!/usr/bin/env python3
"""
Regenerate Clean Baseline Migration

This script generates a fresh, clean baseline migration directly from
SQLAlchemy metadata with correct table dependency ordering.

Usage:
    python regenerate_clean_baseline.py [--dry-run]

Options:
    --dry-run    Only show what would be done without making changes
"""

import os
import sys
import importlib
import datetime
import subprocess
import shutil
from pathlib import Path

# Path setup
BASE_DIR = Path(__file__).resolve().parent.parent
ALEMBIC_DIR = BASE_DIR / "alembic"
VERSIONS_DIR = ALEMBIC_DIR / "versions"
MODELS_DIR = BASE_DIR / "app" / "models"

def import_all_models():
    """Import all model modules to ensure they're registered with metadata."""
    print("Importing all models...")
    # First import the Base class to ensure it's initialized
    from app.db.base_class import Base
    
    # Then dynamically import all model modules
    for model_file in MODELS_DIR.glob("*.py"):
        if model_file.name == "__init__.py":
            continue
        
        module_name = f"app.models.{model_file.stem}"
        try:
            importlib.import_module(module_name)
            print(f"  ✓ Imported {module_name}")
        except ImportError as e:
            print(f"  ✗ Failed to import {module_name}: {e}")
    
    # Import models explicitly to ensure they're loaded
    print("\nEnsuring critical models are loaded...")
    try:
        from app.models.user import User
        print("  ✓ User model loaded")
    except ImportError as e:
        print(f"  ✗ User model not loaded: {e}")
        
    try:
        from app.models.customer import Customer
        print("  ✓ Customer model loaded")
    except ImportError as e:
        print(f"  ✗ Customer model not loaded: {e}")

def backup_versions_directory():
    """Create a backup of the current versions directory."""
    timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
    backup_dir = ALEMBIC_DIR / f"versions_backup_{timestamp}"
    
    print(f"Creating backup of versions directory: {backup_dir}")
    if VERSIONS_DIR.exists():
        shutil.copytree(VERSIONS_DIR, backup_dir)
        print(f"  ✓ Backup created at {backup_dir}")
        return backup_dir
    else:
        print("  ✗ Versions directory not found, no backup created")
        return None

def clean_versions_directory():
    """Remove all existing migration scripts."""
    if not VERSIONS_DIR.exists():
        os.makedirs(VERSIONS_DIR)
        print(f"Created new versions directory: {VERSIONS_DIR}")
        return
    
    print("Removing existing migration files...")
    migration_count = 0
    for migration_file in VERSIONS_DIR.glob("*.py"):
        migration_file.unlink()
        migration_count += 1
        
    print(f"  ✓ Removed {migration_count} migration files")

def create_empty_init_file():
    """Create an empty __init__.py file in the versions directory."""
    init_file = VERSIONS_DIR / "__init__.py"
    if not init_file.exists():
        with open(init_file, 'w') as f:
            f.write("# This file enables Python to recognize this directory as a package\n")
        print(f"  ✓ Created {init_file}")

def generate_baseline_migration():
    """Generate a new baseline migration using alembic."""
    print("\nGenerating new baseline migration...")
    
    # Change to the project directory to ensure imports work
    os.chdir(BASE_DIR)
    
    # Run the alembic command
    cmd = ["alembic", "revision", "--autogenerate", "-m", "clean_baseline"]
    print(f"Running: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(
            cmd, 
            check=True, 
            text=True, 
            capture_output=True
        )
        print(result.stdout)
        if result.stderr:
            print(f"Warnings/Errors:\n{result.stderr}")
        
        # Find the newly created migration file
        migration_files = list(VERSIONS_DIR.glob("*.py"))
        if migration_files:
            newest_migration = max(migration_files, key=lambda f: f.stat().st_mtime)
            print(f"  ✓ Created new baseline migration: {newest_migration.name}")
            return newest_migration
        else:
            print("  ✗ Failed to find newly created migration file")
            return None
    except subprocess.CalledProcessError as e:
        print(f"  ✗ Error generating migration: {e}")
        print(f"Output: {e.stdout}")
        print(f"Error: {e.stderr}")
        return None

def verify_migration_order(migration_file):
    """Verify the table creation order in the generated migration."""
    if not migration_file or not migration_file.exists():
        print("  ✗ No migration file provided for verification")
        return False
    
    print(f"\nVerifying table creation order in {migration_file.name}...")
    
    # Read the migration file
    with open(migration_file, 'r') as f:
        content = f.read()
    
    # Check if critical tables are present
    critical_tables = ['users', 'customers', 'tenants']
    missing_tables = []
    
    for table in critical_tables:
        if f"op.create_table('{table}'" not in content:
            missing_tables.append(table)
    
    if missing_tables:
        print(f"  ✗ Missing critical tables: {', '.join(missing_tables)}")
        return False
    
    # Extract table creation order
    import re
    table_creations = re.findall(r"op\.create_table\('([^']+)'", content)
    
    print("Table creation order:")
    for idx, table in enumerate(table_creations, 1):
        print(f"  {idx}. {table}")
    
    # Check for common dependencies
    dependencies = {
        'cart_items': ['carts', 'products'],
        'saved_payment_methods': ['customers'],
        'ai_config': ['users', 'tenants'],
        'audit_logs': ['users', 'tenants'],
        'storefront_configs': ['users', 'tenants'],
        'storefront_permissions': ['users', 'tenants'],
    }
    
    order_issues = []
    for table, deps in dependencies.items():
        if table in table_creations:
            table_pos = table_creations.index(table)
            for dep in deps:
                if dep in table_creations:
                    dep_pos = table_creations.index(dep)
                    if dep_pos > table_pos:
                        order_issues.append(f"Table '{table}' is created before its dependency '{dep}'")
    
    if order_issues:
        print("\nOrder issues found:")
        for issue in order_issues:
            print(f"  ✗ {issue}")
        return False
    else:
        print("  ✓ No table order issues found")
        return True

def main():
    """Main function."""
    # Check for dry run mode
    dry_run = "--dry-run" in sys.argv
    if dry_run:
        print("DRY RUN MODE: No changes will be made\n")
    
    # Import all models to ensure SQLAlchemy metadata is complete
    import_all_models()
    
    if dry_run:
        print("\nDRY RUN: Would create backup of versions directory")
        print("DRY RUN: Would clean versions directory")
        print("DRY RUN: Would create empty __init__.py file")
        print("DRY RUN: Would generate new baseline migration")
        return
    
    # Create backup of versions directory
    backup_dir = backup_versions_directory()
    
    # Clean versions directory
    clean_versions_directory()
    
    # Create empty __init__.py file
    create_empty_init_file()
    
    # Generate new baseline migration
    migration_file = generate_baseline_migration()
    
    # Verify migration order
    if migration_file:
        is_valid = verify_migration_order(migration_file)
        if is_valid:
            print("\n✅ Successfully generated a clean baseline migration with proper table ordering!")
            print(f"Migration file: {migration_file}")
        else:
            print("\n❌ Generated baseline migration has order issues.")
            print("Please review and fix manually or restore the backup.")
            print(f"Backup directory: {backup_dir}")
    else:
        print("\n❌ Failed to generate baseline migration.")
        print("Please check the errors above or restore the backup.")
        print(f"Backup directory: {backup_dir}")

if __name__ == "__main__":
    main()
