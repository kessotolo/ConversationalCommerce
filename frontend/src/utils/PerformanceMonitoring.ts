/**
 * Performance Monitoring Utility
 *
 * This utility provides tools to measure and report performance metrics
 * for the application, with a focus on mobile performance.
 *
 * It tracks:
 * - Core Web Vitals (LCP, FID, CLS)
 * - Custom metrics (component render time, data loading time)
 * - JavaScript execution time
 * - Network request performance
 */

interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

interface TimingMarker {
  start: number;
  end?: number;
  duration?: number;
}

class PerformanceMonitoring {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private timings: Map<string, TimingMarker> = new Map();
  private listeners: ((metrics: PerformanceMetric[]) => void)[] = [];
  private enabled: boolean = true;
  private debugging: boolean = false;

  constructor() {
    this.initCoreWebVitals();
    this.initPerformanceObserver();
  }

  /**
   * Initialize monitoring of Core Web Vitals
   */
  private initCoreWebVitals(): void {
    // Only run in browser environment
    if (typeof window === 'undefined') return;

    try {
      // Dynamic import to avoid server-side issues
      import('web-vitals').then(({ onLCP, onINP, onCLS }) => {
        onLCP(({ value }: { value: number }) => {
          this.recordMetric('LCP', value, this.rateMetric('LCP', value));
        });

        onINP(({ value }: { value: number }) => {
          this.recordMetric('INP', value, this.rateMetric('INP', value));
        });

        onCLS(({ value }: { value: number }) => {
          this.recordMetric('CLS', value, this.rateMetric('CLS', value));
        });
      }).catch(err => {
        console.warn('Failed to load web-vitals library:', err);
      });
    } catch (err) {
      console.warn('Could not initialize Core Web Vitals monitoring:', err);
    }
  }

  /**
   * Initialize Performance Observer
   */
  private initPerformanceObserver(): void {
    if (typeof window === 'undefined' || !window.PerformanceObserver) return;

    try {
      // Monitor long tasks
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const duration = entry.duration;

          if (duration > 50) {
            this.recordMetric('LongTask', duration, this.rateMetric('LongTask', duration));

            if (this.debugging) {
              console.warn(`Long task detected: ${duration.toFixed(2)}ms`, entry);
            }
          }
        }
      });

      longTaskObserver.observe({ entryTypes: ['longtask'] });

      // Monitor resource loading
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as PerformanceResourceTiming[]) {
          const resourceType = entry.initiatorType;
          const duration = entry.duration;

          // Track script, css, and fetch/xmlhttprequest loading times
          if (['script', 'css', 'fetch', 'xmlhttprequest'].includes(resourceType)) {
            this.recordMetric(`Resource_${resourceType}`, duration, this.rateMetric('Resource', duration));

            // Log slow resource loads
            if (duration > 1000 && this.debugging) {
              console.warn(`Slow resource load (${resourceType}): ${duration.toFixed(2)}ms`, entry.name);
            }
          }
        }
      });

      resourceObserver.observe({ entryTypes: ['resource'] });

    } catch (err) {
      console.warn('Could not initialize PerformanceObserver:', err);
    }
  }

  /**
   * Rate a metric as good, needs improvement, or poor
   */
  private rateMetric(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    switch (name) {
      case 'LCP': // Largest Contentful Paint (ms)
        return value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor';

      case 'INP': // Interaction to Next Paint (ms)
        return value <= 200 ? 'good' : value <= 500 ? 'needs-improvement' : 'poor';

      case 'CLS': // Cumulative Layout Shift (unitless)
        return value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor';

      case 'TTI': // Time to Interactive (ms)
        return value <= 3500 ? 'good' : value <= 7500 ? 'needs-improvement' : 'poor';

      case 'FCP': // First Contentful Paint (ms)
        return value <= 1800 ? 'good' : value <= 3000 ? 'needs-improvement' : 'poor';

      case 'LongTask': // Long Task Duration (ms)
        return value <= 100 ? 'good' : value <= 200 ? 'needs-improvement' : 'poor';

      case 'Resource': // Resource Loading Time (ms)
        return value <= 500 ? 'good' : value <= 1000 ? 'needs-improvement' : 'poor';

      case 'ComponentRender': // Component Render Time (ms)
        return value <= 50 ? 'good' : value <= 100 ? 'needs-improvement' : 'poor';

      case 'DataLoad': // Data Loading Time (ms)
        return value <= 300 ? 'good' : value <= 1000 ? 'needs-improvement' : 'poor';

      default:
        return value < 100 ? 'good' : value < 500 ? 'needs-improvement' : 'poor';
    }
  }

  /**
   * Record a performance metric
   */
  private recordMetric(name: string, value: number, rating: 'good' | 'needs-improvement' | 'poor'): void {
    if (!this.enabled) return;

    const metric: PerformanceMetric = {
      name,
      value,
      rating,
      timestamp: Date.now()
    };

    this.metrics.set(name, metric);
    this.notifyListeners();
  }

  /**
   * Start timing an operation
   */
  public startTiming(name: string): void {
    if (!this.enabled) return;

    this.timings.set(name, {
      start: performance.now()
    });
  }

  /**
   * End timing an operation and record the metric
   */
  public endTiming(name: string, type: 'ComponentRender' | 'DataLoad' | 'Custom' = 'Custom'): number | null {
    if (!this.enabled) return null;

    const timing = this.timings.get(name);
    if (!timing) {
      console.warn(`No timing started for: ${name}`);
      return null;
    }

    timing.end = performance.now();
    timing.duration = timing.end - timing.start;

    // Record as a metric
    this.recordMetric(
      type === 'Custom' ? `Custom_${name}` : type,
      timing.duration,
      this.rateMetric(type, timing.duration)
    );

    if (this.debugging) {
      console.log(`${name} took ${timing.duration.toFixed(2)}ms`);
    }

    return timing.duration;
  }

  /**
   * Get all recorded metrics
   */
  public getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get a specific metric by name
   */
  public getMetric(name: string): PerformanceMetric | undefined {
    return this.metrics.get(name);
  }

  /**
   * Clear all metrics
   */
  public clearMetrics(): void {
    this.metrics.clear();
  }

  /**
   * Enable or disable performance monitoring
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Enable or disable debugging
   */
  public setDebugging(enabled: boolean): void {
    this.debugging = enabled;
  }

  /**
   * Add a listener for metric updates
   */
  public addListener(callback: (metrics: PerformanceMetric[]) => void): void {
    this.listeners.push(callback);
  }

  /**
   * Remove a listener
   */
  public removeListener(callback: (metrics: PerformanceMetric[]) => void): void {
    const index = this.listeners.indexOf(callback);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Notify listeners of metric updates
   */
  private notifyListeners(): void {
    const metrics = this.getMetrics();
    this.listeners.forEach(listener => {
      try {
        listener(metrics);
      } catch (err) {
        console.error('Error in performance metric listener:', err);
      }
    });
  }
}

// Create singleton instance
const performanceMonitoring = new PerformanceMonitoring();
export default performanceMonitoring;
