#!/bin/bash

set -e

echo "=== Conversational Commerce Platform Startup ==="
echo "Ensuring NLP models are available..."

# Run the NLP model downloader script
python backend/scripts/download_nlp_models.py

# Check the exit code
if [ $? -ne 0 ]; then
    echo "WARNING: Some NLP models could not be downloaded. Continuing with limited functionality..."
else
    echo "All NLP models are available."
fi

echo "Starting application..."

# Start the application with uvicorn (update port if needed)
cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
