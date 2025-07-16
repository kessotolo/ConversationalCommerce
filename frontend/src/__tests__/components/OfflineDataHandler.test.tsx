import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import OfflineDataHandler from '../../modules/shared/components/OfflineDataHandler';
import mobileOptimizationService from '../../services/MobileOptimizationService';

// Mock the mobile optimization service
jest.mock('../../services/MobileOptimizationService', () => ({
  getNetworkStatus: jest.fn().mockReturnValue({ online: true }),
  shouldUseOfflineMode: jest.fn().mockReturnValue(false),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock the Chakra UI Toast provider
jest.mock('@chakra-ui/react', () => {
  const originalModule = jest.requireActual('@chakra-ui/react');
  return {
    ...originalModule,
    useToast: jest.fn().mockReturnValue(jest.fn()),
  };
});

describe('OfflineDataHandler', () => {
  const testData = [
    { id: 1, name: 'Test 1' },
    { id: 2, name: 'Test 2' },
  ];

  const mockFetchData = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
    mockLocalStorage.clear();
    // Default mock for online fetch with successful response
    mockFetchData.mockResolvedValue(testData);
  });

  test('renders loading state initially', () => {
    render(
      <OfflineDataHandler
        fetchData={mockFetchData}
        localStorageKey="test-data"
      >
        {(data, isOffline) => (
          <div>{data.map(item => (
            <div key={item.id}>{item.name}</div>
          ))}</div>
        )}
      </OfflineDataHandler>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('fetches and renders data when online', async () => {
    (mobileOptimizationService.getNetworkStatus as jest.Mock).mockReturnValue({ online: true });

    render(
      <OfflineDataHandler
        fetchData={mockFetchData}
        localStorageKey="test-data"
      >
        {(data, isOffline) => (
          <div>{(data as Array<{ id: string; name: string }>).map((item) => (
            <div key={item.id}>{item.name}</div>
          ))}</div>
        )}
      </OfflineDataHandler>
    );

    await waitFor(() => {
      expect(screen.getByText('Test 1')).toBeInTheDocument();
      expect(screen.getByText('Test 2')).toBeInTheDocument();
    });

    expect(mockFetchData).toHaveBeenCalled();

    // Verify data was cached
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'test-data',
      expect.stringContaining('"data"')
    );
  });

  test('uses cached data when offline', async () => {
    // Setup cached data
    const timestamp = new Date().toISOString();
    mockLocalStorage.setItem(
      'test-data',
      JSON.stringify({
        data: testData,
        timestamp
      })
    );

    // Set offline mode
    (mobileOptimizationService.getNetworkStatus as jest.Mock).mockReturnValue({ online: false });
    (mobileOptimizationService.shouldUseOfflineMode as jest.Mock).mockReturnValue(true);

    render(
      <OfflineDataHandler
        fetchData={mockFetchData}
        localStorageKey="test-data"
      >
        {(data, isOffline) => (
          <div>
            {isOffline && <div>Offline Mode</div>}
            {data.map((item) => (
              <div key={(item as { id: string; name: string }).id}>{(item as { id: string; name: string }).name}</div>
            ))}
          </div>
        )}
      </OfflineDataHandler>
    );

    await waitFor(() => {
      expect(screen.getByText('Offline Mode')).toBeInTheDocument();
      expect(screen.getByText('Test 1')).toBeInTheDocument();
      expect(screen.getByText('Test 2')).toBeInTheDocument();
    });

    // Should not try to fetch data when offline
    expect(mockFetchData).not.toHaveBeenCalled();
  });

  test('handles data fetch error with fallback to cache', async () => {
    // Setup cached data
    const timestamp = new Date().toISOString();
    mockLocalStorage.setItem(
      'test-data',
      JSON.stringify({
        data: testData,
        timestamp
      })
    );

    // Mock fetch error
    mockFetchData.mockRejectedValue(new Error('Network error'));

    render(
      <OfflineDataHandler
        fetchData={mockFetchData}
        localStorageKey="test-data"
      >
        {(data, isOffline) => (
          <div>{(data as Array<{ id: string; name: string }>).map((item) => (
            <div key={item.id}>{item.name}</div>
          ))}</div>
        )}
      </OfflineDataHandler>
    );

    await waitFor(() => {
      expect(screen.getByText('Test 1')).toBeInTheDocument();
      expect(screen.getByText('Test 2')).toBeInTheDocument();
    });

    // Should try to fetch but fall back to cache when error occurs
    expect(mockFetchData).toHaveBeenCalled();
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('test-data');
  });

  test('shows error when fetch fails and no cache is available', async () => {
    // Mock fetch error
    mockFetchData.mockRejectedValue(new Error('Network error'));

    render(
      <OfflineDataHandler
        fetchData={mockFetchData}
        localStorageKey="test-data"
      >
        {(data, isOffline) => (
          <div>{(data as Array<{ id: string; name: string }>).map((item) => (
            <div key={item.id}>{item.name}</div>
          ))}</div>
        )}
      </OfflineDataHandler>
    );

    await waitFor(() => {
      expect(screen.getByText(/Could not fetch data/)).toBeInTheDocument();
    });

    expect(mockFetchData).toHaveBeenCalled();
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('test-data');
  });

  test('handles manual refresh', async () => {
    // Setup initial render with data
    render(
      <OfflineDataHandler
        fetchData={mockFetchData}
        localStorageKey="test-data"
        allowManualRefresh={true}
      >
        {(data, isOffline) => (
          <div>{(data as Array<{ id: string; name: string }>).map((item) => (
            <div key={item.id}>{item.name}</div>
          ))}</div>
        )}
      </OfflineDataHandler>
    );

    await waitFor(() => {
      expect(screen.getByText('Test 1')).toBeInTheDocument();
    });

    // Clear previous calls
    mockFetchData.mockClear();
    mockLocalStorage.setItem.mockClear();

    // Updated data for the second fetch
    const updatedData = [
      { id: 1, name: 'Updated Test 1' },
      { id: 2, name: 'Updated Test 2' },
    ];
    mockFetchData.mockResolvedValue(updatedData);

    // Find and click refresh button
    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(screen.getByText('Updated Test 1')).toBeInTheDocument();
      expect(screen.getByText('Updated Test 2')).toBeInTheDocument();
    });

    // Verify refresh triggered a new fetch
    expect(mockFetchData).toHaveBeenCalled();
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'test-data',
      expect.stringContaining('"data"')
    );
  });

  test('handles expired cache data', async () => {
    // Setup expired cached data (more than 24 hours old)
    const oldTimestamp = new Date();
    oldTimestamp.setDate(oldTimestamp.getDate() - 2); // 2 days old

    mockLocalStorage.setItem(
      'test-data',
      JSON.stringify({
        data: [{ id: 1, name: 'Old Test Data' }],
        timestamp: oldTimestamp.toISOString()
      })
    );

    // Mock new data for fetch
    const newData = [{ id: 1, name: 'Fresh Test Data' }];
    mockFetchData.mockResolvedValue(newData);

    render(
      <OfflineDataHandler
        fetchData={mockFetchData}
        localStorageKey="test-data"
        expiryHours={24} // 24 hour expiry
      >
        {(data, isOffline) => (
          <div>{(data as Array<{ id: string; name: string }>).map((item) => (
            <div key={item.id}>{item.name}</div>
          ))}</div>
        )}
      </OfflineDataHandler>
    );

    await waitFor(() => {
      expect(screen.getByText('Fresh Test Data')).toBeInTheDocument();
      expect(screen.queryByText('Old Test Data')).not.toBeInTheDocument();
    });

    // Verify fetch was called to get fresh data
    expect(mockFetchData).toHaveBeenCalled();
  });
});
