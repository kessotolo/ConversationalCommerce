# Mobile Optimization API Documentation

This document outlines the API endpoints and interfaces related to mobile optimization and offline support in the ConversationalCommerce platform.

## Device Detection API

### GET /api/v1/device-info

Returns information about the current device based on request headers.

**Request Headers:**
- `User-Agent`: Used to determine device type and capabilities
- `Sec-CH-UA`: Client hints for more accurate detection (Chrome browsers)
- `Sec-CH-UA-Mobile`: Indicates if the client is a mobile device
- `Sec-CH-UA-Platform`: Indicates the platform/OS

**Response:**

```json
{
  "deviceType": "mobile|tablet|desktop",
  "isMobile": true|false,
  "isTablet": true|false,
  "isDesktop": true|false,
  "performanceClass": "low|medium|high",
  "isLowEndDevice": true|false,
  "viewport": {
    "width": 375,
    "height": 667
  },
  "os": {
    "name": "iOS|Android|Windows|macOS|Linux",
    "version": "14.0|11.0|10"
  },
  "browser": {
    "name": "Chrome|Safari|Firefox",
    "version": "91.0|14.1|89.0"
  },
  "recommendations": {
    "imageQuality": 70,
    "touchTargetSize": 44,
    "useAnimations": true|false,
    "paginationSize": 20
  }
}
```

### POST /api/v1/device-metrics

Records client-side performance metrics for analytics and optimization.

**Request Body:**

```json
{
  "deviceInfo": {
    "deviceType": "mobile",
    "performanceClass": "low",
    "os": {
      "name": "Android",
      "version": "7.0"
    },
    "browser": {
      "name": "Chrome",
      "version": "88.0"
    }
  },
  "metrics": [
    {
      "name": "LCP",
      "value": 3200,
      "rating": "needs-improvement",
      "page": "/dashboard"
    },
    {
      "name": "FID",
      "value": 85,
      "rating": "good",
      "page": "/dashboard"
    },
    {
      "name": "ComponentRender_ProductList",
      "value": 320,
      "rating": "poor",
      "page": "/products"
    }
  ],
  "timestamp": "2025-06-29T20:15:23Z"
}
```

**Response:**

```json
{
  "success": true,
  "recommendedOptimizations": [
    {
      "component": "ProductList",
      "recommendation": "Consider using virtual scrolling for this component on this device"
    }
  ]
}
```

## Offline Support API

### GET /api/v1/offline-data-manifest

Returns a manifest of data that should be cached for offline use.

**Query Parameters:**
- `tenant_id`: The tenant ID to get the offline manifest for
- `module`: Optional module name to filter results (e.g. "analytics", "orders")

**Response:**

```json
{
  "version": "1.2.3",
  "lastUpdated": "2025-06-29T19:30:00Z",
  "cacheDuration": 86400,
  "resources": [
    {
      "endpoint": "/api/v1/analytics/summary",
      "priority": "high",
      "maxAge": 3600,
      "forceOffline": true
    },
    {
      "endpoint": "/api/v1/products",
      "priority": "medium",
      "maxAge": 7200,
      "forceOffline": true
    },
    {
      "endpoint": "/api/v1/orders/recent",
      "priority": "high",
      "maxAge": 1800,
      "forceOffline": true
    }
  ]
}
```

### POST /api/v1/sync-offline-changes

Synchronizes changes made offline back to the server.

**Request Body:**

```json
{
  "changes": [
    {
      "endpoint": "/api/v1/orders",
      "method": "POST",
      "payload": {
        "orderId": "offline-123456",
        "status": "draft",
        "items": [
          {
            "productId": "prod-789",
            "quantity": 2
          }
        ]
      },
      "timestamp": "2025-06-29T18:45:00Z",
      "idempotencyKey": "order-123456-2025-06-29T18:45:00Z"
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "results": [
    {
      "endpoint": "/api/v1/orders",
      "serverOrderId": "server-789012",
      "status": "synced",
      "conflictResolution": null
    }
  ]
}
```

## Network Status Monitoring

### GET /api/v1/network-quality-test

Tests the network quality and returns recommendations.

**Response:**

```json
{
  "latency": 250,
  "throughput": "1.5mbps",
  "qualityRating": "low|medium|high",
  "recommendations": {
    "imageQuality": 60,
    "batchSize": 5,
    "prefetchDepth": 1,
    "useLiteMode": true
  }
}
```

## API Integration with Frontend Components

### MobileOptimizationService

The MobileOptimizationService interacts with these APIs to provide device and network information to components:

```typescript
// Example API integration in MobileOptimizationService

async fetchDeviceRecommendations(): Promise<DeviceRecommendations> {
  try {
    const response = await fetch('/api/v1/device-info', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch device recommendations');
    }
    
    const data = await response.json();
    return data.recommendations;
  } catch (error) {
    console.error('Error fetching device recommendations:', error);
    
    // Return default recommendations if API fails
    return {
      imageQuality: 80,
      touchTargetSize: 44,
      useAnimations: true,
      paginationSize: 20
    };
  }
}
```

### OfflineDataHandler

The OfflineDataHandler uses these APIs to determine what data to cache and how to synchronize:

```typescript
// Example API integration in OfflineDataHandler

async getOfflineManifest(module?: string): Promise<OfflineManifest> {
  try {
    const url = new URL('/api/v1/offline-data-manifest', window.location.origin);
    
    if (module) {
      url.searchParams.append('module', module);
    }
    
    url.searchParams.append('tenant_id', this.tenantId);
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch offline manifest');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching offline manifest:', error);
    
    // Return default manifest if API fails
    return {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      cacheDuration: 3600,
      resources: []
    };
  }
}

async syncOfflineChanges(changes: OfflineChange[]): Promise<SyncResult> {
  try {
    const response = await fetch('/api/v1/sync-offline-changes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ changes })
    });
    
    if (!response.ok) {
      throw new Error('Failed to sync offline changes');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error syncing offline changes:', error);
    
    // Return error result if API fails
    return {
      success: false,
      results: changes.map(change => ({
        endpoint: change.endpoint,
        status: 'failed',
        error: 'Network error during synchronization'
      }))
    };
  }
}
```

## Performance Data API

### POST /api/v1/performance-metrics

Collects performance metric data for analysis.

**Request Body:**

```json
{
  "sessionId": "user-session-123",
  "tenantId": "tenant-456",
  "metrics": [
    {
      "name": "LCP",
      "value": 1890,
      "rating": "good",
      "path": "/dashboard",
      "timestamp": "2025-06-29T20:45:12Z"
    },
    {
      "name": "ComponentRender_AnalyticsChart",
      "value": 95,
      "rating": "needs-improvement",
      "path": "/dashboard",
      "timestamp": "2025-06-29T20:45:13Z"
    }
  ],
  "device": {
    "type": "mobile",
    "performanceClass": "medium",
    "browser": "Chrome 99.0",
    "os": "Android 10"
  }
}
```

**Response:**

```json
{
  "success": true,
  "metricCount": 2,
  "anomaliesDetected": false
}
```

### Integration Notes

1. **Error Handling**: All API endpoints have graceful fallbacks when network failures occur, ensuring the application remains functional even when APIs are unreachable.

2. **Caching Strategy**: Device information is cached with appropriate TTL (Time To Live) to avoid unnecessary API calls while ensuring data freshness.

3. **Minimal Payloads**: All API requests and responses are designed to be minimal in size, optimizing for low-bandwidth environments.

4. **Batching**: Performance metrics are batched and sent periodically rather than in real-time to minimize network usage.

5. **API Version Headers**: All requests include API version headers to ensure backward compatibility as these endpoints evolve.

6. **Authentication**: All endpoints require proper authentication tokens (not shown in examples for brevity) to ensure data security.

7. **Rate Limiting**: These APIs implement appropriate rate limiting to prevent abuse while allowing necessary functionality.

8. **Compression**: All responses are gzip compressed to minimize data transfer, especially important for low-bandwidth connections.

9. **CORS Policy**: These endpoints have appropriate CORS policies to ensure they can be accessed from various environments.
