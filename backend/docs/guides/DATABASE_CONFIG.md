# Database Configuration Guide

## Overview
This document outlines the database configuration for the Conversational Commerce platform, including the recent update from `psycopg2` to `asyncpg` driver.

## Connection URL Format
The platform now uses `asyncpg` as the PostgreSQL driver for improved performance with async code. The connection URL format has changed from:

```
# Old format (psycopg2)
postgresql+psycopg2://postgres:postgres@localhost/conversational_commerce
```

To:

```
# New format (asyncpg)
postgresql+asyncpg://user@localhost:5432/dbname
```

## Environment Configuration
To set up your local environment, create a `.env` file in the project root with these database settings:

```
# Database
POSTGRES_SERVER=localhost
POSTGRES_USER=your_username
POSTGRES_PASSWORD=your_password  # Leave empty if using peer authentication
POSTGRES_DB=postgres  # Or your specific database name
```

## Alembic Migration Configuration
The `alembic.ini` file has been updated to use the asyncpg driver:

```
# alembic.ini
[alembic]
# path to migration scripts
script_location = alembic
sqlalchemy.url = postgresql+asyncpg://user@localhost:5432/dbname
```

When running migrations, Alembic will use this connection string. Alternatively, you can override this setting by specifying the database URL at runtime:

```bash
alembic upgrade head
```

## Troubleshooting

### Connection Issues
- Ensure PostgreSQL is running on your machine
- Verify port is correct (default is 5432)
- Check authentication method (password vs peer authentication)
- For peer authentication, remove the password from the connection string

### Migration Errors
- If you encounter errors about "psycopg2" dependencies, you may need to install asyncpg:
  ```
  pip install asyncpg
  ```

- For existing migrations, you might need to run:
  ```
  alembic revision --autogenerate -m "migrate to asyncpg"
  alembic upgrade head
  ```

## Implementation Details
The database connection settings are defined in `backend/app/core/config/settings.py` and used throughout the application. When changing database configurations, ensure all services that connect to the database are updated.
