#!/bin/bash

# Branch management script for ConversationalCommerce
# Usage: ./scripts/manage_branches.sh [command] [environment]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Function to show usage
show_usage() {
    echo "Usage: $0 [command] [environment]"
    echo ""
    echo "Commands:"
    echo "  create    - Create environment branch"
    echo "  deploy    - Deploy to environment"
    echo "  merge     - Merge environment to maincopy (production)"
    echo "  status    - Show branch status"
    echo "  cleanup   - Clean up old branches"
    echo ""
    echo "Environments:"
    echo "  dev       - Development environment"
    echo "  uat       - UAT/Staging environment"
    echo "  prod      - Production environment (maincopy)"
    echo ""
    echo "Examples:"
    echo "  $0 create dev"
    echo "  $0 deploy uat"
    echo "  $0 merge uat"
}

# Function to create environment branch
create_branch() {
    local env=$1
    local branch_name=""

    case $env in
        "dev")
            branch_name="dev"
            ;;
        "uat")
            branch_name="uat"
            ;;
        "prod")
            error "Cannot create production branch manually"
            exit 1
            ;;
        *)
            error "Invalid environment: $env"
            exit 1
            ;;
    esac

    log "Creating $branch_name branch from maincopy..."

    # Ensure we're on maincopy and up to date
    git checkout maincopy
    git pull origin maincopy

    # Create new branch
    git checkout -b $branch_name

    log "Branch $branch_name created successfully"
    echo -e "${GREEN}✅ Branch $branch_name is ready for development${NC}"
}

# Function to deploy to environment
deploy_branch() {
    local env=$1
    local branch_name=""

    case $env in
        "dev")
            branch_name="dev"
            ;;
        "uat")
            branch_name="uat"
            ;;
        "prod")
            branch_name="maincopy"
            ;;
        *)
            error "Invalid environment: $env"
            exit 1
            ;;
    esac

    log "Deploying $branch_name to $env environment..."

    # Ensure we're on the correct branch
    git checkout $branch_name
    git pull origin $branch_name

    # Run deployment script
    ./scripts/deploy.sh $env $branch_name

    log "Deployment to $env completed"
}

# Function to merge environment to maincopy
merge_branch() {
    local env=$1
    local branch_name=""

    case $env in
        "dev")
            branch_name="dev"
            ;;
        "uat")
            branch_name="uat"
            ;;
        "prod")
            error "Cannot merge to production manually"
            exit 1
            ;;
        *)
            error "Invalid environment: $env"
            exit 1
            ;;
    esac

    log "Merging $branch_name to maincopy..."

    # Ensure we're on maincopy and up to date
    git checkout maincopy
    git pull origin maincopy

    # Merge the branch
    git merge $branch_name --no-ff -m "Merge $branch_name to maincopy"

    # Push to remote
    git push origin maincopy

    log "Merge completed successfully"
    echo -e "${GREEN}✅ $branch_name has been merged to maincopy${NC}"
}

# Function to show branch status
show_status() {
    log "Current branch status:"
    echo ""

    # Show current branch
    current_branch=$(git branch --show-current)
    echo -e "${BLUE}Current branch: $current_branch${NC}"

    # Show all branches
    echo ""
    echo -e "${BLUE}All branches:${NC}"
    git branch -a

    # Show recent commits
    echo ""
    echo -e "${BLUE}Recent commits:${NC}"
    git log --oneline -10
}

# Function to cleanup old branches
cleanup_branches() {
    log "Cleaning up old branches..."

    # Delete local branches that have been merged
    git branch --merged maincopy | grep -v "maincopy" | xargs -r git branch -d

    # Delete remote tracking branches that no longer exist on remote
    git remote prune origin

    log "Cleanup completed"
}

# Main script logic
COMMAND=${1:-"status"}
ENVIRONMENT=${2:-""}

case $COMMAND in
    "create")
        if [ -z "$ENVIRONMENT" ]; then
            error "Environment is required for create command"
            show_usage
            exit 1
        fi
        create_branch $ENVIRONMENT
        ;;

    "deploy")
        if [ -z "$ENVIRONMENT" ]; then
            error "Environment is required for deploy command"
            show_usage
            exit 1
        fi
        deploy_branch $ENVIRONMENT
        ;;

    "merge")
        if [ -z "$ENVIRONMENT" ]; then
            error "Environment is required for merge command"
            show_usage
            exit 1
        fi
        merge_branch $ENVIRONMENT
        ;;

    "status")
        show_status
        ;;

    "cleanup")
        cleanup_branches
        ;;

    *)
        error "Invalid command: $COMMAND"
        show_usage
        exit 1
        ;;
esac