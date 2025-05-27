#!/usr/bin/env python3
"""
Script to fix the data type mismatches in our models
"""
import os
import re

# Models with String tenant_id fields that need to be updated to UUID
model_files = [
    '../app/models/content_filter.py',
    '../app/models/behavior_analysis.py',
    '../app/models/violation.py'
]

# Pattern to match tenant_id field defined as String
pattern = r'tenant_id\s*=\s*Column\(String,\s*ForeignKey\("tenants.id"\),\s*nullable=False\)'
replacement = 'tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)'

# Pattern to match id field defined as String with lambda
id_pattern = r'id\s*=\s*Column\(String,\s*primary_key=True,\s*default=lambda:\s*str\(uuid\.uuid4\(\)\)\)'
id_replacement = 'id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))'

# Pattern to ensure we have the UUID import
import_pattern = r'from sqlalchemy\.dialects\.postgresql import UUID'

for file_path in model_files:
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Check if UUID import is already there
    if 'from sqlalchemy.dialects.postgresql import UUID' not in content:
        # Add import after sqlalchemy imports
        content = re.sub(
            r'(from sqlalchemy.*?\n)',
            r'\1from sqlalchemy.dialects.postgresql import UUID\n',
            content,
            count=1
        )
    
    # Replace tenant_id definition
    content = re.sub(pattern, replacement, content)
    
    # Other specific field replacements as needed
    if 'violation.py' in file_path:
        # Fix user_id and detection_id fields in violation.py if they're wrong
        content = re.sub(
            r'user_id\s*=\s*Column\(String,\s*ForeignKey\("users.id"\),\s*nullable=True\)',
            'user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)',
            content
        )
        content = re.sub(
            r'detection_id\s*=\s*Column\(String,\s*ForeignKey\("pattern_detections.id"\),\s*nullable=True\)',
            'detection_id = Column(String, ForeignKey("pattern_detections.id"), nullable=True)',
            content
        )
    
    if 'behavior_analysis.py' in file_path:
        # Fix user_id and reviewed_by fields in behavior_analysis.py if they're wrong
        content = re.sub(
            r'user_id\s*=\s*Column\(String,\s*ForeignKey\("users.id"\),\s*nullable=True\)',
            'user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)',
            content
        )
        content = re.sub(
            r'reviewed_by\s*=\s*Column\(String,\s*ForeignKey\("users.id"\)\)',
            'reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))',
            content
        )
    
    if 'content_filter.py' in file_path:
        # Fix reviewed_by field in content_filter.py if it's wrong
        content = re.sub(
            r'reviewed_by\s*=\s*Column\(String,\s*ForeignKey\("users.id"\)\)',
            'reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))',
            content
        )
    
    # Write the modified content back to the file
    with open(file_path, 'w') as f:
        f.write(content)
    
    print(f"Updated {file_path}")

print("All model files have been updated!")
