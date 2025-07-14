#!/bin/bash

# Deployment script for ConversationalCommerce backend
# Usage: ./scripts/deploy.sh [environment] [branch]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=${1:-"development"}
BRANCH=${2:-"main"}

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|uat|production)$ ]]; then
    echo -e "${RED}Error: Invalid environment. Must be development, uat, or production${NC}"
    exit 1
fi

echo -e "${BLUE}🚀 Starting deployment to $ENVIRONMENT environment${NC}"
echo -e "${BLUE}📦 Branch: $BRANCH${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to log with timestamp
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

# Function to log warning
warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Function to log error
error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

# Check prerequisites
log "Checking prerequisites..."

if ! command_exists python3; then
    error "Python 3 is required but not installed"
    exit 1
fi

if ! command_exists pip; then
    error "pip is required but not installed"
    exit 1
fi

if ! command_exists git; then
    error "git is required but not installed"
    exit 1
fi

log "Prerequisites check passed"

# Set environment variables
export ENVIRONMENT=$ENVIRONMENT

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    log "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
log "Activating virtual environment..."
source venv/bin/activate

# Install/upgrade dependencies
log "Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Run tests
log "Running tests..."
python -m pytest tests/ -v --tb=short

if [ $? -ne 0 ]; then
    error "Tests failed. Deployment aborted."
    exit 1
fi

log "Tests passed"

# Run linting
log "Running linting..."
python -m flake8 app/ --max-line-length=88 --extend-ignore=E203,W503

if [ $? -ne 0 ]; then
    warn "Linting issues found, but continuing deployment"
else
    log "Linting passed"
fi

# Database migrations
log "Running database migrations..."
python -m alembic upgrade head

if [ $? -ne 0 ]; then
    error "Database migration failed"
    exit 1
fi

log "Database migrations completed"

# Environment-specific deployment steps
case $ENVIRONMENT in
    "development")
        log "Deploying to development environment..."
        # Development-specific steps
        export DEBUG=true
        export LOG_LEVEL=DEBUG
        ;;

    "uat")
        log "Deploying to UAT environment..."
        # UAT-specific steps
        export DEBUG=false
        export LOG_LEVEL=INFO

        # Additional UAT checks
        log "Running UAT-specific tests..."
        python -m pytest tests/integration/ -v

        if [ $? -ne 0 ]; then
            error "UAT integration tests failed"
            exit 1
        fi
        ;;

    "production")
        log "Deploying to production environment..."
        # Production-specific steps
        export DEBUG=false
        export LOG_LEVEL=WARNING

        # Additional production checks
        log "Running production security checks..."
        python -m pytest tests/security/ -v

        if [ $? -ne 0 ]; then
            error "Production security tests failed"
            exit 1
        fi

        # Backup database before deployment
        log "Creating database backup..."
        # Add your backup command here
        ;;
esac

# Start the application
log "Starting application..."
case $ENVIRONMENT in
    "development")
        python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
        ;;
    "uat"|"production")
        python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
        ;;
esac

log "Deployment completed successfully!"
echo -e "${GREEN}✅ Deployment to $ENVIRONMENT completed${NC}"