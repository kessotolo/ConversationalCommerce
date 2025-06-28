#!/usr/bin/env python3
"""
Migration Dependency Analyzer

A simple tool to analyze table dependencies in Alembic migrations.
Prints tables in creation order and identifies any dependency issues.
"""

import re
from pathlib import Path
from collections import defaultdict

# Configuration
BASE_DIR = Path(__file__).resolve().parent.parent
MIGRATIONS_DIR = BASE_DIR / "alembic" / "versions"

def find_baseline_migration():
    """Find the baseline migration file."""
    baseline_files = list(MIGRATIONS_DIR.glob("*baseline*.py"))
    if not baseline_files:
        print("❌ No baseline migration file found")
        return None
            
    print(f"✅ Found baseline migration: {baseline_files[0].name}")
    return baseline_files[0]
    
def extract_table_creation_order(file_path):
    """Extract table creation order from a migration file."""
    with open(file_path, 'r') as f:
        content = f.read()
            
    # Find all table creations
    pattern = r"op\.create_table\('([^']+)'"
    tables = re.findall(pattern, content)
    return tables

def extract_foreign_keys(file_path):
    """Extract foreign key relationships from a migration file."""
    dependencies = defaultdict(list)
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Find all foreign key constraints in create_table statements
    table_pattern = r"op\.create_table\('([^']+)',(.*?)(?:sa\.PrimaryKeyConstraint|op\.create_)"
    for table_match in re.finditer(table_pattern, content, re.DOTALL):
        table_name = table_match.group(1)
        table_content = table_match.group(2)
        
        # Find foreign keys in this table
        fk_pattern = r"sa\.ForeignKeyConstraint\(\[[^\]]+\], \['([^']+)\.([^']+)'\]"
        for fk_match in re.finditer(fk_pattern, table_content):
            target_table = fk_match.group(1)
            target_column = fk_match.group(2)
            dependencies[table_name].append(target_table)
    
    return dependencies

def analyze_dependencies(tables, dependencies):
    """Check if tables are created in the right dependency order."""
    issues = []
    for table, deps in dependencies.items():
        for dep in deps:
            if table in tables and dep in tables:
                if tables.index(table) < tables.index(dep):
                    issues.append(f"❌ {table} is created before its dependency {dep}")
    return issues

def main():
    print("Migration Dependency Analyzer")
    print("=============================")
    
    # Find baseline migration
    baseline = find_baseline_migration()
    if not baseline:
        return
    
    # Extract table creation order
    tables = extract_table_creation_order(baseline)
    print(f"\nFound {len(tables)} tables in creation order:")
    for i, table in enumerate(tables, 1):
        print(f"  {i}. {table}")
    
    # Extract foreign keys
    dependencies = extract_foreign_keys(baseline)
    print(f"\nFound {len(dependencies)} tables with dependencies:")
    for table, deps in sorted(dependencies.items()):
        if deps:
            print(f"  - {table} depends on: {', '.join(deps)}")
    
    # Check for ordering issues
    issues = analyze_dependencies(tables, dependencies)
    if issues:
        print(f"\nFound {len(issues)} dependency order issues:")
        for issue in issues:
            print(f"  {issue}")
    else:
        print("\n✅ No dependency order issues found!")

if __name__ == "__main__":
    main()
