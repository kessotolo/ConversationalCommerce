#!/usr/bin/env python3
"""
Script to modernize app.app imports to app imports across the backend.
"""

import os
import re
import sys
from pathlib import Path


def fix_imports_in_file(file_path):
    """Fix imports in a single file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Track if we made changes
        original_content = content

        # Replace app.app imports with app imports
        # This regex handles various import patterns:
        # - from app.module import ...
        # - import app.module
        # - from app.module.submodule import ...

        # Pattern 1: from app.module import ...
        content = re.sub(r'from\s+app\.app\.', 'from app.', content)

        # Pattern 2: import app.module
        content = re.sub(r'import\s+app\.app\.', 'import app.', content)

        # Pattern 3: from app.module.submodule import ...
        # (handled by pattern 1)

        # Check if we made changes
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False

    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False


def main():
    """Main function to process all Python files."""
    backend_dir = Path('.')

    # Find all Python files
    python_files = list(backend_dir.rglob('*.py'))

    print(f"Found {len(python_files)} Python files")

    # Process each file
    changed_files = []
    for file_path in python_files:
        if fix_imports_in_file(file_path):
            changed_files.append(file_path)
            print(f"Fixed imports in: {file_path}")

    print(f"\nSummary:")
    print(f"Total files processed: {len(python_files)}")
    print(f"Files changed: {len(changed_files)}")

    if changed_files:
        print(f"\nChanged files:")
        for file_path in changed_files:
            print(f"  - {file_path}")

    return len(changed_files)


if __name__ == '__main__':
    changed_count = main()
    sys.exit(0 if changed_count >= 0 else 1)
