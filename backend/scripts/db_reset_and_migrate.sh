#!/bin/bash
set -e

# Load environment variables if .env.local exists
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
fi

DB_NAME=${DB_NAME:-railway}
DB_USER=${DB_USER:-postgres}

# Drop and recreate the database
echo "Dropping database $DB_NAME (if exists)..."
dropdb -U $DB_USER $DB_NAME --if-exists || true

echo "Creating database $DB_NAME..."
createdb -U $DB_USER $DB_NAME

# Run migrations
echo "Running alembic migrations..."
alembic upgrade head

echo "Database reset and migrated!"