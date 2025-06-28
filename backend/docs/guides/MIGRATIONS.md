# Database Migration Guidelines

## Overview

This guide documents best practices for managing database migrations in the ConversationalCommerce project. Following these guidelines will help prevent common issues with Alembic migrations and ensure consistent database schema management across development and production environments.

## Core Principles

1. **Zero Technical Debt** - Never use scripts to mask or bypass issues; fix problems at their source
2. **Direct Code Approach** - Implement fixes directly in code or documentation
3. **Single Source of Truth** - Use standardized patterns for all database operations
4. **Standardized Database Driver** - Use asyncpg consistently throughout the codebase

## Database Driver Standardization

To ensure consistency and future-proof our application, we use **asyncpg** as our standard PostgreSQL driver:

```python
# CORRECT - Standard connection URL format
DATABASE_URL = postgresql+asyncpg://user:password@host/dbname

# INCORRECT - Using multiple drivers creates inconsistency
DATABASE_URL = postgresql+psycopg2://user:password@host/dbname
```

All database connection strings, including those in environment variables, Alembic configuration, and application code, must use the asyncpg driver.

## Key Implementation Guidelines

### 1. Single Source of Truth for SQLAlchemy Base

Always import the SQLAlchemy Base class from a single location to avoid creating multiple metadata registries:

```python
# CORRECT - Use this import path in all files
from app.db import Base

# INCORRECT - This creates a duplicate metadata registry
from backend.app.db.base_class import Base
```

**Why this matters**: SQLAlchemy tracks table definitions in the Base.metadata registry. Using multiple Base instances results in tables not being properly registered, causing Alembic to generate empty migrations or miss tables entirely.

### 2. Model Registration

All models must be properly registered with the shared Base:

- All models should inherit from the shared Base class
- Model files should be imported (directly or indirectly) before generating migrations
- The `__init__.py` file in the models directory should import all models to ensure they're registered

### 3. Proper Enum Type Handling

PostgreSQL enum types require special handling in migrations:

```python
# In model definition
class OrderStatus(enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    # ...

# In migration script
from sqlalchemy.dialects import postgresql

# Create enum type explicitly
order_status_enum = postgresql.ENUM('pending', 'confirmed', ..., name='orderstatus')
order_status_enum.create(op.get_bind(), checkfirst=True)

# Then use it in table creation/modification
op.add_column('orders', sa.Column('status', sa.Enum('pending', 'confirmed', ..., name='orderstatus')))
```

Always use `checkfirst=True` to prevent errors on repeated migration runs.

### 4. Foreign Key Reference Management

Ensure all foreign keys have consistent naming and behavior:

```python
# In model definition - use consistent naming pattern
user_id = Column(Integer, ForeignKey("users.id", name="fk_orders_user_id", ondelete="CASCADE"))

# In migration script - be explicit about behavior
op.create_foreign_key(
    "fk_orders_user_id", "orders", "users",
    ["user_id"], ["id"], ondelete="CASCADE"
)
```

### 5. Migration Generation Best Practices

- Use an empty database when generating baseline migrations
- Avoid schema reflection during migration generation
- Set `transaction_per_migration=True` in your env.py for more reliable DDL execution
- Use explicit model imports in your env.py file
- Always verify generated migrations for correctness 

### 6. Alembic Environment Configuration

Ensure your `env.py` file is configured correctly:

```python
# In env.py
# Use a single consistent Base import
from app.db import Base

# Import models to register them with Base.metadata
import app.models  # This should trigger imports of all model files

# Target the shared metadata
target_metadata = Base.metadata
```

## Migration Testing and Verification

### 1. Testing Migrations

Proper testing of migrations is essential. We use pytest-based tests to verify:

- Migration head matches current SQLAlchemy models
- All migrations can be applied to a clean database
- All migrations have both upgrade and downgrade paths
- Tables have proper primary keys and indexes

Example test:

```python
def test_migration_head_matches_models(db_engine, alembic_config):
    """Test that migration head matches SQLAlchemy models."""
    # Apply all migrations
    alembic.command.upgrade(alembic_config, "head")
    
    # Compare current schema with models metadata
    with db_engine.connect() as connection:
        context = MigrationContext.configure(connection)
        diffs = compare_metadata(context, Base.metadata)
        
        # There should be no differences
        assert not diffs, f"Differences between models and migration head: {diffs}"
```

### 2. Verifying Migrations Before Deployment

Before deploying migrations to production:

1. Run all migration tests on a clean database
2. Verify that migrations can be applied to a database with existing data
3. Ensure all migrations can be rolled back if needed
4. Confirm that application code is compatible with both the old and new schema during deployment

### 3. Handling Enum Type Updates

When updating enum types (adding/removing values):

1. Create a new migration that explicitly handles the enum type update
2. Use a temporary column for data preservation if needed
3. Update application code to handle both old and new enum values during transition

Example enum type update:

```python
# 1. Create a new enum type with updated values
new_status_enum = postgresql.ENUM('pending', 'confirmed', 'new_status', name='orderstatus_new')
new_status_enum.create(op.get_bind(), checkfirst=True)

# 2. Create a temporary column with the new type
op.add_column('orders', sa.Column('status_new', sa.Enum('pending', 'confirmed', 'new_status', name='orderstatus_new')))

# 3. Copy data, mapping values if needed
op.execute("UPDATE orders SET status_new = status::text::orderstatus_new")

# 4. Drop the old column and rename the new one
op.drop_column('orders', 'status')
op.alter_column('orders', 'status_new', new_column_name='status')

# 5. Clean up the old enum type if it's no longer needed
op.execute("DROP TYPE IF EXISTS orderstatus")
```

## Troubleshooting Common Issues

### Issue: Migration Conflicts

**Problem**: Multiple developers create migrations from different branches, causing conflicts.

**Solution**: 
1. Always pull latest changes and run migrations before creating new ones
2. Use descriptive migration names with timestamps
3. When conflicts occur, manually merge migration files and verify with tests

### Issue: Enum Type Errors

**Problem**: `ERROR: type "xyz" already exists` or `ERROR: type "xyz" does not exist`

**Solution**:
1. Always use `checkfirst=True` when creating enum types
2. Handle both creation and dropping with appropriate error handling
3. Use the approach in the "Handling Enum Type Updates" section for modifying enums

### Issue: Data Inconsistencies After Migration

**Problem**: Data doesn't match expectations after migration.

**Solution**:
1. Add data validation in migration scripts
2. Include explicit data migration steps in your migration files
3. Write tests that verify data integrity before and after migrations

# Configure migrations with transaction_per_migration
def run_migrations_online():
    # ...
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        transaction_per_migration=True,
        # Additional options...
    )
```

## Troubleshooting

### Empty Migrations

If Alembic generates empty migrations (with just `pass` statements):

1. Check that all models are properly imported and registered with Base
2. Ensure you're not comparing against a database that already has the tables
3. Verify that your env.py is not using schema reflection inappropriately

### Duplicate Table Errors

If you get errors like `Table 'xyz' is already defined`:

1. Check for multiple imports of Base in your codebase
2. Ensure models aren't being imported multiple times with different Base classes
3. Consider using `__all__` in your models/__init__.py to control imports

## Migration Management Tools

The project includes specialized tools for managing migrations effectively:

### 1. Dependency Analysis Tool (`analyze_migration_deps.py`)

Analyzes table dependencies in Alembic migrations to ensure proper creation order:

```bash
python scripts/analyze_migration_deps.py
```

This tool:
- Lists all tables in creation order
- Extracts foreign key relationships and dependencies
- Identifies any ordering issues (tables created before their dependencies)
- Provides detailed output for dependency verification

### 2. Clean Baseline Regeneration Tool (`regenerate_baseline.py`)

Creates a fresh, clean baseline migration with proper table ordering:

```bash
python scripts/regenerate_baseline.py
# Use --dry-run to preview without making changes
python scripts/regenerate_baseline.py --dry-run
```

This tool:
- Creates a backup of existing migrations
- Cleans the versions directory
- Imports all critical models (User, Customer, Tenant, etc.)
- Generates a new baseline migration with proper table ordering

### 3. Migration Squashing Tool (`squash_migrations.py`)

Consolidates multiple migration files into a clean, single baseline:

```bash
python scripts/squash_migrations.py
# Use --dry-run to preview without making changes
python scripts/squash_migrations.py --dry-run
```

This tool:
- Creates a backup of existing migrations
- Generates a new consolidated migration
- Cleans up old migration files

## Migration Maintenance Strategy

For ongoing migration management, follow this strategy:

1. **Regular Verification**:
   - Run `analyze_migration_deps.py` after generating new migrations with complex relationships
   - Include this check in your CI pipeline

2. **Scheduled Squashing**:
   - Before each major release, squash accumulated migrations
   - Use `squash_migrations.py --dry-run` to preview changes

3. **Clean Regeneration When Needed**:
   - If issues arise with migration ordering or table dependencies, use `regenerate_baseline.py`
   - Always verify the new baseline applies cleanly in a test environment

## Migration Reset Procedure

If migrations become corrupted or inconsistent, follow these steps to reset:

1. Create a fresh empty database:
   ```bash
   psql -U postgres -c "CREATE DATABASE alembic_baseline_db;"
   ```

2. Update your Alembic configuration to use this database:
   ```ini
   # In alembic.ini
   sqlalchemy.url = postgresql://postgres:postgres@localhost/alembic_baseline_db
   ```

3. Use the regenerate_baseline.py tool to create a clean baseline:
   ```bash
   python scripts/regenerate_baseline.py
   ```

4. Apply the migration to verify tables are created correctly:
   ```bash
   alembic upgrade head
   ```

5. Copy the migration file to all deployment environments and apply it there

## Best Practices for New Migrations

When adding new models or modifying existing ones:

1. Create a dedicated migration for each significant schema change
2. Use descriptive migration names (e.g., `add_user_preferences_table`)
3. Test migrations by applying them to a development database before committing
4. Include both upgrade and downgrade paths when possible
5. Document complex migrations with comments

## Common Migration Pitfalls and Solutions

### 🌀 Circular Imports in Model Registry
**Trap**: Importing models inside each other (e.g., Customer imports Order and vice versa)

**Solution**:
- Use a dedicated registry.py that imports all models in a top-down order
- Never import the session or Base into models
- **Status**: ✅ Fixed in our codebase

### 🧬 Enum Type Collisions
**Trap**: Forgetting create_type=False and triggering psycopg2.errors.DuplicateObject on every deploy

**Solution**:
- Set create_type=False in model enums: `Column(Enum(MyEnum, create_type=False))`
- Avoid enum redefinition in later migrations — instead, use ALTER TYPE or separate migrations
- **Status**: ✅ Fixed in our codebase

### 🔗 Foreign Keys Referencing Tables Not Yet Created
**Trap**: Alembic tries to create a table with a foreign key to a table that hasn't been created yet

**Solution**:
- Run `analyze_migration_deps.py` to verify table dependency ordering
- Use `regenerate_baseline.py` if issues are found with table creation order
- Split large baseline migrations into ordered stages (e.g., create customers before orders)
- Use op.create_table(..., schema=...) in dependency-safe order if manually crafting
- **Status**: ✅ Fixed (verified with analyze_migration_deps.py)

### 🧩 Alembic Autogenerate False Positives
**Trap**: Alembic autogenerate reports spurious changes (like modifying enum type casing, default values)

**Solution**:
- Use compare_type=True and compare_server_default=True only when needed
- Manually review autogenerated diffs — never trust blindly
- **Status**: ✅ Addressed

### 🌐 Alembic + Async Engine Confusion
**Trap**: Running Alembic with the async engine (asyncpg) and hitting RuntimeError

**Solution**:
- Always use a separate sync engine for migrations (psycopg2)
- Never import async engine in Alembic's env.py
- **Status**: ✅ Fixed in our codebase

### 💣 Mixing Base.metadata.create_all() with Alembic
**Trap**: Accidentally calling Base.metadata.create_all() in app startup code

**Solution**:
- Never call create_all() in production
- Rely entirely on Alembic for schema evolution
- **Status**: ✅ No issues found

### 🗂 Migration File Explosion & No Consolidation
**Trap**: Dozens of tiny migration files with conflicting diffs, often out of order

**Solution**:
- Squash migrations periodically (especially before a major version cut) using `squash_migrations.py`
- Keep logically grouped changes in the same migration
- Run alembic check before upgrade
- Run `analyze_migration_deps.py` to verify dependency ordering
- **Status**: ✅ Addressed with migration management tools

### 🧼 Dirty Databases
**Trap**: Running migrations on partially initialized DBs (stale enums, bad sequences, etc.)

**Solution**:
- Drop and recreate dev DBs before baseline migrations
- Run enum/type cleanup scripts in CI test environments
- **Status**: ✅ Addressed with enum type handling

### 🛑 Forgetting Migration Scripts in CI/CD
**Trap**: Deploying a new version and forgetting to apply the latest migration

**Solution**:
- Run alembic upgrade head as part of your release pipeline
- Add alembic current sanity checks during build/test
- **Status**: ⚠️ Not confirmed (verify CI/CD pipeline)

### 🔐 Not Pinning SQLAlchemy & Alembic Versions
**Trap**: Unexpected behavior when major versions drop (e.g., SQLAlchemy 2.x vs 1.x)

**Solution**:
- Pin versions in pyproject.toml or requirements.txt
```
SQLAlchemy==2.0.30
alembic==1.13.1
```
- **Status**: ⚠️ Not confirmed (check dependency management)

## Integration with CI/CD

Consider adding these checks to your CI/CD pipeline:

1. Linter rules to enforce consistent Base imports
2. Test that verifies all models use the same metadata registry
3. Validation that migration files contain expected table operations
4. Test applying migrations to a clean database

## Additional Resources

- [Alembic Documentation](https://alembic.sqlalchemy.org/)
- [SQLAlchemy Core Documentation](https://docs.sqlalchemy.org/en/20/core/)
- Project-specific notes in backend/docs/guides/DATABASE_CONFIG.md
