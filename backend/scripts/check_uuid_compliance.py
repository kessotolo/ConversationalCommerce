#!/usr/bin/env python3
"""
UUID Compliance Checker for ConversationalCommerce

This script scans all database models to ensure they follow our UUID standards:
1. All primary keys must be UUIDs
2. All foreign keys must be UUIDs
3. All tenant-scoped models must have tenant_id
4. Proper imports are used

Usage:
    python scripts/check_uuid_compliance.py
"""

import os
import re
import sys
from pathlib import Path
from typing import List, Dict, Tuple


class UUIDComplianceChecker:
    def __init__(self, models_dir: str = "backend/app/models"):
        self.models_dir = Path(models_dir)
        self.errors: List[str] = []
        self.warnings: List[str] = []

    def check_file(self, file_path: Path) -> Dict[str, List[str]]:
        """Check a single Python file for UUID compliance."""
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        file_errors = []
        file_warnings = []

        # Check for proper UUID imports - be more flexible
        has_uuid_import = (
            'from sqlalchemy.dialects.postgresql import UUID' in content or
            'from sqlalchemy.dialects.postgresql import' in content and 'UUID' in content or
            'UUID as PostgresUUID' in content
        )

        if 'UUID' in content and not has_uuid_import:
            file_errors.append(f"Missing proper UUID import")

        if 'uuid.uuid4' in content and 'import uuid' not in content:
            file_errors.append(f"Missing uuid import")

        # Check for Integer primary keys (should be UUIDs)
        integer_pk_pattern = r'id\s*=\s*Column\s*\(\s*Integer.*primary_key\s*=\s*True'
        if re.search(integer_pk_pattern, content, re.IGNORECASE):
            file_errors.append(f"Found Integer primary key - should be UUID")

        # Check for String primary keys (usually should be UUIDs)
        string_pk_pattern = r'id\s*=\s*Column\s*\(\s*String.*primary_key\s*=\s*True'
        if re.search(string_pk_pattern, content, re.IGNORECASE):
            file_warnings.append(
                f"Found String primary key - consider UUID unless justified")

        # Check for proper UUID primary key pattern - be more flexible
        uuid_pk_patterns = [
            r'id\s*=\s*Column\s*\(\s*UUID\s*\(\s*as_uuid\s*=\s*True\s*\)\s*,\s*primary_key\s*=\s*True\s*,\s*default\s*=\s*uuid\.uuid4',
            r'id\s*=\s*Column\s*\(\s*PostgresUUID\s*\(\s*as_uuid\s*=\s*True\s*\)\s*,\s*primary_key\s*=\s*True\s*,\s*default\s*=\s*uuid\.uuid4'
        ]

        has_uuid_pk = any(re.search(pattern, content, re.IGNORECASE)
                          for pattern in uuid_pk_patterns)

        # Check if this is a model file (contains SQLAlchemy Base)
        is_model_file = ('class' in content and
                         ('Base' in content or '__tablename__' in content) and
                         'primary_key=True' in content)

        if is_model_file and not has_uuid_pk and 'AdminUser' not in content:
            # AdminUser is exception (uses Clerk string ID)
            file_errors.append(
                f"Model missing proper UUID primary key pattern")

        # Check for Integer foreign keys to tenants/users
        integer_fk_pattern = r'Column\s*\(\s*Integer.*ForeignKey\s*\(\s*["\'](?:tenants|users)\.id["\']'
        if re.search(integer_fk_pattern, content, re.IGNORECASE):
            file_errors.append(
                f"Found Integer foreign key to tenants/users - should be UUID")

        # Check for tenant_id in tenant-scoped models
        if is_model_file and '__tablename__' in content:
            # Extract table name
            table_match = re.search(
                r'__tablename__\s*=\s*["\']([^"\']+)["\']', content)
            if table_match:
                table_name = table_match.group(1)

                # Skip global/system tables that don't need tenant_id
                global_tables = {
                    'tenants', 'admin_users', 'admin_roles', 'admin_permissions',
                    'feature_flags', 'system_settings'
                }

                if table_name not in global_tables and 'tenant_id' not in content:
                    file_warnings.append(
                        f"Table '{table_name}' may need tenant_id for multi-tenant isolation")

        return {
            'errors': file_errors,
            'warnings': file_warnings
        }

    def check_all_models(self) -> None:
        """Check all Python files in the models directory."""
        if not self.models_dir.exists():
            print(f"Models directory not found: {self.models_dir}")
            return

        total_files = 0
        error_files = 0

        for py_file in self.models_dir.rglob("*.py"):
            if py_file.name == "__init__.py":
                continue

            total_files += 1
            result = self.check_file(py_file)

            # Use relative path from current working directory
            try:
                relative_path = py_file.relative_to(Path.cwd())
            except ValueError:
                # Fallback to absolute path if relative doesn't work
                relative_path = py_file

            if result['errors']:
                error_files += 1
                print(f"\n❌ {relative_path}")
                for error in result['errors']:
                    print(f"   ERROR: {error}")

            if result['warnings']:
                print(f"\n⚠️  {relative_path}")
                for warning in result['warnings']:
                    print(f"   WARNING: {warning}")

            self.errors.extend(
                [f"{relative_path}: {error}" for error in result['errors']])
            self.warnings.extend(
                [f"{relative_path}: {warning}" for warning in result['warnings']])

        # Summary
        print(f"\n{'='*60}")
        print(f"UUID Compliance Check Summary")
        print(f"{'='*60}")
        print(f"Files checked: {total_files}")
        print(f"Files with errors: {error_files}")
        print(f"Total errors: {len(self.errors)}")
        print(f"Total warnings: {len(self.warnings)}")

        if self.errors:
            print(f"\n🚨 ERRORS FOUND - These must be fixed:")
            for error in self.errors:
                print(f"   • {error}")

        if self.warnings:
            print(f"\n⚠️  WARNINGS - Please review:")
            for warning in self.warnings:
                print(f"   • {warning}")

        if not self.errors and not self.warnings:
            print(f"\n✅ All models are UUID compliant!")

        return len(self.errors) == 0


def main():
    """Main entry point."""
    checker = UUIDComplianceChecker()

    print("🔍 Checking UUID compliance across database models...")
    print("=" * 60)

    success = checker.check_all_models()

    if not success:
        print(f"\n❌ UUID compliance check failed!")
        print(f"Please fix the errors above and run again.")
        sys.exit(1)
    else:
        print(f"\n✅ UUID compliance check passed!")
        sys.exit(0)


if __name__ == "__main__":
    main()
