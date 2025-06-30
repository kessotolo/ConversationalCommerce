import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import OfflineDataHandler from '../../../src/modules/shared/components/OfflineDataHandler';
import mobileOptimizationService from '../../../src/services/MobileOptimizationService';

// Mock MobileOptimizationService
vi.mock('../../../src/services/MobileOptimizationService', () => ({
  default: {
    getNetworkStatus: vi.fn(),
    addNetworkStatusListener: vi.fn(),
    removeNetworkStatusListener: vi.fn(),
  },
}));

describe('OfflineDataHandler', () => {
  const mockFetchData = vi.fn();
  const mockLocalStorageKey = 'test-offline-data';
  let mockNetworkListenerCallback: ((status: any) => void) | null = null;
  
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    
    // Default mock implementation - online
    vi.mocked(mobileOptimizationService.getNetworkStatus).mockReturnValue({
      online: true,
      connectionType: '4g',
      connectionQuality: 'high',
      saveData: false
    });
    
    // Capture the network listener callback
    vi.mocked(mobileOptimizationService.addNetworkStatusListener).mockImplementation((callback) => {
      mockNetworkListenerCallback = callback;
    });
    
    mockFetchData.mockClear();
  });
  
  afterEach(() => {
    vi.resetAllMocks();
  });
  
  it('should fetch data on initial render when online', async () => {
    const mockData = { items: [1, 2, 3] };
    mockFetchData.mockResolvedValue(mockData);
    
    render(
      <OfflineDataHandler
        fetchData={mockFetchData}
        localStorageKey={mockLocalStorageKey}
        expiryHours={1}
      >
        {(data, isOffline) => (
          <div>
            <span data-testid="status">{isOffline ? 'Offline' : 'Online'}</span>
            <span data-testid="data">{JSON.stringify(data)}</span>
          </div>
        )}
      </OfflineDataHandler>
    );
    
    // Should show loading initially
    expect(mockFetchData).toHaveBeenCalledTimes(1);
    
    // Wait for data to be loaded
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('Online');
      expect(screen.getByTestId('data')).toHaveTextContent(JSON.stringify(mockData));
    });
    
    // Verify data was cached
    const cachedData = JSON.parse(localStorage.getItem(mockLocalStorageKey) || '{}');
    expect(cachedData.data).toEqual(mockData);
    expect(cachedData.timestamp).toBeDefined();
  });
  
  it('should use cached data when offline', async () => {
    const mockData = { items: [4, 5, 6] };
    const cachedTimestamp = new Date().getTime();
    
    // Pre-populate cache
    localStorage.setItem(
      mockLocalStorageKey,
      JSON.stringify({
        data: mockData,
        timestamp: cachedTimestamp
      })
    );
    
    // Set network status to offline
    vi.mocked(mobileOptimizationService.getNetworkStatus).mockReturnValue({
      online: false,
      connectionType: 'none',
      connectionQuality: 'poor',
      saveData: false
    });
    
    render(
      <OfflineDataHandler
        fetchData={mockFetchData}
        localStorageKey={mockLocalStorageKey}
        expiryHours={1}
      >
        {(data, isOffline) => (
          <div>
            <span data-testid="status">{isOffline ? 'Offline' : 'Online'}</span>
            <span data-testid="data">{JSON.stringify(data)}</span>
          </div>
        )}
      </OfflineDataHandler>
    );
    
    // Fetch should not be called since we're offline
    expect(mockFetchData).not.toHaveBeenCalled();
    
    // Should show cached data with offline indicator
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('Offline');
      expect(screen.getByTestId('data')).toHaveTextContent(JSON.stringify(mockData));
    });
  });
  
  it('should show placeholder when loading', async () => {
    // Delay the data fetch
    mockFetchData.mockImplementation(() => new Promise(resolve => {
      setTimeout(() => resolve({ items: [7, 8, 9] }), 100);
    }));
    
    render(
      <OfflineDataHandler
        fetchData={mockFetchData}
        localStorageKey={mockLocalStorageKey}
        expiryHours={1}
        placeholderComponent={<div data-testid="placeholder">Loading...</div>}
      >
        {(data, isOffline) => (
          <div>
            <span data-testid="status">{isOffline ? 'Offline' : 'Online'}</span>
            <span data-testid="data">{JSON.stringify(data)}</span>
          </div>
        )}
      </OfflineDataHandler>
    );
    
    // Should show placeholder initially
    expect(screen.getByTestId('placeholder')).toBeInTheDocument();
    
    // Wait for data to be loaded
    await waitFor(() => {
      expect(screen.getByTestId('status')).toBeInTheDocument();
      expect(screen.getByTestId('data')).toBeInTheDocument();
    }, { timeout: 200 });
  });
  
  it('should refetch data when cache is expired', async () => {
    const oldData = { items: [10, 11, 12] };
    const newData = { items: [13, 14, 15] };
    
    // Pre-populate cache with expired data (2 hours old when expiry is 1 hour)
    const expiredTimestamp = new Date().getTime() - (2 * 60 * 60 * 1000);
    localStorage.setItem(
      mockLocalStorageKey,
      JSON.stringify({
        data: oldData,
        timestamp: expiredTimestamp
      })
    );
    
    mockFetchData.mockResolvedValue(newData);
    
    render(
      <OfflineDataHandler
        fetchData={mockFetchData}
        localStorageKey={mockLocalStorageKey}
        expiryHours={1}
      >
        {(data, isOffline) => (
          <div>
            <span data-testid="status">{isOffline ? 'Offline' : 'Online'}</span>
            <span data-testid="data">{JSON.stringify(data)}</span>
          </div>
        )}
      </OfflineDataHandler>
    );
    
    // Should fetch new data since cache is expired
    expect(mockFetchData).toHaveBeenCalledTimes(1);
    
    // Wait for data to be loaded - should show new data
    await waitFor(() => {
      expect(screen.getByTestId('data')).toHaveTextContent(JSON.stringify(newData));
    });
  });
  
  it('should handle network status change from online to offline', async () => {
    const mockData = { items: [16, 17, 18] };
    mockFetchData.mockResolvedValue(mockData);
    
    render(
      <OfflineDataHandler
        fetchData={mockFetchData}
        localStorageKey={mockLocalStorageKey}
        expiryHours={1}
      >
        {(data, isOffline) => (
          <div>
            <span data-testid="status">{isOffline ? 'Offline' : 'Online'}</span>
            <span data-testid="data">{data ? JSON.stringify(data) : 'No data'}</span>
          </div>
        )}
      </OfflineDataHandler>
    );
    
    // Wait for initial data to be loaded
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('Online');
      expect(screen.getByTestId('data')).toHaveTextContent(JSON.stringify(mockData));
    });
    
    // Simulate network going offline
    act(() => {
      if (mockNetworkListenerCallback) {
        mockNetworkListenerCallback({
          online: false,
          connectionType: 'none',
          connectionQuality: 'poor',
          saveData: false
        });
      }
    });
    
    // Should show offline status but keep showing data
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('Offline');
      expect(screen.getByTestId('data')).toHaveTextContent(JSON.stringify(mockData));
    });
  });
  
  it('should handle network status change from offline to online', async () => {
    const cachedData = { items: [19, 20, 21] };
    const newData = { items: [22, 23, 24] };
    
    // Pre-populate cache
    localStorage.setItem(
      mockLocalStorageKey,
      JSON.stringify({
        data: cachedData,
        timestamp: new Date().getTime()
      })
    );
    
    // Start offline
    vi.mocked(mobileOptimizationService.getNetworkStatus).mockReturnValue({
      online: false,
      connectionType: 'none',
      connectionQuality: 'poor',
      saveData: false
    });
    
    mockFetchData.mockResolvedValue(newData);
    
    render(
      <OfflineDataHandler
        fetchData={mockFetchData}
        localStorageKey={mockLocalStorageKey}
        expiryHours={1}
      >
        {(data, isOffline) => (
          <div>
            <span data-testid="status">{isOffline ? 'Offline' : 'Online'}</span>
            <span data-testid="data">{JSON.stringify(data)}</span>
          </div>
        )}
      </OfflineDataHandler>
    );
    
    // Should initially show cached data and offline status
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('Offline');
      expect(screen.getByTestId('data')).toHaveTextContent(JSON.stringify(cachedData));
    });
    
    // Fetch should not be called yet since we're offline
    expect(mockFetchData).not.toHaveBeenCalled();
    
    // Simulate network coming back online
    act(() => {
      if (mockNetworkListenerCallback) {
        mockNetworkListenerCallback({
          online: true,
          connectionType: '4g',
          connectionQuality: 'high',
          saveData: false
        });
      }
    });
    
    // Should fetch new data and update UI
    expect(mockFetchData).toHaveBeenCalledTimes(1);
    
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('Online');
      expect(screen.getByTestId('data')).toHaveTextContent(JSON.stringify(newData));
    });
  });
  
  it('should handle error in fetch data', async () => {
    // Make fetch data throw an error
    const error = new Error('Failed to fetch data');
    mockFetchData.mockRejectedValue(error);
    
    console.error = vi.fn(); // Suppress error logging
    
    render(
      <OfflineDataHandler
        fetchData={mockFetchData}
        localStorageKey={mockLocalStorageKey}
        expiryHours={1}
        errorComponent={<div data-testid="error">Error loading data</div>}
      >
        {(data, isOffline) => (
          <div>
            <span data-testid="status">{isOffline ? 'Offline' : 'Online'}</span>
            <span data-testid="data">{data ? JSON.stringify(data) : 'No data'}</span>
          </div>
        )}
      </OfflineDataHandler>
    );
    
    // Should show error component
    await waitFor(() => {
      expect(screen.getByTestId('error')).toBeInTheDocument();
    });
  });
  
  it('should use cached data if fetch fails and cache exists', async () => {
    const cachedData = { items: [25, 26, 27] };
    
    // Pre-populate cache
    localStorage.setItem(
      mockLocalStorageKey,
      JSON.stringify({
        data: cachedData,
        timestamp: new Date().getTime()
      })
    );
    
    // Make fetch data throw an error
    mockFetchData.mockRejectedValue(new Error('Failed to fetch data'));
    
    console.error = vi.fn(); // Suppress error logging
    
    render(
      <OfflineDataHandler
        fetchData={mockFetchData}
        localStorageKey={mockLocalStorageKey}
        expiryHours={1}
      >
        {(data, isOffline) => (
          <div>
            <span data-testid="status">{isOffline ? 'Offline' : 'Online'}</span>
            <span data-testid="data">{data ? JSON.stringify(data) : 'No data'}</span>
          </div>
        )}
      </OfflineDataHandler>
    );
    
    // Should fallback to cached data despite being online
    await waitFor(() => {
      expect(screen.getByTestId('data')).toHaveTextContent(JSON.stringify(cachedData));
      // Should still show online because the network is online, but using cached data
      expect(screen.getByTestId('status')).toHaveTextContent('Online');
    });
  });
  
  it('should handle polling correctly', async () => {
    const initialData = { items: [28, 29, 30] };
    const updatedData = { items: [31, 32, 33] };
    
    // First call returns initial data, second call returns updated data
    mockFetchData
      .mockResolvedValueOnce(initialData)
      .mockResolvedValueOnce(updatedData);
    
    // Use fast polling for test
    vi.useFakeTimers();
    
    render(
      <OfflineDataHandler
        fetchData={mockFetchData}
        localStorageKey={mockLocalStorageKey}
        expiryHours={1}
        pollingInterval={5} // 5 seconds
      >
        {(data, isOffline) => (
          <div>
            <span data-testid="status">{isOffline ? 'Offline' : 'Online'}</span>
            <span data-testid="data">{JSON.stringify(data)}</span>
          </div>
        )}
      </OfflineDataHandler>
    );
    
    // Should fetch initial data
    expect(mockFetchData).toHaveBeenCalledTimes(1);
    
    // Wait for initial data to load
    await waitFor(() => {
      expect(screen.getByTestId('data')).toHaveTextContent(JSON.stringify(initialData));
    });
    
    // Advance timer to trigger polling
    await act(async () => {
      vi.advanceTimersByTime(6000); // 6 seconds, just past polling interval
    });
    
    // Should have called fetch again
    expect(mockFetchData).toHaveBeenCalledTimes(2);
    
    // Wait for updated data to load
    await waitFor(() => {
      expect(screen.getByTestId('data')).toHaveTextContent(JSON.stringify(updatedData));
    });
    
    vi.useRealTimers();
  });
});
