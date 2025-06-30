# Mobile Optimization Guide

## Overview

This guide documents the mobile optimization components and utilities implemented for the ConversationalCommerce platform. These tools are designed to ensure excellent performance and user experience on all devices, with special consideration for low-end Android devices.

## Key Components

### 1. MobileOptimizationService

A singleton service that provides device detection, network status monitoring, and performance recommendations.

#### Usage

```typescript
import mobileOptimizationService from '../services/MobileOptimizationService';

// Get device information
const deviceInfo = mobileOptimizationService.getDeviceInfo();
if (deviceInfo.isLowEndDevice) {
  // Apply optimizations for low-end devices
}

// Check network status
const networkStatus = mobileOptimizationService.getNetworkStatus();
if (!networkStatus.online) {
  // Show offline UI
}

// Listen for network changes
mobileOptimizationService.addEventListener('network', handleNetworkChange);

// Get optimization recommendations
const imageQuality = mobileOptimizationService.getRecommendedImageQuality();
const shouldUsePagination = mobileOptimizationService.shouldUsePagination();
const chunkSize = mobileOptimizationService.getRecommendedChunkSize();
```

#### API Reference

**Device Information:**
- `getDeviceInfo()`: Returns device type, performance class, screen dimensions, etc.
- `shouldUseSimplifiedUI()`: Indicates if simplified UI should be used.

**Network Status:**
- `getNetworkStatus()`: Returns current connection status.
- `shouldUseOfflineMode()`: Determines if app should operate in offline mode.
- `setOfflineMode(enabled)`: Manually set offline mode.

**Optimization Recommendations:**
- `getRecommendedTouchTargetSize()`: Returns optimal touch target dimensions.
- `shouldEnlargeTouchAreas()`: Indicates if touch areas should be enlarged.
- `getRecommendedImageQuality()`: Returns optimal image quality (0-1).
- `getOptimalItemCount()`: Suggests number of items to display in lists.
- `shouldUsePagination()`: Indicates if pagination should be used vs. loading all data.
- `getRecommendedChunkSize()`: Returns optimal chunk size for data loading.

**Performance Utilities:**
- `throttleForLowEnd(func)`: Throttles a function for low-end devices.

### 2. TouchTargetArea Component

A wrapper component that ensures interactive elements have sufficiently large touch targets, especially on mobile devices.

#### Usage

```tsx
import TouchTargetArea from '../modules/shared/components/TouchTargetArea';

<TouchTargetArea>
  <Button>Click Me</Button>
</TouchTargetArea>

// With options
<TouchTargetArea minSize="large" preventScaling={false}>
  <IconButton icon={<FiTrash />} />
</TouchTargetArea>
```

#### Props

- `children`: The interactive element to wrap.
- `minSize`: Size variant (`"default"`, `"small"`, `"large"`, or `"none"`).
- `enhanceForTouch`: Whether to enhance touch area (default: `true`).
- `preventScaling`: Whether to prevent automatic scaling (default: `false`).
- All standard Box props from Chakra UI.

### 3. OfflineDataHandler Component

A component that handles data fetching with offline support, including caching, expiration, and appropriate UI feedback.

#### Usage

```tsx
import OfflineDataHandler from '../modules/shared/components/OfflineDataHandler';

<OfflineDataHandler
  fetchData={fetchAnalyticsData}
  localStorageKey="analytics-dashboard-data"
  expiryHours={24}
>
  {(data, isOffline) => (
    <AnalyticsDashboard data={data} isOffline={isOffline} />
  )}
</OfflineDataHandler>
```

#### Props

- `children`: Function that renders UI with fetched data.
- `fetchData`: Function that returns a Promise resolving to data.
- `localStorageKey`: Key used for storing cached data.
- `expiryHours`: Number of hours before cached data expires (default: `24`).
- `pollingInterval`: Seconds between automatic refreshes (default: `0`).
- `placeholderComponent`: Component to show during loading (default: `"Loading..."`).
- `allowManualRefresh`: Whether to show refresh button (default: `true`).
- `notifyOnUpdate`: Whether to show toast on update (default: `true`).

## Best Practices

### Touch Target Optimization

- Use `TouchTargetArea` component around all clickable elements.
- Ensure minimum touch target size of 44x44px (automatically handled by `TouchTargetArea`).
- Provide sufficient spacing between interactive elements (at least 8px).

### Performance Optimization

- Use `mobileOptimizationService.shouldUseSimplifiedUI()` to conditionally render simpler UI on low-end devices.
- Implement virtualization for long lists using `react-window` or similar.
- Limit animations on low-end devices using `throttleForLowEnd()`.
- Use appropriate image quality based on `getRecommendedImageQuality()`.

### Network Handling

- Always use `OfflineDataHandler` for data that should be available offline.
- Implement retry logic for failed network requests.
- Show appropriate feedback when offline.
- Cache critical resources for offline use.

### Layout and UI

- Use responsive layouts that adapt to different screen sizes.
- Implement touch-friendly UI controls on mobile.
- Use appropriate font sizes (minimum 16px for body text on mobile).
- Ensure sufficient contrast ratios for text.

## Testing Mobile Optimizations

- Test on actual low-end Android devices (e.g., Android 5.0-7.0 devices).
- Use Chrome DevTools device emulation and network throttling.
- Test with various network conditions (2G, 3G, offline).
- Validate touch targets using mobile accessibility tools.

## Mobile-First Implementation Strategy

1. Start with mobile layout and progressively enhance for larger screens.
2. Prioritize core functionality and data for initial load.
3. Defer non-essential content and features.
4. Optimize critical rendering path.
5. Implement offline support for core features.

## Example: Optimizing Analytics Dashboard

```tsx
import { Box, useBreakpointValue } from '@chakra-ui/react';
import mobileOptimizationService from '../services/MobileOptimizationService';
import OfflineDataHandler from '../modules/shared/components/OfflineDataHandler';
import TouchTargetArea from '../modules/shared/components/TouchTargetArea';

const AnalyticsDashboard = () => {
  const deviceInfo = mobileOptimizationService.getDeviceInfo();
  const isSimplifiedUI = mobileOptimizationService.shouldUseSimplifiedUI();
  const itemCount = mobileOptimizationService.getOptimalItemCount();
  
  // Adjust layout based on device
  const columns = useBreakpointValue({ base: 1, md: 2, lg: 3 });
  
  return (
    <OfflineDataHandler
      fetchData={() => fetchAnalyticsData(itemCount)}
      localStorageKey="analytics-dashboard"
    >
      {(data, isOffline) => (
        <Box>
          {isOffline && <OfflineBanner />}
          
          {/* Use simplified charts on low-end devices */}
          {isSimplifiedUI ? (
            <SimplifiedCharts data={data} />
          ) : (
            <FullCharts data={data} />
          )}
          
          {/* Wrap interactive elements with TouchTargetArea */}
          <TouchTargetArea>
            <RefreshButton onClick={handleRefresh} />
          </TouchTargetArea>
        </Box>
      )}
    </OfflineDataHandler>
  );
};
```

## Performance Metrics to Monitor

- First Contentful Paint (FCP): Should be under 1.8 seconds
- Largest Contentful Paint (LCP): Should be under 2.5 seconds
- First Input Delay (FID): Should be under 100ms
- Cumulative Layout Shift (CLS): Should be under 0.1
- Time to Interactive (TTI): Should be under 3.5 seconds

Monitor these metrics using Lighthouse, Web Vitals, or custom performance monitoring tools.
