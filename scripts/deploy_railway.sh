#!/bin/bash
set -e

echo "Starting Railway deployment process..."

# Navigate to backend directory
cd backend

echo "Installing dependencies..."
pip install -r requirements.txt

echo "Running database migrations..."
alembic upgrade head

echo "Migration completed successfully!"

# Return to root directory
cd ..

echo "Starting application..."
exec uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
