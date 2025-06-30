import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react-hooks';
import mobileOptimizationService from '../../src/services/MobileOptimizationService';
import { useOfflineData } from '../../src/modules/shared/hooks/useOfflineData';
import { setupServer } from 'msw/node';
import { rest } from 'msw';

// Mock API server using MSW
const server = setupServer(
  // Mock device info endpoint
  rest.get('/api/v1/device-info', (req, res, ctx) => {
    return res(
      ctx.json({
        deviceType: 'mobile',
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        performanceClass: 'medium',
        isLowEndDevice: false,
        viewport: {
          width: 375,
          height: 667
        },
        os: {
          name: 'iOS',
          version: '14.0'
        },
        recommendations: {
          imageQuality: 80,
          touchTargetSize: 44,
          useAnimations: true,
          paginationSize: 20
        }
      })
    );
  }),
  
  // Mock network quality test endpoint
  rest.get('/api/v1/network-quality-test', (req, res, ctx) => {
    return res(
      ctx.json({
        latency: 150,
        throughput: '3.5mbps',
        qualityRating: 'medium',
        recommendations: {
          imageQuality: 75,
          batchSize: 10,
          prefetchDepth: 2,
          useLiteMode: false
        }
      })
    );
  }),
  
  // Mock performance metrics endpoint
  rest.post('/api/v1/performance-metrics', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        metricCount: 2,
        anomaliesDetected: false
      })
    );
  }),
  
  // Mock offline data endpoint
  rest.get('/api/v1/test-data', (req, res, ctx) => {
    return res(
      ctx.json({
        items: [1, 2, 3, 4, 5],
        timestamp: new Date().toISOString()
      })
    );
  }),
  
  // Mock sync offline changes endpoint
  rest.post('/api/v1/sync-offline-changes', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        results: [
          {
            endpoint: '/api/v1/orders',
            serverOrderId: 'server-123',
            status: 'synced',
            conflictResolution: null
          }
        ]
      })
    );
  })
);

// Setup and teardown
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('MobileOptimizationService Integration Tests', () => {
  let originalFetch: typeof global.fetch;
  
  beforeEach(() => {
    originalFetch = global.fetch;
    
    // Mock window properties
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 667, writable: true });
    Object.defineProperty(window, 'navigator', {
      value: {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
        connection: {
          effectiveType: '4g',
          downlink: 10,
          rtt: 50,
          saveData: false
        },
        onLine: true
      },
      writable: true
    });
    
    // Reset singleton state between tests
    mobileOptimizationService['deviceInfo'] = null;
    mobileOptimizationService['networkStatus'] = null;
    mobileOptimizationService['apiDeviceInfo'] = null;
    mobileOptimizationService['listeners'] = [];
  });
  
  afterEach(() => {
    global.fetch = originalFetch;
    vi.resetAllMocks();
  });
  
  it('should fetch device recommendations from API', async () => {
    const recommendations = await mobileOptimizationService.fetchDeviceRecommendations();
    
    expect(recommendations).toEqual({
      imageQuality: 80,
      touchTargetSize: 44,
      useAnimations: true,
      paginationSize: 20
    });
  });
  
  it('should test network quality and get recommendations', async () => {
    const networkQuality = await mobileOptimizationService.testNetworkQuality();
    
    expect(networkQuality).toEqual({
      latency: 150,
      throughput: '3.5mbps',
      qualityRating: 'medium',
      recommendations: {
        imageQuality: 75,
        batchSize: 10,
        prefetchDepth: 2,
        useLiteMode: false
      }
    });
  });
  
  it('should send performance metrics to API', async () => {
    const metrics = [
      {
        name: 'LCP',
        value: 1890,
        rating: 'good',
        page: '/dashboard',
        timestamp: new Date().toISOString()
      },
      {
        name: 'ComponentRender_AnalyticsChart',
        value: 95,
        rating: 'needs-improvement',
        page: '/dashboard',
        timestamp: new Date().toISOString()
      }
    ];
    
    const result = await mobileOptimizationService.sendPerformanceMetrics(metrics);
    
    expect(result).toEqual({
      success: true,
      metricCount: 2,
      anomaliesDetected: false
    });
  });
  
  it('should combine local and API device information', async () => {
    // Reset to ensure fresh fetch
    mobileOptimizationService['deviceInfo'] = null;
    mobileOptimizationService['apiDeviceInfo'] = null;
    
    const deviceInfo = await mobileOptimizationService.getEnhancedDeviceInfo();
    
    expect(deviceInfo).toHaveProperty('isMobile', true);
    expect(deviceInfo).toHaveProperty('performanceClass');
    expect(deviceInfo).toHaveProperty('recommendations');
    expect(deviceInfo.recommendations).toHaveProperty('imageQuality');
    expect(deviceInfo.recommendations).toHaveProperty('touchTargetSize');
  });
  
  it('should handle API failures gracefully', async () => {
    // Override the API to return an error
    server.use(
      rest.get('/api/v1/device-info', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );
    
    // Reset to ensure fresh fetch
    mobileOptimizationService['deviceInfo'] = null;
    mobileOptimizationService['apiDeviceInfo'] = null;
    
    // Should still return device info even when API fails
    const deviceInfo = await mobileOptimizationService.getEnhancedDeviceInfo();
    
    expect(deviceInfo).toHaveProperty('isMobile', true);
    expect(deviceInfo).toHaveProperty('performanceClass');
    // Should have fallback recommendations
    expect(deviceInfo).toHaveProperty('recommendations');
  });
});

describe('useOfflineData Hook Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    
    // Default state - online
    Object.defineProperty(window.navigator, 'onLine', { value: true, writable: true });
  });
  
  it('should fetch and cache data from API', async () => {
    const { result, waitForNextUpdate } = renderHook(() => 
      useOfflineData('/api/v1/test-data', 'test-data-key', { expiryHours: 1 })
    );
    
    // Initial state
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeNull();
    
    // Wait for data to load
    await waitForNextUpdate();
    
    // Final state
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual({
      items: [1, 2, 3, 4, 5],
      timestamp: expect.any(String)
    });
    expect(result.current.isOffline).toBe(false);
    
    // Check that data was cached
    const cachedData = JSON.parse(localStorage.getItem('test-data-key') || '{}');
    expect(cachedData.data).toEqual({
      items: [1, 2, 3, 4, 5],
      timestamp: expect.any(String)
    });
  });
  
  it('should use cached data when offline', async () => {
    // Pre-populate cache
    localStorage.setItem(
      'test-data-key',
      JSON.stringify({
        data: { items: [6, 7, 8], timestamp: new Date().toISOString() },
        timestamp: new Date().getTime()
      })
    );
    
    // Set to offline
    Object.defineProperty(window.navigator, 'onLine', { value: false });
    
    const { result, waitForNextUpdate } = renderHook(() => 
      useOfflineData('/api/v1/test-data', 'test-data-key', { expiryHours: 1 })
    );
    
    // Initial state
    expect(result.current.isLoading).toBe(true);
    
    // Wait for hook to process
    await waitForNextUpdate();
    
    // Should use cached data
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual({
      items: [6, 7, 8],
      timestamp: expect.any(String)
    });
    expect(result.current.isOffline).toBe(true);
  });
  
  it('should sync offline changes when back online', async () => {
    // Create offline changes to sync
    const offlineChanges = [
      {
        endpoint: '/api/v1/orders',
        method: 'POST',
        payload: { orderId: 'offline-123', items: [{ id: 1, quantity: 2 }] },
        timestamp: new Date().toISOString(),
        idempotencyKey: 'offline-order-123'
      }
    ];
    
    localStorage.setItem(
      'offline-changes',
      JSON.stringify(offlineChanges)
    );
    
    // Start offline
    Object.defineProperty(window.navigator, 'onLine', { value: false });
    
    const { result, waitForNextUpdate } = renderHook(() => 
      useOfflineData('/api/v1/test-data', 'test-data-key', { 
        expiryHours: 1,
        syncOfflineChangesOnReconnect: true,
        offlineChangesKey: 'offline-changes'
      })
    );
    
    await waitForNextUpdate();
    
    // Now go back online and trigger sync
    act(() => {
      Object.defineProperty(window.navigator, 'onLine', { value: true });
      window.dispatchEvent(new Event('online'));
    });
    
    // Wait for sync and refetch
    await waitForNextUpdate();
    await waitForNextUpdate();
    
    // Should be online with fresh data
    expect(result.current.isOffline).toBe(false);
    expect(result.current.data).toEqual({
      items: [1, 2, 3, 4, 5],
      timestamp: expect.any(String)
    });
    
    // Offline changes should be cleared
    expect(localStorage.getItem('offline-changes')).toBeNull();
  });
  
  it('should handle API errors gracefully', async () => {
    // Make the API fail
    server.use(
      rest.get('/api/v1/test-data', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );
    
    const { result, waitForNextUpdate } = renderHook(() => 
      useOfflineData('/api/v1/test-data', 'test-data-key', { expiryHours: 1 })
    );
    
    // Wait for API call to fail
    await waitForNextUpdate();
    
    // Should have error state
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeTruthy();
    expect(result.current.data).toBeNull();
  });
});

describe('TouchTargetArea Integration Tests', () => {
  it('should apply correct touch target size based on device recommendations', async () => {
    // This would be a more complex test in a real environment
    // that would render the TouchTargetArea component and verify
    // the computed styles match the recommendations from the API
    
    // For now we'll just verify the service method
    const touchTargetSize = await mobileOptimizationService.getRecommendedTouchTargetSize(true);
    
    // Should match the value from our mock API
    expect(touchTargetSize).toBe(44);
  });
});
