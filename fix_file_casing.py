#!/usr/bin/env python3
"""
File Casing Normalization Script

This script scans a project directory to identify files with incorrect casing
based on defined conventions and generates a shell script to rename them.

Conventions:
- React components (*.tsx files in components/) -> PascalCase
- Pages and layouts in app/ -> lowercase
- Utility files (in utils/, lib/, hooks/) -> camelCase
- Type definitions -> PascalCase
- Config files -> kebab-case
"""

import os
import re
import sys
from pathlib import Path
from typing import Dict, List, Tuple, Set


def to_pascal_case(name: str) -> str:
    """Convert a filename to PascalCase."""
    # Remove file extension
    name_without_ext = os.path.splitext(name)[0]
    
    # Split by non-alphanumeric characters
    parts = re.split(r'[^a-zA-Z0-9]', name_without_ext)
    
    # Capitalize each part and join
    pascal = ''.join(part.capitalize() for part in parts if part)
    
    # Add extension back
    ext = os.path.splitext(name)[1]
    return pascal + ext


def to_camel_case(name: str) -> str:
    """Convert a filename to camelCase."""
    # Convert to PascalCase first
    pascal = to_pascal_case(name)
    
    # Make the first character lowercase
    if pascal:
        camel = pascal[0].lower() + pascal[1:]
        return camel
    return pascal


def to_kebab_case(name: str) -> str:
    """Convert a filename to kebab-case."""
    # Remove file extension
    name_without_ext = os.path.splitext(name)[0]
    
    # Split by non-alphanumeric characters
    parts = re.split(r'[^a-zA-Z0-9]', name_without_ext)
    
    # Convert to lowercase and join with hyphens
    kebab = '-'.join(part.lower() for part in parts if part)
    
    # Add extension back
    ext = os.path.splitext(name)[1]
    return kebab + ext


def to_lowercase(name: str) -> str:
    """Convert a filename to lowercase."""
    return name.lower()


def determine_correct_casing(file_path: str, filename: str) -> str:
    """
    Determine the correct casing for a file based on its location and type.
    
    Args:
        file_path: The full path to the file
        filename: The current filename
        
    Returns:
        The filename with correct casing
    """
    # Components -> PascalCase
    if (('/components/' in file_path or '\\components\\' in file_path) and 
        (filename.endswith('.tsx') or filename.endswith('.jsx'))):
        return to_pascal_case(filename)
    
    # Pages and layouts in app/ -> lowercase
    if (('/app/' in file_path or '\\app\\' in file_path) and
        (filename == 'page.tsx' or filename == 'layout.tsx')):
        return to_lowercase(filename)
    
    # Utility files -> camelCase
    if any(pattern in file_path for pattern in ['/utils/', '/lib/', '/hooks/', 
                                               '\\utils\\', '\\lib\\', '\\hooks\\']):
        return to_camel_case(filename)
    
    # Type definitions -> PascalCase
    if filename.endswith('.d.ts') or 'types' in file_path:
        return to_pascal_case(filename)
    
    # Config files -> kebab-case
    if filename.startswith('.') or any(filename.endswith(ext) for ext in 
                                    ['.config.js', '.config.ts', '.json']):
        return to_kebab_case(filename)
    
    # Default behavior - don't change
    return filename


def scan_directory(root_dir: str, ignore_dirs: Set[str]) -> List[Tuple[str, str, str]]:
    """
    Scan directory recursively to find files that need renaming.
    
    Args:
        root_dir: The root directory to scan
        ignore_dirs: Set of directory names to ignore
        
    Returns:
        List of tuples (full_path, current_name, corrected_name)
    """
    files_to_rename = []
    
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Skip ignored directories
        dirnames[:] = [d for d in dirnames if d not in ignore_dirs]
        
        for filename in filenames:
            # Skip hidden files that aren't config files
            if filename.startswith('.') and not any(filename.endswith(ext) for ext in 
                                                ['.json', '.js', '.ts']):
                continue
                
            full_path = os.path.join(dirpath, filename)
            correct_name = determine_correct_casing(full_path, filename)
            
            if correct_name != filename:
                files_to_rename.append((full_path, filename, correct_name))
    
    return files_to_rename


def generate_rename_commands(files_to_rename: List[Tuple[str, str, str]]) -> List[str]:
    """
    Generate shell commands to rename files.
    
    Args:
        files_to_rename: List of tuples (full_path, current_name, corrected_name)
        
    Returns:
        List of shell commands
    """
    commands = []
    
    for full_path, current_name, correct_name in files_to_rename:
        dir_path = os.path.dirname(full_path)
        
        # Use a temporary name to avoid case-insensitive filesystem issues
        temp_name = f"{current_name}.tmp.rename"
        
        # Command to rename to temporary name
        commands.append(f'# Rename: {current_name} -> {correct_name}')
        commands.append(f'if [ -f "{full_path}" ] && [ ! -f "{os.path.join(dir_path, temp_name)}" ]; then')
        commands.append(f'  mv "{full_path}" "{os.path.join(dir_path, temp_name)}"')
        
        # Command to rename from temporary name to correct name
        commands.append(f'  mv "{os.path.join(dir_path, temp_name)}" "{os.path.join(dir_path, correct_name)}"')
        commands.append(f'  echo "Renamed: {full_path} -> {os.path.join(dir_path, correct_name)}"')
        commands.append('else')
        commands.append(f'  echo "Error: Could not rename {full_path}"')
        commands.append('fi')
        commands.append('')
    
    return commands


def main():
    # Directory to scan (default to frontend directory)
    root_dir = os.path.join(os.getcwd(), 'frontend')
    
    # Check if directory exists
    if not os.path.isdir(root_dir):
        print(f"Error: Directory {root_dir} does not exist")
        # Try current directory
        root_dir = os.getcwd()
        if not os.path.isdir(root_dir):
            print(f"Error: Current directory {root_dir} is not valid")
            sys.exit(1)
    
    # Directories to ignore
    ignore_dirs = {'node_modules', '.git', 'dist', 'build', '.next', 'out'}
    
    # Scan directory
    print(f"Scanning directory: {root_dir}")
    files_to_rename = scan_directory(root_dir, ignore_dirs)
    
    if not files_to_rename:
        print("No files need renaming")
        sys.exit(0)
    
    # Generate rename commands
    print(f"Found {len(files_to_rename)} files that need renaming")
    commands = generate_rename_commands(files_to_rename)
    
    # Output commands to a shell script
    output_file = "rename_files.sh"
    with open(output_file, 'w') as f:
        f.write("#!/bin/bash\n\n")
        f.write("# Script to rename files with incorrect casing\n")
        f.write(f"# Generated by {os.path.basename(__file__)}\n")
        f.write("# WARNING: Back up your files before running this script\n\n")
        
        f.write("# Files to rename:\n")
        for full_path, current_name, correct_name in files_to_rename:
            f.write(f"# {full_path} -> {correct_name}\n")
        f.write("\n")
        
        f.write("# Execute renaming\n")
        f.write("\n".join(commands))
    
    # Make the script executable
    os.chmod(output_file, 0o755)
    
    print(f"Rename commands have been written to {output_file}")
    print("Review the file carefully before executing!")
    print(f"To execute, run: ./{output_file}")


if __name__ == "__main__":
    main()

