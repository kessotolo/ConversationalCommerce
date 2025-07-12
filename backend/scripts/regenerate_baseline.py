#!/usr/bin/env python3
"""
Regenerate Baseline Migration

A focused script that creates a fresh baseline migration with proper table ordering.
Makes a backup before modifying anything.
"""

import os
import sys
import importlib
import datetime
import subprocess
import shutil
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
ALEMBIC_DIR = BASE_DIR / "alembic"
VERSIONS_DIR = ALEMBIC_DIR / "versions"

def backup_versions():
    """Create a backup of the versions directory."""
    timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
    backup_dir = ALEMBIC_DIR / f"versions_backup_{timestamp}"
    
    if VERSIONS_DIR.exists():
        print(f"Creating backup at {backup_dir}")
        shutil.copytree(VERSIONS_DIR, backup_dir)
        return backup_dir
    
    return None

def clean_versions():
    """Remove existing migration files."""
    if not VERSIONS_DIR.exists():
        os.makedirs(VERSIONS_DIR)
        return

    count = 0
    for file in VERSIONS_DIR.glob("*.py"):
        file.unlink()
        count += 1
    
    print(f"Removed {count} migration files")
    
    # Ensure __init__.py exists
    init_file = VERSIONS_DIR / "__init__.py"
    if not init_file.exists():
        with open(init_file, 'w') as f:
            f.write("")

def import_models():
    """Import all models to ensure SQLAlchemy metadata is complete."""
    # Import base class first
    from backend.app.db.base_class import Base
    
    # Import critical models explicitly
    print("Loading models...")
    
    # User model
    try:
        from backend.app.models.user import User
        print("✓ User model loaded")
    except ImportError as e:
        print(f"✗ Error loading User model: {e}")
    
    # Customer model
    try:
        from backend.app.models.customer import Customer
        print("✓ Customer model loaded")
    except ImportError as e:
        print(f"✗ Error loading Customer model: {e}")
    
    # Tenant model (critical for most FKs)
    try:
        from backend.app.models.tenant import Tenant
        print("✓ Tenant model loaded")
    except ImportError as e:
        print(f"✗ Error loading Tenant model: {e}")
    
    # Product model (referenced by order items)
    try:
        from backend.app.models.product import Product
        print("✓ Product model loaded")
    except ImportError as e:
        print(f"✗ Error loading Product model: {e}")

def generate_migration():
    """Generate a new baseline migration."""
    # Change to project directory
    os.chdir(BASE_DIR)
    
    print("\nGenerating new baseline migration...")
    cmd = ["alembic", "revision", "--autogenerate", "-m", "clean_baseline"]
    
    try:
        result = subprocess.run(cmd, check=True, text=True, capture_output=True)
        print(result.stdout)
        
        # Find the new migration file
        files = list(VERSIONS_DIR.glob("*.py"))
        if files:
            newest = max(files, key=lambda f: f.stat().st_mtime)
            print(f"✓ Created migration: {newest.name}")
            return newest
    except subprocess.CalledProcessError as e:
        print(f"✗ Error: {e.stderr}")
        return None

def main():
    # Check for dry run
    dry_run = "--dry-run" in sys.argv
    if dry_run:
        print("DRY RUN MODE - No changes will be made")
    
    if not dry_run:
        # Backup existing versions
        backup = backup_versions()
        if backup:
            print(f"Created backup at {backup}")
        
        # Clean versions directory
        clean_versions()
    
    # Import all models
    import_models()
    
    if not dry_run:
        # Generate new migration
        migration = generate_migration()
        if migration:
            print(f"\nSuccess! New baseline migration created: {migration.name}")
            print("Run 'python scripts/analyze_migration_deps.py' to verify dependencies")
        else:
            print("\nFailed to create baseline migration")
    else:
        print("\nDRY RUN: Would have generated new baseline migration")

if __name__ == "__main__":
    main()
