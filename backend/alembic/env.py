import logging
import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# Add the parent directory to sys.path to resolve import issues
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Import Base from the app's db module
from app.db.base_class import Base

# Explicitly import all models to ensure they're registered with Base.metadata
import app.models.user
import app.models.customer
import app.models.tenant
import app.models.product
import app.models.order
import app.models.cart
import app.models.storefront
import app.models.address_book
import app.models.notification_preferences
import app.models.saved_payment_method
import app.models.seller_profile
import app.models.conversation_event
import app.models.complaint
import app.models.storefront_theme
# Import payment models
import app.db.models.payment

# Alembic Config object that provides access to alembic.ini
config = context.config

# Setup database URL from environment or use default from alembic.ini
database_url = os.getenv("DATABASE_URL")
if database_url:
    # Override sqlalchemy.url in alembic.ini with environment variable
    config.set_main_option("sqlalchemy.url", database_url)

# Setup logging
try:
    # Use standard logging config if available
    fileConfig(config.config_file_name)
except Exception:
    # Fallback to basic logging if standard config fails
    logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

# Use metadata from Base class
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.
    """
    # Standard Alembic engine configuration from alembic.ini
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        # Configure alembic context with standard settings
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            transaction_per_migration=True,
            # Use compare_type for better migration detection
            compare_type=True,
            # Set version table schema
            version_table_schema='public',
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
