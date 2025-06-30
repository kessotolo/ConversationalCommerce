import { test, expect } from '@playwright/test';
import { devices } from '@playwright/test';

test.describe('Touch Targets and UI Adaptations Regression Tests', () => {
  test('should apply proper touch target sizing across the application', async ({ browser }) => {
    // Use mobile device context
    const context = await browser.newContext({
      ...devices['Pixel 5']
    });
    
    const page = await context.newPage();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to multiple pages to check touch targets throughout the app
    const pagesToTest = ['/products', '/orders', '/analytics', '/settings'];
    
    for (const pagePath of pagesToTest) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
      
      // Check all TouchTargetArea components on the page
      const touchTargets = await page.$$('.touch-target-area');
      
      for (const target of touchTargets) {
        const box = await target.boundingBox();
        
        if (box) {
          // Touch targets should meet minimum size standards (44px)
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
      
      // Check buttons and other interactive elements
      const interactiveElements = await page.$$('button, a[role="button"], input[type="checkbox"], input[type="radio"]');
      
      for (const element of interactiveElements) {
        const box = await element.boundingBox();
        
        if (box) {
          // Interactive elements should also have adequate touch size
          const minDimension = Math.min(box.width, box.height);
          expect(minDimension).toBeGreaterThanOrEqual(40);
        }
      }
    }
    
    await context.close();
  });
  
  test('should adjust touch target size based on device type', async ({ browser }) => {
    // Test with different device types
    const deviceTests = [
      { name: 'Low-end phone', device: devices['Galaxy S5'], expectedMinSize: 48 },
      { name: 'Modern phone', device: devices['Pixel 5'], expectedMinSize: 44 },
      { name: 'Tablet', device: devices['iPad Pro 11'], expectedMinSize: 44 },
      { name: 'Desktop with touch', viewport: { width: 1280, height: 800 }, expectedMinSize: 40 }
    ];
    
    for (const { name, device, expectedMinSize } of deviceTests) {
      const context = await browser.newContext({
        ...device,
        hasTouch: true
      });
      
      // For low-end phone, add additional configuration
      if (name === 'Low-end phone') {
        const page = await context.newPage();
        await page.addInitScript(() => {
          Object.defineProperty(navigator, 'hardwareConcurrency', {
            get: () => 2
          });
          window.localStorage.setItem('debug-simulate-low-end-device', 'true');
        });
        
        await page.goto('/products');
        await page.waitForLoadState('networkidle');
        
        // Get the touch target size from a component
        const touchTarget = await page.$('.touch-target-area');
        if (touchTarget) {
          const box = await touchTarget.boundingBox();
          if (box) {
            // Low-end devices should have larger touch targets for accessibility
            const minDimension = Math.min(box.width, box.height);
            expect(minDimension).toBeGreaterThanOrEqual(expectedMinSize);
          }
        }
      }
      
      await context.close();
    }
  });
  
  test('should provide visual feedback for touch interactions', async ({ browser }) => {
    // Use mobile device with touch
    const context = await browser.newContext({
      ...devices['Pixel 5'],
      hasTouch: true
    });
    
    const page = await context.newPage();
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    
    // Find a button to test
    const button = await page.$('button');
    
    if (button) {
      // Get initial styles
      const initialStyles = await button.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          backgroundColor: styles.backgroundColor,
          transform: styles.transform,
          opacity: styles.opacity
        };
      });
      
      // Touch the button (but don't release)
      await button.tap({ timeout: 100, force: true });
      
      // Get styles during touch
      const touchStyles = await button.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          backgroundColor: styles.backgroundColor,
          transform: styles.transform,
          opacity: styles.opacity
        };
      });
      
      // Should have visual differences to indicate touch state
      const hasFeedback = initialStyles.backgroundColor !== touchStyles.backgroundColor ||
                         initialStyles.transform !== touchStyles.transform ||
                         initialStyles.opacity !== touchStyles.opacity;
                         
      expect(hasFeedback).toBeTruthy();
    }
    
    await context.close();
  });
  
  test('should adapt UI layout based on viewport size', async ({ browser }) => {
    const viewportSizes = [
      { width: 320, height: 568, name: 'small-phone' },
      { width: 375, height: 667, name: 'medium-phone' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1280, height: 800, name: 'desktop' }
    ];
    
    for (const viewport of viewportSizes) {
      const context = await browser.newContext({
        viewport,
        userAgent: 'Mozilla/5.0 (compatible; TestUserAgent)'
      });
      
      const page = await context.newPage();
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Check layout adaptation
      const layout = await page.evaluate((deviceName) => {
        return {
          deviceClass: document.documentElement.className.includes(deviceName),
          menuType: document.querySelector('.mobile-menu') ? 'mobile' : 
                   document.querySelector('.tablet-menu') ? 'tablet' : 'desktop',
          columnCount: getComputedStyle(document.querySelector('.dashboard-grid')).gridTemplateColumns.split(' ').length,
          fontSize: getComputedStyle(document.body).fontSize
        };
      }, viewport.name);
      
      // Verify appropriate layout for viewport size
      if (viewport.width < 768) {
        expect(layout.menuType).toBe('mobile');
        expect(layout.columnCount).toBeLessThanOrEqual(2);
      } else if (viewport.width >= 768 && viewport.width < 1024) {
        expect(layout.menuType).toBe('tablet');
        expect(layout.columnCount).toBeGreaterThanOrEqual(2);
      } else {
        expect(layout.menuType).toBe('desktop');
        expect(layout.columnCount).toBeGreaterThanOrEqual(3);
      }
      
      await context.close();
    }
  });
  
  test('should adapt UI density based on device and input method', async ({ browser }) => {
    // Compare touch vs mouse-based layouts
    
    // First with touch device
    const touchContext = await browser.newContext({
      ...devices['Pixel 5'],
      hasTouch: true
    });
    
    const touchPage = await touchContext.newPage();
    await touchPage.goto('/orders');
    await touchPage.waitForLoadState('networkidle');
    
    // Measure touch UI density
    const touchMetrics = await touchPage.evaluate(() => {
      const list = document.querySelector('.order-list');
      const items = document.querySelectorAll('.order-item');
      if (!list || items.length === 0) return null;
      
      const itemHeight = items[0].getBoundingClientRect().height;
      
      return {
        itemHeight,
        listPadding: getComputedStyle(list).padding,
        itemMargin: getComputedStyle(items[0]).marginBottom
      };
    });
    
    await touchContext.close();
    
    // Then with mouse-based device
    const mouseContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      hasTouch: false
    });
    
    const mousePage = await mouseContext.newPage();
    await mousePage.goto('/orders');
    await mousePage.waitForLoadState('networkidle');
    
    // Measure mouse UI density
    const mouseMetrics = await mousePage.evaluate(() => {
      const list = document.querySelector('.order-list');
      const items = document.querySelectorAll('.order-item');
      if (!list || items.length === 0) return null;
      
      const itemHeight = items[0].getBoundingClientRect().height;
      
      return {
        itemHeight,
        listPadding: getComputedStyle(list).padding,
        itemMargin: getComputedStyle(items[0]).marginBottom
      };
    });
    
    await mouseContext.close();
    
    if (touchMetrics && mouseMetrics) {
      // Touch UI should be more spaced out than mouse UI
      expect(touchMetrics.itemHeight).toBeGreaterThan(mouseMetrics.itemHeight);
    }
  });
  
  test('should apply appropriate visual feedback states for different input methods', async ({ browser }) => {
    // Test with mouse input
    const mouseContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      hasTouch: false
    });
    
    const mousePage = await mouseContext.newPage();
    await mousePage.goto('/products');
    await mousePage.waitForLoadState('networkidle');
    
    // Check for hover state
    const button = await mousePage.$('button');
    if (button) {
      const initialStyle = await button.evaluate(el => window.getComputedStyle(el).backgroundColor);
      
      await button.hover();
      
      const hoverStyle = await button.evaluate(el => window.getComputedStyle(el).backgroundColor);
      
      // Should have hover state
      expect(initialStyle).not.toBe(hoverStyle);
    }
    
    await mouseContext.close();
    
    // Test with touch input
    const touchContext = await browser.newContext({
      ...devices['Pixel 5'],
      hasTouch: true
    });
    
    const touchPage = await touchContext.newPage();
    await touchPage.goto('/products');
    await touchPage.waitForLoadState('networkidle');
    
    // Check if touch-specific feedback works
    const hasTouchFeedback = await touchPage.evaluate(() => {
      // Check for touch-specific CSS
      const styleSheets = document.styleSheets;
      let hasTouchStyles = false;
      
      for (const sheet of styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule.selectorText && (
                rule.selectorText.includes(':active') || 
                rule.selectorText.includes('touch') ||
                rule.selectorText.includes('--touch')
            )) {
              hasTouchStyles = true;
              break;
            }
          }
        } catch (e) {
          // Skip crossorigin stylesheets
          continue;
        }
      }
      
      return hasTouchStyles;
    });
    
    expect(hasTouchFeedback).toBeTruthy();
    
    await touchContext.close();
  });
});
