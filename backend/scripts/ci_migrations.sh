#!/bin/bash
# CI/CD Database Migration Script
# This script runs migrations during CI/CD deployment
set -e

echo "Running database migrations check for CI/CD pipeline"

# Check if alembic is installed
if ! command -v alembic &> /dev/null; then
    echo "Error: alembic is not installed"
    exit 1
fi

# Check that we're in the backend directory
if [ ! -f "alembic.ini" ]; then
    echo "Error: alembic.ini not found. Make sure you're in the backend directory."
    exit 1
fi

# 1. Check current migration status
echo "Checking current migration status..."
alembic current

# 2. Check if migrations are up-to-date with models
echo "Checking if migrations match models..."
alembic check

# 3. Run database migrations
echo "Running database migrations..."
alembic upgrade head

# 4. Verify migrations were applied successfully
echo "Verifying migrations were applied successfully..."
alembic current

echo "Database migrations completed successfully!"
exit 0
