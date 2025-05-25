#!/bin/bash
# Script to create and set up the test database for the Conversational Commerce platform

# Database configuration
DB_NAME="test_conversational_commerce"
DB_USER="postgres"
DB_PASSWORD="postgres"
DB_HOST="localhost"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "Setting up test database for Conversational Commerce platform..."

# Check if PostgreSQL is running
pg_isready -h $DB_HOST > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: PostgreSQL is not running on $DB_HOST${NC}"
    echo "Please start PostgreSQL and try again."
    exit 1
fi

# Check if database already exists
psql -h $DB_HOST -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME
if [ $? -eq 0 ]; then
    echo "Test database '$DB_NAME' already exists."
    read -p "Do you want to drop and recreate it? (y/n): " confirm
    if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
        echo "Dropping database '$DB_NAME'..."
        dropdb -h $DB_HOST -U $DB_USER $DB_NAME
    else
        echo "Using existing database."
        exit 0
    fi
fi

# Create the database
echo "Creating test database '$DB_NAME'..."
createdb -h $DB_HOST -U $DB_USER $DB_NAME

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Test database created successfully!${NC}"
    
    # Create .env.test file with test database credentials
    echo "Creating .env.test file with test database configuration..."
    cat > ../.env.test << EOF
# Test environment configuration
POSTGRES_SERVER=localhost
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=test_conversational_commerce
DATABASE_URL=postgresql://postgres:postgres@localhost/test_conversational_commerce

# Use test values for other services if needed
SECRET_KEY=testsecretkey
CLOUDINARY_CLOUD_NAME=testcloud
CLOUDINARY_API_KEY=testapikey
CLOUDINARY_API_SECRET=testapisecret
TWILIO_ACCOUNT_SID=testaccountsid
TWILIO_AUTH_TOKEN=testauthtoken
TWILIO_PHONE_NUMBER=+1234567890
EOF
    
    echo -e "${GREEN}Test environment configured successfully!${NC}"
    echo "To run tests with this configuration:"
    echo "  1. Make sure PostgreSQL is running"
    echo "  2. Run: python -m pytest tests/"
else
    echo -e "${RED}Failed to create test database.${NC}"
    echo "Please check your PostgreSQL configuration and try again."
    exit 1
fi
