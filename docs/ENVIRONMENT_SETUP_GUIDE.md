# Environment Setup Guide

This guide provides quick setup instructions for the new development, UAT, and production environment structure.

## 🚀 Quick Start

### **1. Environment Setup**

```bash
# Clone the repository
git clone https://github.com/kessotolo/ConversationalCommerce.git
cd ConversationalCommerce

# Check available branches
./backend/scripts/manage_branches.sh status

# Create environment branches (if needed)
./backend/scripts/manage_branches.sh create dev
./backend/scripts/manage_branches.sh create uat
```

### **2. Development Workflow**

```bash
# Switch to development branch
git checkout dev

# Load development environment
cd backend
source env.development

# Deploy to development
./scripts/deploy.sh development
```

### **3. UAT Testing Workflow**

```bash
# Switch to UAT branch
git checkout uat

# Load UAT environment
cd backend
source env.uat

# Deploy to UAT
./scripts/deploy.sh uat
```

### **4. Production Deployment**

```bash
# After UAT approval, merge to maincopy
./backend/scripts/manage_branches.sh merge uat

# Deploy to production
./backend/scripts/deploy.sh production
```

## 📋 Environment Structure

| Environment | Branch | URL | Purpose |
|-------------|--------|-----|---------|
| **Development** | `dev` | `dev.enwhe.io` | Active development |
| **UAT/Staging** | `uat` | `uat.enwhe.io` | Testing & QA |
| **Production** | `maincopy` | `enwhe.io` | Live users |

## 🔧 Configuration Files

### **Environment Variables**
- `backend/env.development` - Development settings
- `backend/env.uat` - UAT settings
- `backend/env.production` - Production settings

### **Deployment Scripts**
- `backend/scripts/deploy.sh` - Main deployment script
- `backend/scripts/manage_branches.sh` - Branch management

## 🧪 Testing Commands

```bash
# Development testing
cd backend
python -m pytest tests/unit/ -v
python -m pytest tests/integration/ -v

# UAT testing
python -m pytest tests/ -v
python -m pytest tests/security/ -v

# Production testing
python -m pytest tests/security/ -v
python -m pytest tests/performance/ -v
```

## 🔒 Security Notes

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

## 📊 Monitoring

### **Development**
- Debug logging enabled
- Local file logging
- Detailed error messages

### **UAT**
- Info level logging
- Structured logging
- Error tracking (Sentry)

### **Production**
- Warning level logging
- Structured logging
- Error tracking (Sentry)
- Performance monitoring

## 🚨 Troubleshooting

### **Common Issues**

#### **Database Connection**
```bash
# Check connectivity
python -c "from app.db.async_session import get_async_session_local; print('DB OK')"

# Verify environment
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

#### **Deployment Issues**
```bash
# Check logs
tail -f logs/app.log

# Verify environment
./scripts/manage_branches.sh status

# Test deployment
./scripts/deploy.sh development --dry-run
```

## 📞 Support

For environment setup issues:
1. Check the deployment guide: `backend/docs/DEPLOYMENT_GUIDE.md`
2. Verify environment configuration
3. Run troubleshooting commands
4. Contact the development team

## 🔄 Next Steps

1. **Set up environment variables** for your specific deployment
2. **Configure external services** (Clerk, Cloudinary, Twilio)
3. **Set up monitoring** (Sentry, logging)
4. **Configure CI/CD** for automated deployments
5. **Test the workflow** end-to-end

## 📚 Related Documentation

- [Deployment Guide](backend/docs/DEPLOYMENT_GUIDE.md) - Detailed deployment process
- [API Contract Specifications](docs/API_CONTRACT_SPECIFICATIONS.md) - API integration points
- [Authentication Flow](docs/AUTHENTICATION_FLOW_COORDINATION.md) - Auth patterns
- [URL Structure](docs/URL_STRUCTURE_ALIGNMENT.md) - URL patterns and routing