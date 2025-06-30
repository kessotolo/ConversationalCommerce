/**
 * MobileOptimizationService
 * 
 * This service provides utilities and methods to optimize the application
 * for mobile devices, particularly for low-end Android devices.
 * It handles:
 * - Device detection
 * - Performance throttling for low-end devices
 * - Touch target optimization
 * - Network connection status monitoring
 * - Asset optimization
 */

import { throttle, debounce } from 'lodash';

export enum DevicePerformanceClass {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export interface NetworkStatus {
  online: boolean;
  connectionType?: string;
  effectiveType?: '4g' | '3g' | '2g' | 'slow-2g';
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  performanceClass: DevicePerformanceClass;
  isLowEndDevice: boolean;
  isTouchDevice: boolean;
  screenSize: {
    width: number;
    height: number;
  };
  pixelRatio: number;
  userAgent: string;
  viewport: {
    width: number;
    height: number;
  };
}

class MobileOptimizationService {
  private deviceInfo: DeviceInfo | null = null;
  private networkStatus: NetworkStatus = {
    online: navigator.onLine
  };
  private offlineMode = false;
  private listeners: Map<string, Function[]> = new Map();
  
  constructor() {
    this.initNetworkListeners();
    this.initDeviceDetection();
    this.initPerformanceMeasurement();
  }
  
  /**
   * Initialize network status listeners
   */
  private initNetworkListeners(): void {
    // Basic online/offline detection
    window.addEventListener('online', () => {
      this.updateNetworkStatus({ online: true });
      this.notifyListeners('network');
    });
    
    window.addEventListener('offline', () => {
      this.updateNetworkStatus({ online: false });
      this.notifyListeners('network');
    });
    
    // Use Network Information API if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      if (connection) {
        this.updateNetworkStatus({
          connectionType: connection.type,
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData
        });
        
        connection.addEventListener('change', () => {
          this.updateNetworkStatus({
            connectionType: connection.type,
            effectiveType: connection.effectiveType,
            downlink: connection.downlink,
            rtt: connection.rtt,
            saveData: connection.saveData
          });
          this.notifyListeners('network');
        });
      }
    }
  }
  
  /**
   * Initialize device detection
   */
  private initDeviceDetection(): void {
    const userAgent = navigator.userAgent || '';
    const width = window.innerWidth;
    const height = window.innerHeight;
    const pixelRatio = window.devicePixelRatio || 1;
    
    // Determine device type
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTablet = /iPad|Android(?!.*Mobile)/i.test(userAgent) || (isMobile && Math.min(width, height) > 768);
    const isDesktop = !isMobile && !isTablet;
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    
    // Determine performance class
    let performanceClass = DevicePerformanceClass.HIGH;
    
    if (/Android [1-5]\./.test(userAgent) || /iPhone OS [4-9]_/.test(userAgent)) {
      performanceClass = DevicePerformanceClass.LOW;
    } else if (/Android [6-8]\./.test(userAgent) || /iPhone OS 1[0-2]_/.test(userAgent)) {
      performanceClass = DevicePerformanceClass.MEDIUM;
    }
    
    const isLowEndDevice = performanceClass === DevicePerformanceClass.LOW;
    
    this.deviceInfo = {
      isMobile,
      isTablet,
      isDesktop,
      performanceClass,
      isLowEndDevice,
      isTouchDevice,
      screenSize: {
        width: screen.width,
        height: screen.height
      },
      pixelRatio,
      userAgent,
      viewport: {
        width,
        height
      }
    };
    
    // Set up resize listener to update viewport dimensions
    window.addEventListener('resize', debounce(() => {
      if (this.deviceInfo) {
        this.deviceInfo.viewport = {
          width: window.innerWidth,
          height: window.innerHeight
        };
        this.notifyListeners('device');
      }
    }, 250));
  }
  
  /**
   * Initialize performance measurement
   */
  private initPerformanceMeasurement(): void {
    if ('performance' in window) {
      // Monitor for long tasks
      if (PerformanceObserver && 'longtask' in PerformanceEntry.prototype) {
        try {
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              // Log long tasks that might affect UI responsiveness
              if ((entry as any).duration > 50) {
                console.warn('Long task detected:', entry);
              }
            }
          });
          
          observer.observe({ entryTypes: ['longtask'] });
        } catch (e) {
          console.error('PerformanceObserver for longtask not supported', e);
        }
      }
      
      // Monitor for layout shifts
      if (PerformanceObserver && 'layoutShift' in PerformanceEntry.prototype) {
        try {
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              // Log significant layout shifts
              if ((entry as any).value > 0.1) {
                console.warn('Layout shift detected:', entry);
              }
            }
          });
          
          observer.observe({ entryTypes: ['layout-shift'] });
        } catch (e) {
          console.error('PerformanceObserver for layout-shift not supported', e);
        }
      }
    }
  }
  
  /**
   * Update network status
   */
  private updateNetworkStatus(status: Partial<NetworkStatus>): void {
    this.networkStatus = {
      ...this.networkStatus,
      ...status
    };
  }
  
  /**
   * Notify registered listeners of changes
   */
  private notifyListeners(type: string): void {
    const listeners = this.listeners.get(type) || [];
    listeners.forEach(listener => listener());
  }
  
  /**
   * Register a listener for changes
   */
  public addEventListener(type: 'network' | 'device', callback: Function): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    
    const listeners = this.listeners.get(type)!;
    if (!listeners.includes(callback)) {
      listeners.push(callback);
    }
  }
  
  /**
   * Remove a registered listener
   */
  public removeEventListener(type: 'network' | 'device', callback: Function): void {
    if (this.listeners.has(type)) {
      const listeners = this.listeners.get(type)!;
      const index = listeners.indexOf(callback);
      
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }
  
  /**
   * Get current device information
   */
  public getDeviceInfo(): DeviceInfo {
    if (!this.deviceInfo) {
      this.initDeviceDetection();
    }
    
    return this.deviceInfo!;
  }
  
  /**
   * Get current network status
   */
  public getNetworkStatus(): NetworkStatus {
    return this.networkStatus;
  }
  
  /**
   * Check if the application should use offline mode
   */
  public shouldUseOfflineMode(): boolean {
    // User has manually enabled offline mode
    if (this.offlineMode) {
      return true;
    }
    
    // Device is offline
    if (!this.networkStatus.online) {
      return true;
    }
    
    // Connection is very slow and save-data is enabled
    if (
      this.networkStatus.saveData && 
      (this.networkStatus.effectiveType === 'slow-2g' || this.networkStatus.effectiveType === '2g')
    ) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Set offline mode
   */
  public setOfflineMode(enabled: boolean): void {
    this.offlineMode = enabled;
    this.notifyListeners('network');
  }
  
  /**
   * Check if touch areas should be enlarged
   */
  public shouldEnlargeTouchAreas(): boolean {
    return this.deviceInfo?.isTouchDevice ?? false;
  }
  
  /**
   * Get recommended touch target size in pixels
   */
  public getRecommendedTouchTargetSize(): { width: number, height: number } {
    // W3C/WCAG recommendation is 44x44px
    const base = { width: 44, height: 44 };
    
    if (!this.deviceInfo) {
      return base;
    }
    
    // For high-DPR devices, scale accordingly
    return {
      width: base.width * this.deviceInfo.pixelRatio,
      height: base.height * this.deviceInfo.pixelRatio
    };
  }
  
  /**
   * Check if we should use simplified UI on current device
   */
  public shouldUseSimplifiedUI(): boolean {
    if (!this.deviceInfo) {
      return false;
    }
    
    return this.deviceInfo.isLowEndDevice || 
           (this.deviceInfo.isMobile && this.deviceInfo.performanceClass !== DevicePerformanceClass.HIGH);
  }
  
  /**
   * Get recommended image quality for current device and network
   * Returns a number between 0 and 1 where 1 is full quality
   */
  public getRecommendedImageQuality(): number {
    if (this.shouldUseOfflineMode()) {
      return 0.6; // Low quality for offline mode
    }
    
    if (!this.deviceInfo) {
      return 0.9; // Default to high quality
    }
    
    if (this.deviceInfo.isLowEndDevice) {
      return 0.7; // Lower quality for low-end devices
    }
    
    if (this.networkStatus.effectiveType === 'slow-2g' || this.networkStatus.effectiveType === '2g') {
      return 0.6; // Lower quality for slow connections
    }
    
    if (this.networkStatus.effectiveType === '3g') {
      return 0.8; // Medium quality for 3G
    }
    
    return 0.9; // High quality for good connections
  }
  
  /**
   * Get optimal number of items to display in a list
   */
  public getOptimalItemCount(): number {
    if (!this.deviceInfo) {
      return 20; // Default
    }
    
    if (this.deviceInfo.isLowEndDevice) {
      return 10; // Fewer items for low-end devices
    }
    
    if (this.deviceInfo.isMobile) {
      return 15; // Fewer items for mobile
    }
    
    return 25; // More items for desktop
  }
  
  /**
   * Throttle animations for low-end devices
   */
  public throttleForLowEnd<T extends (...args: any[]) => any>(func: T): T {
    if (!this.deviceInfo || !this.deviceInfo.isLowEndDevice) {
      return func;
    }
    
    // Throttle to roughly 30fps for low-end devices
    return throttle(func, 33) as any as T;
  }
  
  /**
   * Check if we should load all data at once or use pagination/infinite scroll
   */
  public shouldUsePagination(): boolean {
    if (!this.deviceInfo) {
      return true; // Default to pagination
    }
    
    // Always use pagination on mobile
    if (this.deviceInfo.isMobile) {
      return true;
    }
    
    // Always use pagination on low-end devices
    return this.deviceInfo.isLowEndDevice;
  }
  
  /**
   * Get recommended chunk size for data loading
   */
  public getRecommendedChunkSize(): number {
    if (!this.deviceInfo) {
      return 25;
    }
    
    if (this.deviceInfo.isLowEndDevice) {
      return 10;
    }
    
    if (this.deviceInfo.isMobile) {
      return 15;
    }
    
    return 25;
  }
}

// Create singleton instance
const mobileOptimizationService = new MobileOptimizationService();
export default mobileOptimizationService;
