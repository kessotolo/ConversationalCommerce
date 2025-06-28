"""Base SQLAlchemy declarative base class with modern configuration.

This module provides the Base class that all models should inherit from.
It ensures consistent naming conventions and proper handling of circular imports.
"""
# Use the recommended approach for SQLAlchemy 2.0
from sqlalchemy.orm import declarative_base
from sqlalchemy import MetaData

# Create metadata with naming convention for constraints (crucial for migrations)
convention = {
    "ix": "ix_%(column_0_label)s",  # Index naming convention
    "uq": "uq_%(table_name)s_%(column_0_name)s",  # Unique constraint naming
    "ck": "ck_%(table_name)s_%(constraint_name)s",  # Check constraint naming
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",  # Foreign key naming
    "pk": "pk_%(table_name)s"  # Primary key naming
}

# Apply naming convention to metadata
metadata = MetaData(naming_convention=convention)

# Use extend_existing=True to handle duplicate table definitions in circular imports
Base = declarative_base(metadata=metadata, cls=type("Base", (object,), {
    "__abstract__": True,
    "__table_args__": {"extend_existing": True}
}))

# Any model that inherits from Base will automatically use these conventions
# and register itself with the shared metadata
