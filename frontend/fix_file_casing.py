#!/usr/bin/env python3
import os
import re
import sys
from pathlib import Path
from typing import Dict, List, Set, Tuple

# Define naming conventions based on file type and location
def should_be_pascal_case(file_path: str) -> bool:
    # React components in src/components/ and type definitions
    return (
        "/src/components/" in file_path or 
        file_path.endswith(".d.ts") or
        (file_path.endswith(".tsx") and not "/app/" in file_path) or
        (file_path.endswith(".ts") and "types" in file_path.lower())
    )

def should_be_camel_case(file_path: str) -> bool:
    # Utils, lib, hooks
    return (
        "/utils/" in file_path or
        "/lib/" in file_path or
        "/hooks/" in file_path or
        (file_path.endswith(".ts") and not file_path.endswith(".d.ts") and "types" not in file_path.lower())
    )

def should_be_lowercase(file_path: str) -> bool:
    # Next.js pages and layouts in app directory
    return "/app/" in file_path

def should_be_kebab_case(file_path: str) -> bool:
    # Configuration files
    config_files = [".eslintrc", ".prettierrc", "tsconfig", "package.json", "next.config"]
    return any(config_name in file_path for config_name in config_files)

def to_pascal_case(name: str) -> str:
    # Convert to PascalCase: my-component.tsx -> MyComponent.tsx
    name_without_ext, ext = os.path.splitext(name)
    if '-' in name_without_ext or '_' in name_without_ext:
        words = re.split(r'[-_]', name_without_ext)
        return ''.join(word.capitalize() for word in words) + ext
    else:
        return name_without_ext[0].upper() + name_without_ext[1:] + ext

def to_camel_case(name: str) -> str:
    # Convert to camelCase: my-util.ts -> myUtil.ts
    name_without_ext, ext = os.path.splitext(name)
    if '-' in name_without_ext or '_' in name_without_ext:
        words = re.split(r'[-_]', name_without_ext)
        return words[0].lower() + ''.join(word.capitalize() for word in words[1:]) + ext
    else:
        return name_without_ext[0].lower() + name_without_ext[1:] + ext

def to_lowercase(name: str) -> str:
    # Convert to lowercase: Page.tsx -> page.tsx
    return name.lower()

def to_kebab_case(name: str) -> str:
    # Convert to kebab-case: configFile.js -> config-file.js
    name_without_ext, ext = os.path.splitext(name)
    # Insert hyphen before capital letters and convert to lowercase
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1-\2', name_without_ext)
    kebab = re.sub('([a-z0-9])([A-Z])', r'\1-\2', s1).lower()
    return kebab + ext

def get_correct_case(file_path: str) -> str:
    file_name = os.path.basename(file_path)
    
    if should_be_pascal_case(file_path):
        return to_pascal_case(file_name)
    elif should_be_camel_case(file_path):
        return to_camel_case(file_name)
    elif should_be_lowercase(file_path):
        return to_lowercase(file_name)
    elif should_be_kebab_case(file_path):
        return to_kebab_case(file_name)
    else:
        # Keep as is for files we don't have specific rules for
        return file_name

def find_files_with_wrong_casing(root_dir: str) -> Dict[str, str]:
    wrong_casing_files = {}
    
    # Files to ignore (node_modules, build outputs, etc.)
    ignore_dirs = ['node_modules', '.next', 'out', 'dist', '.git']
    
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Skip ignored directories
        dirnames[:] = [d for d in dirnames if d not in ignore_dirs]
        
        for filename in filenames:
            file_path = os.path.join(dirpath, filename)
            correct_filename = get_correct_case(file_path)
            
            if filename != correct_filename:
                wrong_casing_files[file_path] = os.path.join(dirpath, correct_filename)
    
    return wrong_casing_files

def generate_rename_commands(files_to_rename: Dict[str, str]) -> List[str]:
    commands = []
    
    for old_path, new_path in files_to_rename.items():
        # Use temporary name to handle case-insensitive file systems
        file_dir = os.path.dirname(old_path)
        temp_name = f"{os.path.basename(old_path)}.temp_{os.getpid()}"
        temp_path = os.path.join(file_dir, temp_name)
        
        # Two-step rename: original → temp → new
        commands.append(f"mv '{old_path}' '{temp_path}'")
        commands.append(f"mv '{temp_path}' '{new_path}'")
        
        # Fix imports in all files
        old_import_path = old_path.replace("'", "\\'")
        new_import_path = os.path.basename(new_path)
        commands.append(f"# Update imports for {old_path} → {new_path}")
        # Find all files that import this file and update them
        # This grep command finds imports that use the wrong filename
        commands.append(f"grep -l '{os.path.basename(old_path)}' $(find . -type f -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' | grep -v 'node_modules') | xargs -I {{}} sed -i '' 's|{os.path.basename(old_path)}|{new_import_path}|g' {{}}")
    
    return commands

def main():
    project_dir = os.getcwd()
    print(f"Scanning directory: {project_dir}")
    
    # Find files with wrong casing
    files_to_rename = find_files_with_wrong_casing(project_dir)
    
    if not files_to_rename:
        print("No files found with incorrect casing!")
        return
    
    print(f"Found {len(files_to_rename)} files with incorrect casing:")
    for old_path, new_path in files_to_rename.items():
        print(f"  {os.path.basename(old_path)} → {os.path.basename(new_path)}")
    
    # Generate rename commands
    commands = generate_rename_commands(files_to_rename)
    
    # Write commands to shell script
    script_path = os.path.join(project_dir, "rename_files.sh")
    with open(script_path, "w") as f:
        f.write("#!/bin/bash\n\n")
        f.write("# Script to rename files with incorrect casing\n")
        f.write("# Generated by fix_file_casing.py\n\n")
        f.write("set -e\n\n")
        f.write("# Renaming files\n")
        for cmd in commands:
            f.write(f"{cmd}\n")
        f.write("\necho 'File renaming completed!'\n")
    
    os.chmod(script_path, 0o755)  # Make script executable
    
    print(f"\nGenerated rename script: {script_path}")
    print("Review the script and run it to rename the files.")
    print("After renaming, try running TypeScript compilation again.")

if __name__ == "__main__":
    main()

