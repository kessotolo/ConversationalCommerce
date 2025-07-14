# Deployment Guide

This guide covers the deployment process for ConversationalCommerce across different environments.

## 🏗️ Environment Structure

### **Environments**

| Environment | Purpose | Branch | URL | Database |
|-------------|---------|--------|-----|----------|
| **Development** | Active development | `dev` | `dev.enwhe.io` | `conversationalcommerce_dev` |
| **UAT/Staging** | Testing & QA | `uat` | `uat.enwhe.io` | `conversationalcommerce_uat` |
| **Production** | Live users | `main` | `enwhe.io` | `conversationalcommerce_prod` |

### **Branch Strategy**

```
main (production)
├── uat (staging/testing)
├── dev (development)
└── feature branches (individual work)
```

## 🚀 Deployment Workflow

### **1. Development Workflow**

```bash
# Create feature branch
git checkout -b feature/new-feature

# Develop and test locally
./scripts/deploy.sh development

# Push to remote
git push origin feature/new-feature

# Create pull request to dev branch
```

### **2. UAT Testing Workflow**

```bash
# Merge feature to dev branch
git checkout dev
git merge feature/new-feature

# Deploy to UAT
./scripts/manage_branches.sh deploy uat

# Run UAT tests
python -m pytest tests/integration/ -v

# If tests pass, merge to uat branch
git checkout uat
git merge dev
git push origin uat
```

### **3. Production Deployment**

```bash
# After UAT approval, merge to main
./scripts/manage_branches.sh merge uat

# Deploy to production
./scripts/manage_branches.sh deploy prod
```

## 📋 Deployment Commands

### **Environment Management**

```bash
# Create environment branch
./scripts/manage_branches.sh create dev
./scripts/manage_branches.sh create uat

# Deploy to environment
./scripts/deploy.sh development
./scripts/deploy.sh uat
./scripts/deploy.sh production

# Show branch status
./scripts/manage_branches.sh status

# Clean up old branches
./scripts/manage_branches.sh cleanup
```

### **Manual Deployment**

```bash
# Development
ENVIRONMENT=development ./scripts/deploy.sh

# UAT
ENVIRONMENT=uat ./scripts/deploy.sh

# Production
ENVIRONMENT=production ./scripts/deploy.sh
```

## 🔧 Environment Configuration

### **Environment Files**

- `env.development` - Development environment variables
- `env.uat` - UAT environment variables
- `env.production` - Production environment variables

### **Loading Environment Variables**

```bash
# Load development environment
source env.development

# Load UAT environment
source env.uat

# Load production environment
source env.production
```

## 🧪 Testing Strategy

### **Development Testing**
- Unit tests: `python -m pytest tests/unit/`
- Integration tests: `python -m pytest tests/integration/`
- Linting: `python -m flake8 app/`

### **UAT Testing**
- Full test suite: `python -m pytest tests/`
- Security tests: `python -m pytest tests/security/`
- Performance tests: `python -m pytest tests/performance/`

### **Production Testing**
- Security regression tests
- Database migration tests
- Load testing (if applicable)

## 🔒 Security Considerations

### **Environment Isolation**
- Each environment has separate databases
- Different API keys for external services
- Environment-specific rate limiting
- Separate monitoring and logging

### **Production Security**
- No debug mode
- Strict rate limiting
- Comprehensive logging
- Security headers enabled
- SSL/TLS required

## 📊 Monitoring & Logging

### **Development**
- Debug logging enabled
- Detailed error messages
- Local file logging

### **UAT**
- Info level logging
- Structured logging
- Error tracking (Sentry)

### **Production**
- Warning level logging
- Structured logging
- Error tracking (Sentry)
- Performance monitoring

## 🚨 Rollback Procedures

### **Database Rollback**
```bash
# Rollback to previous migration
python -m alembic downgrade -1

# Rollback to specific migration
python -m alembic downgrade <migration_id>
```

### **Code Rollback**
```bash
# Revert to previous commit
git revert <commit_hash>

# Rollback deployment
./scripts/deploy.sh production <previous_commit>
```

## 📝 Deployment Checklist

### **Pre-Deployment**
- [ ] All tests pass
- [ ] Code review completed
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] Security scan completed

### **Deployment**
- [ ] Backup database (production)
- [ ] Run database migrations
- [ ] Deploy application
- [ ] Verify health checks
- [ ] Run smoke tests

### **Post-Deployment**
- [ ] Monitor application logs
- [ ] Check error rates
- [ ] Verify functionality
- [ ] Update documentation

## 🔧 Troubleshooting

### **Common Issues**

#### **Database Connection Issues**
```bash
# Check database connectivity
python -c "from app.db.async_session import get_async_session_local; print('DB OK')"

# Verify environment variables
echo $ENVIRONMENT
echo $DEV_DB_HOST
```

#### **Import Errors**
```bash
# Check Python path
python -c "import sys; print(sys.path)"

# Verify imports
python -c "from app.main import app; print('App OK')"
```

#### **Deployment Failures**
```bash
# Check logs
tail -f logs/app.log

# Verify environment
./scripts/manage_branches.sh status

# Test deployment script
./scripts/deploy.sh development --dry-run
```

## 📞 Support

For deployment issues:
1. Check the logs in the appropriate environment
2. Verify environment configuration
3. Run the troubleshooting commands above
4. Contact the development team

## 🔄 Continuous Integration

### **Automated Testing**
- Tests run on every push
- Security scans on pull requests
- Performance tests on main branch

### **Automated Deployment**
- Development: Auto-deploy on dev branch
- UAT: Manual approval required
- Production: Manual approval + UAT testing required