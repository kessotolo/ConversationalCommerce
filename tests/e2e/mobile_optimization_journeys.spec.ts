import { test, expect, devices, Page } from '@playwright/test';

// Common functions for the test suite
async function waitForNetworkIdle(page: Page) {
  await page.waitForLoadState('networkidle');
}

async function simulateOfflineMode(page: Page) {
  await page.context().setOffline(true);
}

async function simulateOnlineMode(page: Page) {
  await page.context().setOffline(false);
}

async function simulateSlowNetwork(page: Page) {
  // Simulate a slow 3G connection
  await page.route('**/*', (route) => {
    route.continue({
      delay: 200 + Math.floor(Math.random() * 200) // Add 200-400ms delay
    });
  });
}

test.describe('Mobile User Journeys', () => {
  test.use({ 
    ...devices['Pixel 4a'] // Use low-mid range mobile device emulation
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    await waitForNetworkIdle(page);
  });

  test('should load mobile-optimized dashboard with correct touch targets', async ({ page }) => {
    // Navigate to dashboard
    await page.click('text=Dashboard');
    await waitForNetworkIdle(page);

    // Verify mobile optimization is applied
    const html = await page.$('html');
    const htmlClass = await html?.getAttribute('class');
    expect(htmlClass).toContain('mobile-device');

    // Check touch target sizes meet accessibility standards
    const buttons = await page.$$('button, a[role="button"], .touch-target-area');
    for (const button of buttons) {
      const box = await button.boundingBox();
      if (box) {
        // Touch targets should be at least 44px (minimum mobile standard)
        expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
      }
    }
    
    // Verify performance monitoring is active
    const performanceData = await page.evaluate(() => {
      return window['__PERFORMANCE_METRICS__'] || null;
    });
    expect(performanceData).not.toBeNull();
  });

  test('should handle offline mode during analytics viewing', async ({ page }) => {
    // Navigate to the analytics section
    await page.click('text=Analytics');
    await waitForNetworkIdle(page);
    
    // Verify analytics data is loaded
    const analyticsCharts = await page.$$('.analytics-chart');
    expect(analyticsCharts.length).toBeGreaterThan(0);
    
    // Store current analytics data for comparison
    const initialData = await page.evaluate(() => {
      // Get serializable data from the page
      const dataElements = document.querySelectorAll('.analytics-data-point');
      return Array.from(dataElements).map(el => el.textContent);
    });
    
    // Simulate device going offline
    await simulateOfflineMode(page);
    
    // Try to refresh analytics
    await page.click('text=Refresh Data');
    
    // Verify offline indicator is shown
    await expect(page.locator('.offline-indicator')).toBeVisible();
    
    // Verify cached data is still displayed
    const offlineData = await page.evaluate(() => {
      const dataElements = document.querySelectorAll('.analytics-data-point');
      return Array.from(dataElements).map(el => el.textContent);
    });
    
    // Data should persist even offline
    expect(offlineData).toEqual(initialData);
    
    // Go back online
    await simulateOnlineMode(page);
    
    // Wait for online indication and fresh data
    await expect(page.locator('.offline-indicator')).toBeHidden({timeout: 5000});
    
    // Click refresh again to get fresh data
    await page.click('text=Refresh Data');
    await waitForNetworkIdle(page);
    
    // Verify data refreshed (might be same or different depending on backend)
    const refreshedData = await page.evaluate(() => {
      const dataElements = document.querySelectorAll('.analytics-data-point');
      return Array.from(dataElements).map(el => el.textContent);
    });
    
    // At least verify we got some data after refresh
    expect(refreshedData.length).toBeGreaterThan(0);
  });
  
  test('should adjust UI for low-end device simulation', async ({ page }) => {
    // Override the performance detection to simulate a low-end device
    await page.addInitScript(() => {
      // Mock hardware concurrency to simulate a low-end device
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => 2 
      });
      
      // Store the override so our app detects it
      window.localStorage.setItem('debug-simulate-low-end-device', 'true');
    });
    
    // Reload the page to apply the simulation
    await page.reload();
    await waitForNetworkIdle(page);
    
    // Navigate to a data-heavy page like products
    await page.click('text=Products');
    await waitForNetworkIdle(page);
    
    // Verify simplified UI is shown
    const html = await page.$('html');
    const htmlClass = await html?.getAttribute('class');
    expect(htmlClass).toContain('low-end-device');
    
    // Check if pagination is reduced
    const paginationSize = await page.evaluate(() => {
      const paginationInfo = document.querySelector('.pagination-info');
      return paginationInfo ? paginationInfo.textContent : '';
    });
    
    // Low-end device should use smaller page sizes (10 instead of 20+)
    expect(paginationSize).toMatch(/1-\d{1,2} of/);
    
    // Check if animations are disabled
    const animationsDisabled = await page.evaluate(() => {
      return document.body.classList.contains('reduce-motion') || 
             getComputedStyle(document.documentElement).getPropertyValue('--use-animations') === 'none';
    });
    expect(animationsDisabled).toBeTruthy();
  });
  
  test('should handle offline checkout process with reconnection', async ({ page }) => {
    // Navigate to a product
    await page.click('text=Products');
    await waitForNetworkIdle(page);
    
    await page.click('.product-card:first-child');
    await waitForNetworkIdle(page);
    
    // Add to cart
    await page.click('text=Add to Cart');
    
    // Go to checkout
    await page.click('text=Checkout');
    await waitForNetworkIdle(page);
    
    // Fill out shipping information
    await page.fill('[name="name"]', 'Test User');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="address"]', '123 Main St');
    await page.fill('[name="city"]', 'Anytown');
    await page.fill('[name="state"]', 'CA');
    await page.fill('[name="zip"]', '12345');
    
    // Start the payment process
    await page.click('text=Continue to Payment');
    await waitForNetworkIdle(page);
    
    // Simulate going offline right before submitting payment
    await simulateOfflineMode(page);
    
    // Try to submit payment
    await page.click('text=Complete Purchase');
    
    // Should show offline payment queue message
    await expect(page.locator('.offline-payment-notification')).toBeVisible();
    await expect(page.getByText(/Your payment will be processed automatically/)).toBeVisible();
    
    // Go back online
    await simulateOnlineMode(page);
    
    // Wait for automatic processing when back online
    await expect(page.locator('.payment-processing')).toBeVisible({timeout: 5000});
    await waitForNetworkIdle(page);
    
    // Should eventually show success
    await expect(page.locator('.payment-success')).toBeVisible({timeout: 10000});
    await expect(page.getByText(/Thank you for your purchase/)).toBeVisible();
  });
  
  test('should optimize performance under slow network conditions', async ({ page }) => {
    // First measure normal navigation time
    const normalStart = Date.now();
    await page.goto('/products');
    await waitForNetworkIdle(page);
    const normalDuration = Date.now() - normalStart;
    
    // Now simulate slow network
    await simulateSlowNetwork(page);
    
    // Enable performance monitoring
    await page.evaluate(() => {
      window.localStorage.setItem('enable-performance-monitoring', 'true');
    });
    
    // Reload the page with slow network
    const slowStart = Date.now();
    await page.reload();
    
    // Wait for optimization indicator
    await expect(page.locator('.network-optimization-active')).toBeVisible({timeout: 10000});
    
    // Should load with reduced quality images
    const imageQuality = await page.evaluate(() => {
      const img = document.querySelector('.product-image img');
      if (img && img.src.includes('quality=')) {
        const match = img.src.match(/quality=(\d+)/);
        return match ? parseInt(match[1]) : null;
      }
      return null;
    });
    
    // If quality parameter exists, it should be reduced for slow network
    if (imageQuality !== null) {
      expect(imageQuality).toBeLessThanOrEqual(70);
    }
    
    // Check if performance metrics were recorded
    const performanceData = await page.evaluate(() => {
      return window['__PERFORMANCE_METRICS__'] || null;
    });
    
    expect(performanceData).not.toBeNull();
    if (performanceData && performanceData.measurements) {
      expect(performanceData.measurements).toHaveProperty('LCP');
    }
    
    // Verify performance overlay is available in development mode
    await page.evaluate(() => {
      window.localStorage.setItem('show-performance-overlay', 'true');
    });
    await page.reload();
    
    // Performance overlay should be visible
    await expect(page.locator('#performance-audit-overlay')).toBeVisible();
  });
});

// Test with multiple different device profiles
test.describe('Cross-device Compatibility', () => {
  // Test on various devices
  for (const [deviceName, device] of Object.entries({
    mobile: devices['Pixel 4a'],
    tablet: devices['iPad (gen 7)'],
    desktop: { viewport: { width: 1280, height: 800 } }
  })) {
    test(`should adapt UI appropriately on ${deviceName}`, async ({ browser }) => {
      // Create a new context with the device settings
      const context = await browser.newContext({
        ...device
      });
      
      const page = await context.newPage();
      await page.goto('/');
      await waitForNetworkIdle(page);
      
      // Check if the device class is correctly applied
      const html = await page.$('html');
      const htmlClass = await html?.getAttribute('class');
      
      if (deviceName === 'mobile') {
        expect(htmlClass).toContain('mobile-device');
      } else if (deviceName === 'tablet') {
        expect(htmlClass).toContain('tablet-device');
      } else {
        expect(htmlClass).toContain('desktop-device');
      }
      
      // Verify responsive layout
      if (deviceName === 'mobile') {
        // Mobile should have hamburger menu
        await expect(page.locator('.mobile-menu-toggle')).toBeVisible();
      } else {
        // Desktop should have horizontal menu
        await expect(page.locator('.desktop-nav')).toBeVisible();
      }
      
      // Test a common interactive element
      await page.click('text=Products');
      await waitForNetworkIdle(page);
      
      // Get number of products per row to verify responsive grid
      const productsPerRow = await page.evaluate(() => {
        const containerWidth = document.querySelector('.product-grid').getBoundingClientRect().width;
        const productWidth = document.querySelector('.product-card').getBoundingClientRect().width;
        return Math.floor(containerWidth / productWidth);
      });
      
      // Different devices should have different grid layouts
      if (deviceName === 'mobile') {
        expect(productsPerRow).toBeLessThanOrEqual(2); // 1-2 products per row on mobile
      } else if (deviceName === 'tablet') {
        expect(productsPerRow).toBeGreaterThanOrEqual(2); // 2+ products per row on tablet
        expect(productsPerRow).toBeLessThanOrEqual(4);
      } else {
        expect(productsPerRow).toBeGreaterThanOrEqual(4); // 4+ products per row on desktop
      }
    });
  }
});
