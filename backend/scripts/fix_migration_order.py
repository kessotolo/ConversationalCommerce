#!/usr/bin/env python3
"""
Migration Order Checker and Fixer

This script analyzes the baseline migration and model dependencies to ensure
tables are created in the proper order to maintain referential integrity.

Usage:
    python fix_migration_order.py [--analyze]

Options:
    --analyze    Only analyze and report issues without fixing
"""

import os
import sys
import re
import importlib.util
import inspect
from pathlib import Path
from collections import defaultdict

# Configuration
BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / "app" / "models"
MIGRATIONS_DIR = BASE_DIR / "alembic" / "versions"
BASELINE_PATTERN = "*baseline*.py"

class ModelDependencyAnalyzer:
    """Analyzes SQLAlchemy model dependencies."""

    def __init__(self):
        self.models = {}
        self.dependencies = defaultdict(list)
        
    def load_models(self):
        """Load all SQLAlchemy models from the models directory."""
        for file in MODELS_DIR.glob("*.py"):
            if file.name == "__init__.py":
                continue
                
            # Load the module
            module_name = file.stem
            spec = importlib.util.spec_from_file_location(module_name, file)
            module = importlib.util.module_from_spec(spec)
            sys.modules[module_name] = module
            spec.loader.exec_module(module)
            
            # Find SQLAlchemy models
            for name, obj in inspect.getmembers(module):
                # Look for classes that have a __tablename__ attribute
                if inspect.isclass(obj) and hasattr(obj, "__tablename__"):
                    self.models[obj.__tablename__] = obj
        
        return self.models
    
    def analyze_dependencies(self):
        """Analyze foreign key dependencies between models."""
        for table_name, model in self.models.items():
            for column in model.__table__.columns:
                for foreign_key in column.foreign_keys:
                    target_table = foreign_key.column.table.name
                    if target_table != table_name:  # Exclude self-references
                        self.dependencies[table_name].append(target_table)
        
        return self.dependencies

    def get_creation_order(self):
        """Calculate the correct table creation order using topological sort."""
        visited = set()
        temp_visited = set()
        order = []
        
        def visit(table):
            if table in temp_visited:
                raise ValueError(f"Circular dependency detected involving {table}")
            
            if table in visited:
                return
                
            temp_visited.add(table)
            
            # Visit dependencies first
            for dependency in self.dependencies.get(table, []):
                if dependency in self.models:
                    visit(dependency)
            
            temp_visited.remove(table)
            visited.add(table)
            order.append(table)
        
        # Visit all tables
        for table in self.models:
            if table not in visited:
                visit(table)
                
        return order

class MigrationAnalyzer:
    """Analyzes Alembic migration files for table creation order."""
    
    def __init__(self):
        self.baseline_file = None
        self.table_creation_order = []
        
    def find_baseline_migration(self):
        """Find the baseline migration file."""
        baseline_files = list(MIGRATIONS_DIR.glob(BASELINE_PATTERN))
        if not baseline_files:
            raise FileNotFoundError("No baseline migration file found")
            
        self.baseline_file = baseline_files[0]
        return self.baseline_file
    
    def analyze_table_creation_order(self):
        """Extract table creation order from the baseline migration."""
        if not self.baseline_file:
            self.find_baseline_migration()
            
        with open(self.baseline_file, 'r') as f:
            content = f.read()
            
        # Find all table creations
        pattern = r"op\.create_table\('([^']+)'"
        self.table_creation_order = re.findall(pattern, content)
        return self.table_creation_order
    
    def analyze_foreign_keys(self):
        """Extract foreign key relationships from the baseline migration."""
        dependencies = defaultdict(list)
        
        if not self.baseline_file:
            self.find_baseline_migration()
            
        with open(self.baseline_file, 'r') as f:
            content = f.read()
            
        # Find all ForeignKeyConstraint declarations
        pattern = r"sa\.ForeignKeyConstraint\(\['([^']+)'\], \['([^']+)'\]"
        for match in re.finditer(pattern, content):
            source_column = match.group(1)
            target_column = match.group(2)
            
            # Extract table names
            source_table = None
            target_table = target_column.split('.')[0]
            
            # Find which table the source column belongs to
            # This requires context from surrounding code
            
            # For now, simplify by assuming context from nearby create_table
            context_pattern = r"create_table\('([^']+)'[^)]+\)" + \
                              r"[^)]+{0}".format(re.escape(source_column))
            context_match = re.search(context_pattern, content, re.DOTALL)
            if context_match:
                source_table = context_match.group(1)
            
            if source_table and target_table:
                dependencies[source_table].append(target_table)
        
        return dependencies

def main():
    """Main function."""
    # Parse command line arguments
    analyze_only = "--analyze" in sys.argv
    
    print("Migration Order Checker and Fixer")
    print("=================================")
    
    # Load and analyze models
    print("\nLoading SQLAlchemy models...")
    model_analyzer = ModelDependencyAnalyzer()
    models = model_analyzer.load_models()
    print(f"Found {len(models)} models:")
    for table_name in sorted(models.keys()):
        print(f"  - {table_name}")
    
    # Analyze model dependencies
    print("\nAnalyzing model dependencies...")
    dependencies = model_analyzer.analyze_dependencies()
    for table_name, deps in sorted(dependencies.items()):
        if deps:
            print(f"  - {table_name} depends on: {', '.join(deps)}")
    
    # Calculate correct creation order
    print("\nCalculating correct table creation order...")
    try:
        correct_order = model_analyzer.get_creation_order()
        print("Correct order:")
        for i, table in enumerate(correct_order, 1):
            print(f"  {i}. {table}")
    except ValueError as e:
        print(f"Error: {e}")
        return
    
    # Analyze migration file
    print("\nAnalyzing baseline migration...")
    migration_analyzer = MigrationAnalyzer()
    try:
        baseline_file = migration_analyzer.find_baseline_migration()
        print(f"Found baseline migration: {baseline_file.name}")
        
        actual_order = migration_analyzer.analyze_table_creation_order()
        print("Current creation order:")
        for i, table in enumerate(actual_order, 1):
            print(f"  {i}. {table}")
        
        # Compare orders
        print("\nIssues:")
        issues = []
        for table, deps in dependencies.items():
            for dep in deps:
                if table in actual_order and dep in actual_order:
                    if actual_order.index(table) < actual_order.index(dep):
                        issues.append(f"- {table} is created before its dependency {dep}")
        
        if issues:
            print("\n".join(issues))
        else:
            print("No order issues found!")
            
        # Check for missing tables
        missing_tables = []
        for table in correct_order:
            if table not in actual_order:
                missing_tables.append(table)
        
        if missing_tables:
            print("\nMissing tables in migration:")
            for table in missing_tables:
                print(f"  - {table}")
        
        # Tables in migration but not in models
        extra_tables = []
        for table in actual_order:
            if table not in models:
                extra_tables.append(table)
        
        if extra_tables:
            print("\nTables in migration but not in models:")
            for table in extra_tables:
                print(f"  - {table}")
        
    except FileNotFoundError as e:
        print(f"Error: {e}")
        return
    
    # Generate fix recommendations
    if issues or missing_tables:
        print("\nRecommendations:")
        print("1. Create a new migration script to fix the order issues.")
        print("2. For missing tables, ensure they are created before their dependencies.")
        print("3. Follow this order for creating tables in future migrations:")
        for i, table in enumerate(correct_order, 1):
            print(f"  {i}. {table}")
            
        if not analyze_only:
            print("\nFixed order implementation will be added in a future version.")
            # In a real implementation, we would update the migration file here
    
if __name__ == "__main__":
    main()
