import { test, expect } from '@playwright/test';

test.describe('Performance and Accessibility Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to application and enable performance overlay for testing
    await page.goto('/');
    await page.evaluate(() => {
      window.localStorage.setItem('enable-performance-monitoring', 'true');
      window.localStorage.setItem('show-performance-overlay', 'true');
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('should record Core Web Vitals metrics', async ({ page }) => {
    // Navigate to a content-heavy page
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    
    // Wait for metrics to be populated
    await page.waitForFunction(() => {
      return window['__PERFORMANCE_METRICS__'] && 
             Object.keys(window['__PERFORMANCE_METRICS__'].metrics || {}).length > 0;
    }, { timeout: 10000 });
    
    // Get the recorded metrics
    const metrics = await page.evaluate(() => {
      return window['__PERFORMANCE_METRICS__'].metrics || {};
    });
    
    // Should have recorded Core Web Vitals
    expect(metrics).toHaveProperty('LCP');
    expect(metrics).toHaveProperty('FID');
    expect(metrics).toHaveProperty('CLS');
    
    // Should have component-specific metrics
    const hasComponentMetrics = Object.keys(metrics).some(key => 
      key.startsWith('component_') || key.includes('Render')
    );
    expect(hasComponentMetrics).toBeTruthy();
  });
  
  test('should adjust performance thresholds based on device capability', async ({ browser }) => {
    // Create context for low-end device
    const lowEndContext = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Linux; Android 5.0; SM-G900P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Mobile Safari/537.36'
    });
    
    const lowEndPage = await lowEndContext.newPage();
    
    // Simulate low-end device
    await lowEndPage.addInitScript(() => {
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => 2
      });
      window.localStorage.setItem('debug-simulate-low-end-device', 'true');
      window.localStorage.setItem('enable-performance-monitoring', 'true');
    });
    
    await lowEndPage.goto('/');
    await lowEndPage.waitForLoadState('networkidle');
    
    // Get performance thresholds for low-end device
    const lowEndThresholds = await lowEndPage.evaluate(() => {
      return window['__PERFORMANCE_CONFIG__']?.thresholds || {};
    });
    
    // Create context for high-end device
    const highEndContext = await browser.newContext({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
    });
    
    const highEndPage = await highEndContext.newPage();
    
    // Simulate high-end device
    await highEndPage.addInitScript(() => {
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => 8
      });
      window.localStorage.setItem('enable-performance-monitoring', 'true');
    });
    
    await highEndPage.goto('/');
    await highEndPage.waitForLoadState('networkidle');
    
    // Get performance thresholds for high-end device
    const highEndThresholds = await highEndPage.evaluate(() => {
      return window['__PERFORMANCE_CONFIG__']?.thresholds || {};
    });
    
    // Low-end device should have more lenient thresholds
    expect(lowEndThresholds.LCP?.poor).toBeGreaterThan(highEndThresholds.LCP?.poor || 0);
    expect(lowEndThresholds.TTI?.poor).toBeGreaterThan(highEndThresholds.TTI?.poor || 0);
    
    await lowEndContext.close();
    await highEndContext.close();
  });

  test('should enforce minimum touch target size', async ({ page }) => {
    // Navigate to a page with interactive elements
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    
    // Find all interactive elements
    const interactiveElements = await page.$$('button, a[href], [role="button"], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    
    // Check each element's dimensions
    for (const element of interactiveElements) {
      const box = await element.boundingBox();
      
      if (box) {
        // Elements should meet minimum touch target size (usually 44px)
        const minDimension = Math.min(box.width, box.height);
        expect(minDimension).toBeGreaterThanOrEqual(44);
      }
    }
  });
  
  test('should maintain accessibility when applying mobile optimizations', async ({ page }) => {
    // Navigate to a page with interactive content
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    
    // Check for basic accessibility attributes
    const accessibilityChecks = await page.evaluate(() => {
      // Get all interactive elements
      const interactiveElements = Array.from(document.querySelectorAll(
        'button, a[href], [role="button"], input, select, textarea'
      ));
      
      // Check for proper attributes
      const missingLabels = interactiveElements.filter(el => {
        const hasAriaLabel = el.hasAttribute('aria-label');
        const hasAriaLabelledBy = el.hasAttribute('aria-labelledby');
        const hasTitle = el.hasAttribute('title');
        const hasTextContent = el.textContent && el.textContent.trim().length > 0;
        const isFormControl = el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA';
        const hasLabel = isFormControl ? 
          document.querySelector(`label[for="${el.id}"]`) !== null : false;
          
        return !(hasAriaLabel || hasAriaLabelledBy || hasTitle || hasTextContent || hasLabel);
      });
      
      // Check for contrast (simplified check)
      const lowContrastElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const style = window.getComputedStyle(el);
        const hasText = el.textContent && el.textContent.trim().length > 0;
        if (!hasText) return false;
        
        // Very simplified contrast check (would use more sophisticated algorithm in real test)
        const bgColor = style.backgroundColor;
        const textColor = style.color;
        return bgColor === textColor;
      });
      
      return {
        missingLabelsCount: missingLabels.length,
        lowContrastElementsCount: lowContrastElements.length,
        hasSkipLink: document.querySelector('a[href="#main-content"]') !== null,
        keyboardFocusStylePresent: document.styleSheets.length > 0
      };
    });
    
    // Should not have unlabelled interactive elements
    expect(accessibilityChecks.missingLabelsCount).toBe(0);
    
    // Should not have low contrast text
    expect(accessibilityChecks.lowContrastElementsCount).toBe(0);
    
    // Other accessibility features should be present
    expect(accessibilityChecks.hasSkipLink).toBeTruthy();
  });
  
  test('should adapt loading behavior based on connection speed', async ({ page, context }) => {
    // Throttle network to simulate slow connection
    await context.route('**/*', route => {
      route.continue({ delay: 300 });
    });
    
    // Visit page
    await page.goto('/products');
    
    // Should show progressive loading indicators
    await expect(page.locator('.skeleton-loader')).toBeVisible();
    
    // Get performance optimizations applied
    const optimizations = await page.evaluate(() => {
      return {
        lazyLoadingApplied: document.querySelectorAll('img[loading="lazy"]').length > 0,
        lowQualityPlaceholdersUsed: document.querySelectorAll('.low-quality-placeholder').length > 0,
        priorityResourcesLoaded: document.querySelector('.critical-component') !== null
      };
    });
    
    // Should apply performance optimizations for slow connections
    expect(optimizations.lazyLoadingApplied).toBeTruthy();
    expect(optimizations.priorityResourcesLoaded).toBeTruthy();
  });
  
  test('should display performance overlay with accurate metrics in development mode', async ({ page }) => {
    // Navigate to a complex page
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
    
    // Performance audit overlay should be visible
    await expect(page.locator('#performance-audit-overlay')).toBeVisible();
    
    // Interact with the page to trigger component rendering
    await page.click('.dashboard-item:first-child');
    
    // Wait for performance metrics to update
    await page.waitForTimeout(500);
    
    // Get metrics from overlay
    const overlayMetrics = await page.evaluate(() => {
      const overlay = document.querySelector('#performance-audit-overlay');
      if (!overlay) return {};
      
      return {
        hasComponentMetrics: overlay.textContent?.includes('Component:'),
        hasNetworkMetrics: overlay.textContent?.includes('Network:'),
        hasCoreWebVitals: overlay.textContent?.includes('LCP:')
      };
    });
    
    // Overlay should show various metrics
    expect(overlayMetrics.hasComponentMetrics).toBeTruthy();
    expect(overlayMetrics.hasCoreWebVitals).toBeTruthy();
  });
});
