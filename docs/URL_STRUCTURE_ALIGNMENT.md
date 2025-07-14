# URL Structure Alignment for Track A & B

## 🎯 Overview

This document defines the exact URL patterns that both Track A (backend) and Track B (frontend) must implement to ensure seamless integration and proper multi-tenant architecture.

---

## 🏗️ URL Architecture

### **Base Domains**
```
enwhe.io (Main Platform)
├── admin.enwhe.io (Merchant Admin Dashboard)
├── app.enwhe.io (Main Application)
├── api.enwhe.io (API Endpoints)
└── {merchant-id}.enwhe.io (Merchant Storefronts)
```

---

## 📋 URL Patterns by Context

### **1. Merchant Admin Dashboard**
```
admin.enwhe.io/store/{merchant-id}/
├── /dashboard
├── /products
├── /orders
├── /analytics
├── /settings
└── /team
```

**Examples:**
- `admin.enwhe.io/store/kdfuniture/dashboard`
- `admin.enwhe.io/store/kdfuniture/products`
- `admin.enwhe.io/store/kdfuniture/orders`

### **2. Merchant Storefront**
```
{merchant-id}.enwhe.io/
├── / (Home/Landing)
├── /products
├── /products/{product_id}
├── /categories
├── /cart
└── /checkout
```

**Examples:**
- `kdfuniture.enwhe.io/`
- `kdfuniture.enwhe.io/products`
- `kdfuniture.enwhe.io/products/abc123`

### **3. API Endpoints**
```
api.enwhe.io/api/v1/
├── /admin/{merchant-id}/* (Admin APIs)
├── /storefront/{merchant-id}/* (Storefront APIs)
├── /tenants/* (Tenant Management)
└── /auth/* (Authentication)
```

**Examples:**
- `api.enwhe.io/api/v1/admin/kdfuniture/dashboard/metrics`
- `api.enwhe.io/api/v1/storefront/kdfuniture/products`
- `api.enwhe.io/api/v1/tenants/check-subdomain`

---

## 🔧 Implementation Requirements

### **Track A (Backend) Requirements**

#### **1. URL Resolution**
```python
# Backend must resolve merchant ID from URL patterns
def resolve_merchant_from_url(url: str) -> str:
    """
    Extract merchant ID from various URL patterns:
    - admin.enwhe.io/store/{merchant-id}/...
    - {merchant-id}.enwhe.io/...
    - api.enwhe.io/api/v1/admin/{merchant-id}/...
    """
    pass
```

#### **2. API Route Patterns**
```python
# Admin API routes
@router.get("/admin/{merchant_id}/dashboard/metrics")
@router.get("/admin/{merchant_id}/products")
@router.post("/admin/{merchant_id}/products")

# Storefront API routes
@router.get("/storefront/{merchant_id}/products")
@router.get("/storefront/{merchant_id}/products/{product_id}")

# Tenant management routes
@router.get("/tenants/check-subdomain")
@router.post("/tenants/")
@router.get("/tenants/subdomain/{subdomain}")
```

#### **3. CORS Configuration**
```python
# Allow cross-origin requests between admin and storefront
CORS_ORIGINS = [
    "https://admin.enwhe.io",
    "https://*.enwhe.io",  # All merchant subdomains
    "https://app.enwhe.io"
]
```

### **Track B (Frontend) Requirements**

#### **1. Next.js Route Structure**
```typescript
// File structure for admin dashboard
app/
├── admin/
│   └── store/
│       └── [merchantId]/
│           ├── dashboard/
│           │   └── page.tsx
│           ├── products/
│           │   └── page.tsx
│           ├── orders/
│           │   └── page.tsx
│           └── settings/
│               └── page.tsx

// File structure for storefront
app/
├── [merchantId]/
│   ├── page.tsx (storefront home)
│   ├── products/
│   │   ├── page.tsx (product list)
│   │   └── [productId]/
│   │       └── page.tsx (product detail)
│   ├── cart/
│   │   └── page.tsx
│   └── checkout/
│       └── page.tsx
```

#### **2. Dynamic Route Handling**
```typescript
// Admin dashboard routing
const AdminLayout = ({ params }: { params: { merchantId: string } }) => {
  return (
    <div>
      <AdminNavigation merchantId={params.merchantId} />
      <Outlet />
    </div>
  );
};

// Storefront routing
const StorefrontLayout = ({ params }: { params: { merchantId: string } }) => {
  return (
    <div>
      <StorefrontNavigation merchantId={params.merchantId} />
      <Outlet />
    </div>
  );
};
```

#### **3. API Client Configuration**
```typescript
// Admin API client
const adminApiClient = {
  baseURL: 'https://api.enwhe.io/api/v1/admin',
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-ID': merchantId
  }
};

// Storefront API client
const storefrontApiClient = {
  baseURL: 'https://api.enwhe.io/api/v1/storefront',
  headers: {
    'Content-Type': 'application/json'
  }
};
```

---

## 🔐 Authentication & Authorization

### **Admin Dashboard Authentication**
```typescript
// Required for all admin routes
const adminAuth = {
  required: true,
  redirectTo: '/auth/sign-in',
  scope: 'admin'
};

// URL pattern: admin.enwhe.io/store/{merchant-id}/*
// Must validate user has access to specific merchant
```

### **Storefront Authentication**
```typescript
// Optional for browsing, required for checkout
const storefrontAuth = {
  required: false, // For browsing
  required: true,  // For checkout
  scope: 'customer'
};

// URL pattern: {merchant-id}.enwhe.io/*
// No authentication required for product browsing
```

---

## 🧪 Testing Requirements

### **Track A Must Test:**
1. **URL Resolution**: Correct merchant ID extraction from all URL patterns
2. **CORS**: Cross-origin requests between admin and storefront
3. **Authentication**: Proper auth validation for admin vs storefront routes
4. **Tenant Isolation**: Data isolation between different merchants

### **Track B Must Test:**
1. **Route Matching**: All URL patterns render correct components
2. **Dynamic Routes**: Merchant ID extraction and validation
3. **Navigation**: Proper links between admin and storefront
4. **Authentication**: Login/logout flows for both contexts

### **Integration Tests:**
1. **Complete Flow**: Signup → Admin Dashboard → Storefront
2. **Cross-Navigation**: Admin → Storefront → Admin
3. **Multi-Tenant**: Different merchants don't see each other's data
4. **URL Persistence**: URLs work with page refresh and direct access

---

## 📝 Validation Checklist

### **Track A Validation:**
- [ ] All API endpoints follow `/api/v1/*` pattern
- [ ] Merchant ID extraction works for all URL patterns
- [ ] CORS configured for cross-domain requests
- [ ] Authentication middleware validates merchant access
- [ ] Error responses include proper status codes

### **Track B Validation:**
- [ ] All routes match the defined URL patterns
- [ ] Dynamic route parameters are properly typed
- [ ] Navigation works between admin and storefront
- [ ] Authentication flows work for both contexts
- [ ] URLs are SEO-friendly and accessible

### **Integration Validation:**
- [ ] Admin dashboard loads with correct merchant context
- [ ] Storefront loads with correct merchant context
- [ ] API calls use correct base URLs and headers
- [ ] Error handling works consistently across contexts
- [ ] Performance meets requirements (<500ms response times)

---

## 🚨 Common Issues & Solutions

### **Issue 1: Merchant ID Mismatch**
**Problem**: Frontend and backend use different merchant ID formats
**Solution**: Standardize on UUID format for all merchant IDs

### **Issue 2: CORS Errors**
**Problem**: Admin dashboard can't call storefront APIs
**Solution**: Configure CORS to allow cross-domain requests

### **Issue 3: Authentication Scope**
**Problem**: Admin users can access other merchants' data
**Solution**: Implement proper tenant isolation in auth middleware

### **Issue 4: URL Persistence**
**Problem**: Direct URL access doesn't work
**Solution**: Implement proper server-side rendering for dynamic routes

---

**Last Updated**: [Current Date]
**Version**: 1.0
**Next Review**: [Date]