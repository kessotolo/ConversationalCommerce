/**
 * Frontend Configuration
 *
 * Optimized for mobile-first African markets with:
 * - Environment-aware API configuration
 * - Timeout settings appropriate for variable connectivity
 * - Cache durations optimized for data conservation
 */

// API Configuration
export const API_BASE_URL =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:8000'
    : (process.env['NEXT_PUBLIC_API_URL'] ?? 'https://api.enwhe.io');
export const API_TIMEOUT = 15000; // 15 seconds - optimized for slower connections
export const RETRY_ATTEMPTS = 3; // Retry failed requests for better resilience

// Domain Configuration
export const DOMAIN_CONFIG = {
  // Base domain for merchant subdomains (merchant-id.enwhe.io)
  BASE_DOMAIN: process.env['NEXT_PUBLIC_BASE_DOMAIN'] ?? 'enwhe.io',

  // Admin dashboard domain
  ADMIN_DOMAIN: process.env['NEXT_PUBLIC_ADMIN_DOMAIN'] ?? 'admin.enwhe.com',

  // Main app domain
  APP_DOMAIN: process.env['NEXT_PUBLIC_APP_DOMAIN'] ?? 'app.enwhe.io',

  // API domain
  API_DOMAIN: process.env['NEXT_PUBLIC_API_DOMAIN'] ?? 'api.enwhe.io',
};

// Helper function to generate merchant URLs
export const getMerchantUrl = (merchantId: string, customDomain?: string): string => {
  if (customDomain) {
    return `https://${customDomain}`;
  }
  return `https://${merchantId}.${DOMAIN_CONFIG.BASE_DOMAIN}`;
};

// Cache Configuration - higher values reduce bandwidth usage
export const CACHE_DURATION = {
  products: 3600, // 1 hour cache for product listings
  categories: 7200, // 2 hours for categories that change less frequently
  userProfile: 300, // 5 minutes for user data
};

// Image Optimization for low-bandwidth environments
export const IMAGE_QUALITY = {
  thumbnail: 70, // Lower quality for thumbnails to save bandwidth
  preview: 80, // Medium quality for product previews
  full: 90, // Higher quality only when specifically requested
};

// Feature flags for progressive enhancement
export const FEATURES = {
  offlineMode: true, // Enable offline capabilities
  lowBandwidthMode: true, // Optimize for low bandwidth by default
  imageCompression: true, // Enable image compression for slower connections
};

// Optimized settings for PWA - mobile-first Africa
export const PWA_SETTINGS = {
  enableServiceWorker: true,
  minimumCacheTime: 86400, // 24 hours
  precacheEssentialAssets: true,
};

// African market SMS providers
export const SMS_PROVIDERS = {
  default: 'twilio',
  alternates: ['africastalking', 'termii'],
};
