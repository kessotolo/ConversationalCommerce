# API Contract Specifications for Track B Integration

## 📋 Overview

This document provides the complete API contract specifications that Track A has implemented for Track B to integrate with. All endpoints follow the `/api/v1/*` pattern and include proper error handling, authentication, and resilience.

---

## 🔐 Authentication & Authorization

### **Merchant Authentication Flow**

```typescript
// Authentication endpoints for merchant admin access
POST   /api/v1/auth/merchant/login
POST   /api/v1/auth/merchant/logout
GET    /api/v1/auth/merchant/session
POST   /api/v1/auth/merchant/refresh
```

**Request Headers:**
```typescript
{
  "Authorization": "Bearer <jwt_token>",
  "Content-Type": "application/json",
  "X-Tenant-ID": "<merchant_id>" // For admin endpoints
}
```

**Response Format:**
```typescript
{
  "success": boolean,
  "data": object | null,
  "error": string | null,
  "timestamp": string
}
```

---

## 🏪 Admin API Endpoints (Merchant Dashboard)

### **Base URL Pattern**
```
admin.enwhe.io/store/{merchant-id}/api/v1/admin/*
```

### **Dashboard Metrics**
```typescript
GET /api/v1/admin/{merchant-id}/dashboard/metrics

Response:
{
  "sales_metrics": {
    "total_sales": number,
    "sales_period": "30_days"
  },
  "order_metrics": {
    "total_orders": number,
    "recent_orders": number
  },
  "product_metrics": {
    "total_products": number
  },
  "customer_metrics": {
    "total_customers": number
  },
  "recent_activity": {
    "orders": Order[]
  }
}
```

### **Recent Activity**
```typescript
GET /api/v1/admin/{merchant-id}/dashboard/recent-activity?limit=10

Response:
{
  "orders": Order[],
  "products": Product[],
  "customers": Customer[]
}
```

### **Products Management**
```typescript
GET    /api/v1/admin/{merchant-id}/products
POST   /api/v1/admin/{merchant-id}/products
GET    /api/v1/admin/{merchant-id}/products/{product_id}
PUT    /api/v1/admin/{merchant-id}/products/{product_id}
DELETE /api/v1/admin/{merchant-id}/products/{product_id}
```

### **Orders Management**
```typescript
GET    /api/v1/admin/{merchant-id}/orders
GET    /api/v1/admin/{merchant-id}/orders/{order_id}
PUT    /api/v1/admin/{merchant-id}/orders/{order_id}
```

### **Analytics**
```typescript
GET    /api/v1/admin/{merchant-id}/analytics
GET    /api/v1/admin/{merchant-id}/analytics/sales
GET    /api/v1/admin/{merchant-id}/analytics/customers
```

### **Settings**
```typescript
GET    /api/v1/admin/{merchant-id}/settings
PUT    /api/v1/admin/{merchant-id}/settings
```

---

## 🛍️ Storefront API Endpoints (Customer Facing)

### **Base URL Pattern**
```
{merchant-id}.enwhe.io/api/v1/storefront/*
```

### **Products (No Authentication Required)**
```typescript
GET /api/v1/storefront/{merchant-id}/products?subdomain={subdomain}&skip=0&limit=20&category={category}&search={search}&sort_by={name|price|created_at}&sort_order={asc|desc}

Response:
{
  "items": Product[],
  "total": number,
  "limit": number,
  "offset": number
}
```

```typescript
GET /api/v1/storefront/{merchant-id}/products/{product_id}?subdomain={subdomain}

Response:
{
  "id": string,
  "name": string,
  "description": string,
  "price": number,
  "images": string[],
  "category": string,
  "is_active": boolean,
  "created_at": string
}
```

### **Categories**
```typescript
GET /api/v1/storefront/{merchant-id}/categories/list?subdomain={subdomain}

Response:
{
  "categories": string[]
}
```

### **Cart (Optional Authentication)**
```typescript
POST   /api/v1/storefront/{merchant-id}/cart
GET    /api/v1/storefront/{merchant-id}/cart
PUT    /api/v1/storefront/{merchant-id}/cart/{item_id}
DELETE /api/v1/storefront/{merchant-id}/cart/{item_id}
```

### **Checkout (Optional Authentication)**
```typescript
POST   /api/v1/storefront/{merchant-id}/checkout
GET    /api/v1/storefront/{merchant-id}/checkout/{checkout_id}
```

---

## 🏢 Tenant & Subdomain Management

### **Subdomain Availability Check**
```typescript
GET /api/v1/tenants/check-subdomain?subdomain={name}

Response:
{
  "subdomain": string,
  "available": boolean,
  "suggested_subdomain": string | null,
  "reason": string | null,
  "full_url": string | null
}
```

### **Tenant Creation (Auto Subdomain Assignment)**
```typescript
POST /api/v1/tenants/

Request:
{
  "businessName": string,
  "subdomain": string,
  "phoneNumber": string,
  "whatsappNumber": string,
  "storeEmail": string
}

Response:
{
  "id": string,
  "name": string,
  "subdomain": string, // May be different from requested
  "phone_number": string,
  "whatsapp_number": string,
  "email": string,
  "is_active": boolean,
  "created_at": string
}
```

### **Tenant Information**
```typescript
GET /api/v1/tenants/me

Response:
{
  "id": string,
  "name": string,
  "subdomain": string,
  "display_name": string,
  "phone_number": string,
  "whatsapp_number": string,
  "email": string,
  "is_active": boolean,
  "created_at": string,
  "updated_at": string
}
```

### **Tenant by Subdomain**
```typescript
GET /api/v1/tenants/subdomain/{subdomain}

Response:
{
  "id": string,
  "name": string,
  "subdomain": string,
  "display_name": string,
  "is_active": boolean,
  "store_url": string,
  "admin_url": string
}
```

---

## 🔄 Error Handling & Resilience

### **Standard Error Response Format**
```typescript
{
  "detail": string,
  "status_code": number,
  "timestamp": string,
  "request_id": string
}
```

### **Common Error Status Codes**
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `409` - Conflict (subdomain already taken)
- `422` - Unprocessable Entity (validation failed)
- `500` - Internal Server Error
- `503` - Service Unavailable (database/cache issues)
- `504` - Gateway Timeout (external service timeout)

### **Resilience Features**
- **Automatic Retries**: Exponential backoff for transient failures
- **Graceful Fallbacks**: Cached responses when primary data unavailable
- **Network Monitoring**: Real-time connectivity status
- **Timeout Handling**: Configurable timeouts for all operations

---

## 📊 Data Models

### **Product Model**
```typescript
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  is_active: boolean;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}
```

### **Order Model**
```typescript
interface Order {
  id: string;
  customer_id: string;
  tenant_id: string;
  total_amount: number;
  status: "pending" | "paid" | "shipped" | "delivered" | "cancelled";
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}
```

### **Tenant Model**
```typescript
interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  display_name: string;
  phone_number: string;
  whatsapp_number: string;
  email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

---

## 🔧 Integration Guidelines for Track B

### **1. URL Structure Implementation**
```typescript
// Admin routes
const adminRoutes = {
  dashboard: `/admin/${merchantId}/dashboard`,
  products: `/admin/${merchantId}/products`,
  orders: `/admin/${merchantId}/orders`,
  analytics: `/admin/${merchantId}/analytics`,
  settings: `/admin/${merchantId}/settings`
};

// Storefront routes
const storefrontRoutes = {
  products: `/storefront/${merchantId}/products`,
  product: (id: string) => `/storefront/${merchantId}/products/${id}`,
  categories: `/storefront/${merchantId}/categories`,
  cart: `/storefront/${merchantId}/cart`,
  checkout: `/storefront/${merchantId}/checkout`
};
```

### **2. Authentication Implementation**
```typescript
// Add to all admin API calls
const headers = {
  'Authorization': `Bearer ${token}`,
  'X-Tenant-ID': merchantId,
  'Content-Type': 'application/json'
};

// Storefront calls (no auth required)
const storefrontHeaders = {
  'Content-Type': 'application/json'
};
```

### **3. Error Handling Implementation**
```typescript
const handleApiError = (error: any) => {
  if (error.status === 503) {
    // Show offline mode or cached data
    return showOfflineMode();
  }

  if (error.status === 409) {
    // Handle subdomain conflicts
    return showSubdomainConflict(error.detail);
  }

  // Handle other errors
  return showErrorMessage(error.detail);
};
```

### **4. Resilience Implementation**
```typescript
// Use retry logic for critical operations
const retryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000
};

// Implement offline detection
const checkConnectivity = async () => {
  try {
    await fetch('/api/v1/health');
    return true;
  } catch {
    return false;
  }
};
```

---

## 📝 Testing Requirements

### **Track B Must Test:**
1. **Admin Dashboard**: All CRUD operations with proper authentication
2. **Storefront**: Product browsing without authentication
3. **Subdomain Handling**: Real-time availability checking
4. **Error Scenarios**: Network failures, validation errors, auth failures
5. **Offline Mode**: Graceful degradation when connectivity is poor
6. **Performance**: Response times under 500ms for all operations

### **Integration Test Scenarios:**
1. **Complete Merchant Onboarding**: Signup → Subdomain Assignment → Dashboard Access
2. **Product Management**: Create → Edit → Delete products
3. **Customer Shopping**: Browse → Cart → Checkout
4. **Multi-Tenant Isolation**: Ensure data separation between merchants

---

**Last Updated**: [Current Date]
**Version**: 1.0
**Track A Contact**: [Contact Info]