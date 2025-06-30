import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import mobileOptimizationService from '../../../src/services/MobileOptimizationService';

describe('MobileOptimizationService', () => {
  beforeEach(() => {
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
        }
      },
      writable: true
    });
    
    // Reset singleton state between tests
    mobileOptimizationService['deviceInfo'] = null;
    mobileOptimizationService['networkStatus'] = null;
    mobileOptimizationService['listeners'] = [];
  });
  
  afterEach(() => {
    vi.resetAllMocks();
  });
  
  describe('getDeviceInfo', () => {
    it('should detect mobile device correctly', () => {
      const deviceInfo = mobileOptimizationService.getDeviceInfo();
      
      expect(deviceInfo.isMobile).toBe(true);
      expect(deviceInfo.isTablet).toBe(false);
      expect(deviceInfo.isDesktop).toBe(false);
      expect(deviceInfo.viewport.width).toBe(375);
      expect(deviceInfo.viewport.height).toBe(667);
    });
    
    it('should detect tablet device correctly', () => {
      // Mock tablet user agent
      Object.defineProperty(window, 'innerWidth', { value: 768, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 1024, writable: true });
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
      });
      
      // Reset deviceInfo to force recalculation
      mobileOptimizationService['deviceInfo'] = null;
      
      const deviceInfo = mobileOptimizationService.getDeviceInfo();
      
      expect(deviceInfo.isMobile).toBe(false);
      expect(deviceInfo.isTablet).toBe(true);
      expect(deviceInfo.isDesktop).toBe(false);
    });
    
    it('should detect desktop device correctly', () => {
      // Mock desktop user agent
      Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 1080, writable: true });
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
      });
      
      // Reset deviceInfo to force recalculation
      mobileOptimizationService['deviceInfo'] = null;
      
      const deviceInfo = mobileOptimizationService.getDeviceInfo();
      
      expect(deviceInfo.isMobile).toBe(false);
      expect(deviceInfo.isTablet).toBe(false);
      expect(deviceInfo.isDesktop).toBe(true);
    });
    
    it('should correctly identify low-end device', () => {
      // Mock hardware concurrency to simulate low-end device
      Object.defineProperty(window.navigator, 'hardwareConcurrency', { value: 2 });
      
      // Mock Android user agent with older version
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 5.0; SM-G900P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Mobile Safari/537.36'
      });
      
      // Reset deviceInfo to force recalculation
      mobileOptimizationService['deviceInfo'] = null;
      
      const deviceInfo = mobileOptimizationService.getDeviceInfo();
      
      expect(deviceInfo.performanceClass).toBe('low');
      expect(deviceInfo.isLowEndDevice).toBe(true);
    });
    
    it('should correctly identify high-end device', () => {
      // Mock hardware concurrency to simulate high-end device
      Object.defineProperty(window.navigator, 'hardwareConcurrency', { value: 8 });
      
      // Mock iPhone user agent with newer version
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
      });
      
      // Reset deviceInfo to force recalculation
      mobileOptimizationService['deviceInfo'] = null;
      
      const deviceInfo = mobileOptimizationService.getDeviceInfo();
      
      expect(deviceInfo.performanceClass).toBe('high');
      expect(deviceInfo.isLowEndDevice).toBe(false);
    });
  });
  
  describe('getNetworkStatus', () => {
    it('should return online status when connected', () => {
      // Mock navigator.onLine
      Object.defineProperty(window.navigator, 'onLine', { value: true });
      
      const networkStatus = mobileOptimizationService.getNetworkStatus();
      
      expect(networkStatus.online).toBe(true);
    });
    
    it('should return offline status when disconnected', () => {
      // Mock navigator.onLine
      Object.defineProperty(window.navigator, 'onLine', { value: false });
      
      // Reset networkStatus to force recalculation
      mobileOptimizationService['networkStatus'] = null;
      
      const networkStatus = mobileOptimizationService.getNetworkStatus();
      
      expect(networkStatus.online).toBe(false);
    });
    
    it('should detect network quality correctly', () => {
      // Mock connection properties
      Object.defineProperty(window.navigator, 'connection', {
        value: {
          effectiveType: '3g',
          downlink: 1.5,
          rtt: 400,
          saveData: false
        }
      });
      
      // Reset networkStatus to force recalculation
      mobileOptimizationService['networkStatus'] = null;
      
      const networkStatus = mobileOptimizationService.getNetworkStatus();
      
      expect(networkStatus.connectionType).toBe('3g');
      expect(networkStatus.connectionQuality).toBe('medium');
    });
    
    it('should detect save data mode', () => {
      // Mock save data enabled
      Object.defineProperty(window.navigator, 'connection', {
        value: {
          effectiveType: '4g',
          downlink: 5,
          rtt: 100,
          saveData: true
        }
      });
      
      // Reset networkStatus to force recalculation
      mobileOptimizationService['networkStatus'] = null;
      
      const networkStatus = mobileOptimizationService.getNetworkStatus();
      
      expect(networkStatus.saveData).toBe(true);
    });
  });
  
  describe('optimization recommendation methods', () => {
    it('should recommend correct touch target size based on device', () => {
      // Mock low-end mobile device
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 5.0; SM-G900P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Mobile Safari/537.36'
      });
      Object.defineProperty(window.navigator, 'hardwareConcurrency', { value: 2 });
      
      // Reset deviceInfo to force recalculation
      mobileOptimizationService['deviceInfo'] = null;
      
      expect(mobileOptimizationService.getRecommendedTouchTargetSize()).toBeGreaterThanOrEqual(48);
      
      // Mock high-end desktop device
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
      });
      Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 1080, writable: true });
      Object.defineProperty(window.navigator, 'hardwareConcurrency', { value: 8 });
      
      // Reset deviceInfo to force recalculation
      mobileOptimizationService['deviceInfo'] = null;
      
      expect(mobileOptimizationService.getRecommendedTouchTargetSize()).toBe(44);
    });
    
    it('should recommend appropriate image quality based on network and device', () => {
      // Mock slow connection
      Object.defineProperty(window.navigator, 'connection', {
        value: {
          effectiveType: '2g',
          downlink: 0.5,
          rtt: 600,
          saveData: false
        }
      });
      
      // Reset networkStatus to force recalculation
      mobileOptimizationService['networkStatus'] = null;
      
      expect(mobileOptimizationService.getRecommendedImageQuality()).toBeLessThanOrEqual(60);
      
      // Mock fast connection
      Object.defineProperty(window.navigator, 'connection', {
        value: {
          effectiveType: '4g',
          downlink: 10,
          rtt: 50,
          saveData: false
        }
      });
      
      // Reset networkStatus to force recalculation
      mobileOptimizationService['networkStatus'] = null;
      
      expect(mobileOptimizationService.getRecommendedImageQuality()).toBeGreaterThanOrEqual(80);
    });
    
    it('should recommend appropriate pagination based on device performance', () => {
      // Mock low-end device
      Object.defineProperty(window.navigator, 'hardwareConcurrency', { value: 2 });
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 5.0; SM-G900P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Mobile Safari/537.36'
      });
      
      // Reset deviceInfo to force recalculation
      mobileOptimizationService['deviceInfo'] = null;
      
      expect(mobileOptimizationService.getRecommendedPaginationSize()).toBeLessThanOrEqual(10);
      
      // Mock high-end device
      Object.defineProperty(window.navigator, 'hardwareConcurrency', { value: 8 });
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
      });
      
      // Reset deviceInfo to force recalculation
      mobileOptimizationService['deviceInfo'] = null;
      
      expect(mobileOptimizationService.getRecommendedPaginationSize()).toBeGreaterThanOrEqual(20);
    });
  });
  
  describe('shouldUseSimplifiedUI', () => {
    it('should recommend simplified UI for low-end devices', () => {
      // Mock low-end device
      Object.defineProperty(window.navigator, 'hardwareConcurrency', { value: 2 });
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 5.0; SM-G900P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Mobile Safari/537.36'
      });
      
      // Reset deviceInfo to force recalculation
      mobileOptimizationService['deviceInfo'] = null;
      
      expect(mobileOptimizationService.shouldUseSimplifiedUI()).toBe(true);
    });
    
    it('should not recommend simplified UI for high-end devices', () => {
      // Mock high-end device
      Object.defineProperty(window.navigator, 'hardwareConcurrency', { value: 8 });
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
      });
      
      // Reset deviceInfo to force recalculation
      mobileOptimizationService['deviceInfo'] = null;
      
      expect(mobileOptimizationService.shouldUseSimplifiedUI()).toBe(false);
    });
    
    it('should recommend simplified UI when in save-data mode regardless of device', () => {
      // Mock high-end device with save data
      Object.defineProperty(window.navigator, 'hardwareConcurrency', { value: 8 });
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
      });
      Object.defineProperty(window.navigator, 'connection', {
        value: {
          effectiveType: '4g',
          downlink: 10,
          rtt: 50,
          saveData: true
        }
      });
      
      // Reset both to force recalculation
      mobileOptimizationService['deviceInfo'] = null;
      mobileOptimizationService['networkStatus'] = null;
      
      expect(mobileOptimizationService.shouldUseSimplifiedUI()).toBe(true);
    });
  });
  
  describe('network change notification', () => {
    it('should notify listeners of network status changes', () => {
      const mockListener = vi.fn();
      mobileOptimizationService.addNetworkStatusListener(mockListener);
      
      // Simulate online event
      const onlineEvent = new Event('online');
      window.dispatchEvent(onlineEvent);
      
      expect(mockListener).toHaveBeenCalledWith(expect.objectContaining({ 
        online: true 
      }));
      
      mockListener.mockClear();
      
      // Simulate offline event
      const offlineEvent = new Event('offline');
      window.dispatchEvent(offlineEvent);
      
      expect(mockListener).toHaveBeenCalledWith(expect.objectContaining({ 
        online: false 
      }));
    });
    
    it('should remove network status listeners', () => {
      const mockListener = vi.fn();
      mobileOptimizationService.addNetworkStatusListener(mockListener);
      mobileOptimizationService.removeNetworkStatusListener(mockListener);
      
      // Simulate online event
      const onlineEvent = new Event('online');
      window.dispatchEvent(onlineEvent);
      
      expect(mockListener).not.toHaveBeenCalled();
    });
  });
});
