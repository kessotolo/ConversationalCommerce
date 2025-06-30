import { test, expect } from '@playwright/test';
import { devices } from '@playwright/test';

// Regression tests specifically for device detection functionality
test.describe('Device Detection Regression Tests', () => {
  // Test with different device types to ensure proper detection
  const deviceTests = [
    { name: 'Mobile', device: devices['Pixel 5'], expectedClass: 'mobile-device' },
    { name: 'Tablet', device: devices['iPad Pro 11'], expectedClass: 'tablet-device' },
    { name: 'Desktop', viewport: { width: 1920, height: 1080 }, expectedClass: 'desktop-device' }
  ];

  for (const { name, device, expectedClass } of deviceTests) {
    test(`should correctly detect ${name} device type`, async ({ browser }) => {
      const context = await browser.newContext({
        ...device
      });
      
      const page = await context.newPage();
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Check if correct device class is applied
      const html = await page.$('html');
      const htmlClass = await html?.getAttribute('class');
      expect(htmlClass).toContain(expectedClass);
      
      // Verify device-specific UI elements
      if (expectedClass === 'mobile-device') {
        await expect(page.locator('.mobile-menu-toggle')).toBeVisible();
      } else if (expectedClass === 'desktop-device') {
        await expect(page.locator('.desktop-nav')).toBeVisible();
      }
      
      await context.close();
    });
  }
  
  test('should adapt to device rotation', async ({ browser }) => {
    // Start with mobile in portrait
    const context = await browser.newContext({
      ...devices['Pixel 5']
    });
    
    const page = await context.newPage();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check initial portrait layout
    const portraitLayout = await page.evaluate(() => {
      return {
        menuVisible: !!document.querySelector('.mobile-menu-toggle'),
        columnCount: document.querySelector('.product-grid')?.getAttribute('data-columns') || '1'
      };
    });
    
    // Simulate rotation to landscape
    await context.setViewportSize({ width: 915, height: 412 }); // Pixel 5 dimensions rotated
    
    // Allow time for responsive layout to adjust
    await page.waitForTimeout(500);
    
    // Check landscape layout changes
    const landscapeLayout = await page.evaluate(() => {
      return {
        menuVisible: !!document.querySelector('.mobile-menu-toggle'),
        columnCount: document.querySelector('.product-grid')?.getAttribute('data-columns') || '1'
      };
    });
    
    // Menu should still be visible in both orientations
    expect(portraitLayout.menuVisible).toBeTruthy();
    expect(landscapeLayout.menuVisible).toBeTruthy();
    
    // Column count should adapt to available width
    expect(parseInt(landscapeLayout.columnCount)).toBeGreaterThanOrEqual(
      parseInt(portraitLayout.columnCount)
    );
    
    await context.close();
  });

  test('should correctly detect low-end devices', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['Pixel 4a'],
      userAgent: 'Mozilla/5.0 (Linux; Android 5.0; SM-G900P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Mobile Safari/537.36'
    });
    
    const page = await context.newPage();
    
    // Override detection to simulate low-end device
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => 2
      });
      window.localStorage.setItem('debug-simulate-low-end-device', 'true');
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Verify low-end optimizations are applied
    const html = await page.$('html');
    const htmlClass = await html?.getAttribute('class');
    expect(htmlClass).toContain('low-end-device');
    
    // Check for simplified UI indicators
    const simplifiedUI = await page.evaluate(() => {
      return {
        reducedAnimations: document.body.classList.contains('reduce-motion'),
        simplifiedComponents: document.body.classList.contains('simplified-ui'),
        imageQuality: document.querySelector('img[data-optimized="true"]')?.getAttribute('data-quality')
      };
    });
    
    expect(simplifiedUI.reducedAnimations).toBeTruthy();
    expect(simplifiedUI.simplifiedComponents).toBeTruthy();
    
    // If image optimization is applied, quality should be reduced
    if (simplifiedUI.imageQuality) {
      expect(parseInt(simplifiedUI.imageQuality)).toBeLessThanOrEqual(70);
    }
    
    await context.close();
  });
});
