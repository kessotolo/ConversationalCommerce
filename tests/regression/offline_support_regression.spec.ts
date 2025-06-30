import { test, expect } from '@playwright/test';

test.describe('Offline Support Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to application
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });
  
  test('should cache critical data for offline use', async ({ page }) => {
    // First load page with network to populate cache
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
    
    // Wait for data to be fully loaded
    await expect(page.locator('.analytics-chart')).toBeVisible();
    
    // Check local storage to ensure data was cached
    const storedData = await page.evaluate(() => {
      const keys = Object.keys(localStorage).filter(key => 
        key.includes('offline-data') || key.includes('cache')
      );
      
      return keys.reduce((acc, key) => {
        acc[key] = localStorage.getItem(key);
        return acc;
      }, {});
    });
    
    // Should have at least one cache entry
    expect(Object.keys(storedData).length).toBeGreaterThan(0);
    
    // Go offline and reload
    await page.context().setOffline(true);
    await page.reload();
    
    // Should still show cached data with offline indicator
    await expect(page.locator('.offline-indicator')).toBeVisible();
    await expect(page.locator('.analytics-chart')).toBeVisible();
    
    // Go back online
    await page.context().setOffline(false);
    
    // Offline indicator should disappear after reconnection
    await expect(page.locator('.offline-indicator')).not.toBeVisible({ timeout: 5000 });
  });
  
  test('should queue operations when offline', async ({ page }) => {
    // Go to a page where you can perform operations
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');
    
    // Go offline
    await page.context().setOffline(true);
    
    // Try to perform an operation (e.g., mark order as processed)
    await page.click('.order-item:first-child');
    await page.click('text=Mark as Processed');
    
    // Should show queued operation indicator
    await expect(page.locator('.offline-operation-queued')).toBeVisible();
    
    // Check that operation was queued in storage
    const queuedOps = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('offline-operations-queue') || '[]');
    });
    
    expect(queuedOps.length).toBeGreaterThan(0);
    expect(queuedOps[0]).toHaveProperty('type', 'update_order_status');
    
    // Go back online
    await page.context().setOffline(false);
    
    // Wait for queued operations to process
    await expect(page.locator('.sync-in-progress')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('.sync-complete')).toBeVisible({ timeout: 10000 });
    
    // Queue should be empty after sync
    const remainingOps = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('offline-operations-queue') || '[]');
    });
    
    expect(remainingOps.length).toBe(0);
  });
  
  test('should handle connection loss during form submission', async ({ page }) => {
    // Go to create product page
    await page.goto('/products/new');
    await page.waitForLoadState('networkidle');
    
    // Fill out form
    await page.fill('[name="name"]', 'Test Product');
    await page.fill('[name="price"]', '19.99');
    await page.fill('[name="description"]', 'This is a test product');
    
    // Go offline just before submission
    await page.context().setOffline(true);
    
    // Submit form
    await page.click('text=Create Product');
    
    // Should show offline submission message
    await expect(page.locator('.offline-form-saved')).toBeVisible();
    
    // Form data should be saved in localStorage
    const savedForms = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('offline-forms') || '{}');
    });
    
    expect(Object.keys(savedForms).length).toBeGreaterThan(0);
    
    // Go back online
    await page.context().setOffline(false);
    
    // Should automatically try to submit the form
    await expect(page.locator('.submitting-saved-form')).toBeVisible({ timeout: 5000 });
    
    // Eventually should show success
    await expect(page.locator('.success-message')).toBeVisible({ timeout: 10000 });
    
    // Saved form should be removed from storage
    const remainingForms = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('offline-forms') || '{}');
    });
    
    expect(Object.keys(remainingForms).length).toBe(0);
  });
  
  test('should prefetch critical resources for offline use', async ({ page }) => {
    // Visit homepage to trigger prefetching
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check if resources were prefetched
    const cacheStatus = await page.evaluate(async () => {
      if (!('caches' in window)) return { supported: false };
      
      const cache = await caches.open('offline-critical');
      const keys = await cache.keys();
      
      return { 
        supported: true,
        cacheSize: keys.length,
        hasCriticalAssets: keys.some(req => req.url.includes('critical.css') || req.url.includes('offline.js'))
      };
    });
    
    if (cacheStatus.supported) {
      expect(cacheStatus.cacheSize).toBeGreaterThan(0);
      expect(cacheStatus.hasCriticalAssets).toBeTruthy();
    }
    
    // Go offline and navigate to another page
    await page.context().setOffline(true);
    
    // Try to navigate to orders page
    await page.goto('/orders');
    
    // Should be able to load at least basic structure
    await expect(page.locator('.app-shell')).toBeVisible();
    await expect(page.locator('.offline-page-message')).toBeVisible();
    
    // Verify offline fallback UI is shown
    const offlineFallbackUI = await page.locator('.offline-fallback').isVisible();
    expect(offlineFallbackUI).toBeTruthy();
  });
  
  test('should recover gracefully when connection is unstable', async ({ page }) => {
    // Visit a data-heavy page
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
    
    // Function to simulate unstable connection
    const simulateUnstableConnection = async () => {
      // Sequence: online -> offline -> online -> offline -> online
      await page.context().setOffline(false);
      await page.waitForTimeout(1000);
      
      await page.context().setOffline(true);
      await page.waitForTimeout(1000);
      
      await page.context().setOffline(false);
      await page.waitForTimeout(1000);
      
      await page.context().setOffline(true);
      await page.waitForTimeout(1000);
      
      await page.context().setOffline(false);
    };
    
    // Trigger data refresh while simulating unstable connection
    await page.click('text=Refresh Data');
    await simulateUnstableConnection();
    
    // Should show some kind of connection status indicator
    await expect(page.locator('.connection-status')).toBeVisible();
    
    // Eventually should recover and show data
    await expect(page.locator('.analytics-chart')).toBeVisible({ timeout: 10000 });
    
    // Should not have any visible error messages
    expect(await page.locator('.error-message').count()).toBe(0);
    
    // Check the connection retry counter
    const retryCount = await page.evaluate(() => {
      return parseInt(document.querySelector('.connection-retry-count')?.textContent || '0');
    });
    
    // Should have attempted retries during unstable period
    expect(retryCount).toBeGreaterThan(0);
  });
});
