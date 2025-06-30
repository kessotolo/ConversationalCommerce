import { act } from 'react-dom/test-utils';
import mobileOptimizationService, {
  DevicePerformanceClass,
  NetworkStatus
} from '../../services/MobileOptimizationService';

// Mock browser APIs that are used in MobileOptimizationService
describe('MobileOptimizationService', () => {
  // Save original navigator and window objects
  const originalNavigator = global.navigator;
  const originalWindow = global.window;
  
  beforeEach(() => {
    // Mock navigator
    Object.defineProperty(global, 'navigator', {
      writable: true,
      value: {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        onLine: true,
        connection: undefined,
        maxTouchPoints: 0
      }
    });
    
    // Mock window
    Object.defineProperty(global, 'window', {
      writable: true,
      value: {
        ...global.window,
        innerWidth: 1200,
        innerHeight: 800,
        devicePixelRatio: 1,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }
    });
    
    // Mock screen
    Object.defineProperty(global, 'screen', {
      writable: true,
      value: {
        width: 1200,
        height: 800
      }
    });
    
    // Mock PerformanceObserver
    global.PerformanceObserver = class {
      observe = jest.fn();
      disconnect = jest.fn();
      constructor(callback: any) {}
    };
    
    // Mock PerformanceEntry prototype
    global.PerformanceEntry = {
      prototype: {
        duration: 0,
        entryType: '',
        name: '',
        startTime: 0,
        toJSON: jest.fn()
      }
    };
    
    // Reset any cached state in the service
    // @ts-ignore - Private property access for testing
    mobileOptimizationService.deviceInfo = null;
    // @ts-ignore - Private property access for testing
    mobileOptimizationService.networkStatus = {
      online: true
    };
    // @ts-ignore - Private property access for testing
    mobileOptimizationService.offlineMode = false;
  });
  
  afterEach(() => {
    // Restore original navigator and window
    Object.defineProperty(global, 'navigator', {
      writable: true,
      value: originalNavigator
    });
    
    Object.defineProperty(global, 'window', {
      writable: true,
      value: originalWindow
    });
    
    jest.clearAllMocks();
  });
  
  describe('Device Detection', () => {
    test('should detect desktop device correctly', () => {
      const deviceInfo = mobileOptimizationService.getDeviceInfo();
      
      expect(deviceInfo.isDesktop).toBe(true);
      expect(deviceInfo.isMobile).toBe(false);
      expect(deviceInfo.isTablet).toBe(false);
      expect(deviceInfo.isTouchDevice).toBe(false);
      expect(deviceInfo.performanceClass).toBe(DevicePerformanceClass.HIGH);
    });
    
    test('should detect mobile device correctly', () => {
      // Mock mobile user agent
      Object.defineProperty(global.navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X)'
      });
      
      // Mock touch support
      Object.defineProperty(global.navigator, 'maxTouchPoints', {
        writable: true,
        value: 5
      });
      
      // Mock smaller screen
      Object.defineProperty(global.window, 'innerWidth', {
        writable: true,
        value: 375
      });
      
      Object.defineProperty(global.window, 'innerHeight', {
        writable: true,
        value: 812
      });
      
      // Reset device info cache
      // @ts-ignore - Private property access for testing
      mobileOptimizationService.deviceInfo = null;
      
      const deviceInfo = mobileOptimizationService.getDeviceInfo();
      
      expect(deviceInfo.isDesktop).toBe(false);
      expect(deviceInfo.isMobile).toBe(true);
      expect(deviceInfo.isTablet).toBe(false);
      expect(deviceInfo.isTouchDevice).toBe(true);
    });
    
    test('should detect low-end Android device correctly', () => {
      // Mock old Android user agent
      Object.defineProperty(global.navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T)'
      });
      
      // Reset device info cache
      // @ts-ignore - Private property access for testing
      mobileOptimizationService.deviceInfo = null;
      
      const deviceInfo = mobileOptimizationService.getDeviceInfo();
      
      expect(deviceInfo.isDesktop).toBe(false);
      expect(deviceInfo.isMobile).toBe(true);
      expect(deviceInfo.performanceClass).toBe(DevicePerformanceClass.LOW);
      expect(deviceInfo.isLowEndDevice).toBe(true);
    });
    
    test('should detect tablet correctly', () => {
      // Mock iPad user agent
      Object.defineProperty(global.navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (iPad; CPU OS 13_3 like Mac OS X)'
      });
      
      // Mock touch support
      Object.defineProperty(global.navigator, 'maxTouchPoints', {
        writable: true,
        value: 5
      });
      
      // Mock tablet screen
      Object.defineProperty(global.window, 'innerWidth', {
        writable: true,
        value: 834
      });
      
      Object.defineProperty(global.window, 'innerHeight', {
        writable: true,
        value: 1112
      });
      
      // Reset device info cache
      // @ts-ignore - Private property access for testing
      mobileOptimizationService.deviceInfo = null;
      
      const deviceInfo = mobileOptimizationService.getDeviceInfo();
      
      expect(deviceInfo.isDesktop).toBe(false);
      expect(deviceInfo.isMobile).toBe(true);
      expect(deviceInfo.isTablet).toBe(true);
      expect(deviceInfo.isTouchDevice).toBe(true);
    });
  });
  
  describe('Network Status', () => {
    test('should detect online status correctly', () => {
      Object.defineProperty(global.navigator, 'onLine', {
        writable: true,
        value: true
      });
      
      const networkStatus = mobileOptimizationService.getNetworkStatus();
      
      expect(networkStatus.online).toBe(true);
    });
    
    test('should detect offline status correctly', () => {
      Object.defineProperty(global.navigator, 'onLine', {
        writable: true,
        value: false
      });
      
      // @ts-ignore - Private method access for testing
      mobileOptimizationService.updateNetworkStatus({ online: false });
      
      const networkStatus = mobileOptimizationService.getNetworkStatus();
      
      expect(networkStatus.online).toBe(false);
    });
    
    test('should detect connection type when available', () => {
      // Mock connection API
      Object.defineProperty(global.navigator, 'connection', {
        writable: true,
        value: {
          type: '4g',
          effectiveType: '4g',
          downlink: 10,
          rtt: 50,
          saveData: false,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn()
        }
      });
      
      // Force network status update
      // @ts-ignore - Private method access for testing
      mobileOptimizationService.initNetworkListeners();
      
      const networkStatus = mobileOptimizationService.getNetworkStatus();
      
      expect(networkStatus.connectionType).toBe('4g');
      expect(networkStatus.effectiveType).toBe('4g');
      expect(networkStatus.downlink).toBe(10);
      expect(networkStatus.rtt).toBe(50);
      expect(networkStatus.saveData).toBe(false);
    });
    
    test('should handle manual offline mode setting', () => {
      mobileOptimizationService.setOfflineMode(true);
      
      expect(mobileOptimizationService.shouldUseOfflineMode()).toBe(true);
      
      mobileOptimizationService.setOfflineMode(false);
      
      expect(mobileOptimizationService.shouldUseOfflineMode()).toBe(false);
    });
  });
  
  describe('Optimization Recommendations', () => {
    test('should recommend correct touch target size', () => {
      // Mock high DPR device
      Object.defineProperty(global.window, 'devicePixelRatio', {
        writable: true,
        value: 2
      });
      
      // Reset device info cache
      // @ts-ignore - Private property access for testing
      mobileOptimizationService.deviceInfo = null;
      
      const size = mobileOptimizationService.getRecommendedTouchTargetSize();
      
      // Base size is 44x44, with 2x pixel ratio
      expect(size.width).toBe(88);
      expect(size.height).toBe(88);
    });
    
    test('should recommend simplified UI for low-end devices', () => {
      // Mock low-end device
      Object.defineProperty(global.navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (Linux; Android 4.4; Nexus 4 Build/KRT16S)'
      });
      
      // Reset device info cache
      // @ts-ignore - Private property access for testing
      mobileOptimizationService.deviceInfo = null;
      
      expect(mobileOptimizationService.shouldUseSimplifiedUI()).toBe(true);
    });
    
    test('should recommend lower image quality for slow connections', () => {
      // Mock slow connection
      Object.defineProperty(global.navigator, 'connection', {
        writable: true,
        value: {
          type: 'cellular',
          effectiveType: '2g',
          downlink: 0.5,
          rtt: 500,
          saveData: true
        }
      });
      
      // Force network status update
      // @ts-ignore - Private method access for testing
      mobileOptimizationService.initNetworkListeners();
      
      const imageQuality = mobileOptimizationService.getRecommendedImageQuality();
      
      // Should be less than default (0.9)
      expect(imageQuality).toBeLessThan(0.9);
    });
    
    test('should recommend pagination for mobile devices', () => {
      // Mock mobile device
      Object.defineProperty(global.navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X)'
      });
      
      // Reset device info cache
      // @ts-ignore - Private property access for testing
      mobileOptimizationService.deviceInfo = null;
      
      expect(mobileOptimizationService.shouldUsePagination()).toBe(true);
    });
    
    test('should recommend smaller chunk sizes for low-end devices', () => {
      // Mock low-end device
      Object.defineProperty(global.navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (Linux; Android 4.4; Nexus 4 Build/KRT16S)'
      });
      
      // Reset device info cache
      // @ts-ignore - Private property access for testing
      mobileOptimizationService.deviceInfo = null;
      
      const chunkSize = mobileOptimizationService.getRecommendedChunkSize();
      
      // Should be smaller than default (25)
      expect(chunkSize).toBeLessThan(25);
    });
  });
  
  describe('Event Listeners', () => {
    test('should notify listeners when network status changes', () => {
      const mockCallback = jest.fn();
      
      // Register listener
      mobileOptimizationService.addEventListener('network', mockCallback);
      
      // Simulate network status change
      // @ts-ignore - Private method access for testing
      mobileOptimizationService.updateNetworkStatus({ online: false });
      // @ts-ignore - Private method access for testing
      mobileOptimizationService.notifyListeners('network');
      
      expect(mockCallback).toHaveBeenCalled();
      
      // Unregister listener
      mobileOptimizationService.removeEventListener('network', mockCallback);
      
      // Reset counter
      mockCallback.mockReset();
      
      // Should not be called after removal
      // @ts-ignore - Private method access for testing
      mobileOptimizationService.notifyListeners('network');
      
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });
});
