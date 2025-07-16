/**
 * Comprehensive Cache Management Service
 *
 * Business Context:
 * - "Merchant" = Business customer using the platform to run their online store
 * - "Customer" = End user shopping on the merchant's storefront
 * - Caching improves performance for mobile users in African markets with limited connectivity
 * - Multi-level caching strategy optimized for e-commerce data patterns
 * - Progressive data loading for better user experience
 */

import mobileOptimizationService from './MobileOptimizationService';

export interface CacheConfig {
    maxAge: number; // milliseconds
    maxSize: number; // bytes
    strategy: 'lru' | 'fifo' | 'ttl';
    compression: boolean;
    persistent: boolean;
}

export interface CacheEntry<T = any> {
    key: string;
    data: T;
    timestamp: number;
    expiry: number;
    size: number;
    accessCount: number;
    lastAccess: number;
    metadata?: Record<string, any>;
}

export interface CacheStats {
    totalEntries: number;
    totalSize: number;
    hitRate: number;
    missRate: number;
    evictionCount: number;
    compressionRatio: number;
}

export type CacheLevel = 'memory' | 'localStorage' | 'indexedDB' | 'sessionStorage';

/**
 * Multi-level Cache Manager Service
 *
 * Provides comprehensive caching capabilities optimized for e-commerce:
 * - API response caching with intelligent invalidation
 * - Image optimization and progressive loading
 * - Product catalog caching with search indexing
 * - User session and preference caching
 * - Offline data synchronization
 * - Memory-efficient storage management
 *
 * Features:
 * - Multiple cache levels (memory, localStorage, IndexedDB)
 * - Intelligent eviction policies (LRU, FIFO, TTL)
 * - Data compression for large datasets
 * - Cache warming strategies
 * - Real-time cache statistics
 * - Mobile-optimized memory management
 */
class CacheManagerService {
    private memoryCache: Map<string, CacheEntry> = new Map();
    private cacheStats: Map<string, CacheStats> = new Map();
    private defaultConfigs: Map<string, CacheConfig> = new Map();
    private compressionEnabled: boolean = true;
    private maxMemorySize: number = 50 * 1024 * 1024; // 50MB
    private currentMemorySize: number = 0;

    constructor() {
        this.initializeDefaultConfigs();
        this.setupPerformanceMonitoring();
        this.initializeStorageCleanup();
    }

    /**
     * Initialize default cache configurations for different data types
     */
    private initializeDefaultConfigs(): void {
        // Product catalog - medium term caching
        this.defaultConfigs.set('products', {
            maxAge: 15 * 60 * 1000, // 15 minutes
            maxSize: 10 * 1024 * 1024, // 10MB
            strategy: 'lru',
            compression: true,
            persistent: true,
        });

        // API responses - short term caching
        this.defaultConfigs.set('api', {
            maxAge: 5 * 60 * 1000, // 5 minutes
            maxSize: 5 * 1024 * 1024, // 5MB
            strategy: 'ttl',
            compression: true,
            persistent: false,
        });

        // Images - long term caching
        this.defaultConfigs.set('images', {
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            maxSize: 20 * 1024 * 1024, // 20MB
            strategy: 'lru',
            compression: false,
            persistent: true,
        });

        // User preferences - persistent caching
        this.defaultConfigs.set('preferences', {
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            maxSize: 1 * 1024 * 1024, // 1MB
            strategy: 'ttl',
            compression: false,
            persistent: true,
        });

        // Search results - short term caching
        this.defaultConfigs.set('search', {
            maxAge: 10 * 60 * 1000, // 10 minutes
            maxSize: 2 * 1024 * 1024, // 2MB
            strategy: 'lru',
            compression: true,
            persistent: false,
        });

        // Cart data - session based
        this.defaultConfigs.set('cart', {
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            maxSize: 512 * 1024, // 512KB
            strategy: 'ttl',
            compression: false,
            persistent: true,
        });
    }

    /**
     * Set data in cache with automatic level selection
     */
    async set<T>(
        key: string,
        data: T,
        category: string = 'default',
        customConfig?: Partial<CacheConfig>
    ): Promise<boolean> {
        try {
            const config = { ...this.getConfig(category), ...customConfig };
            const serializedData = JSON.stringify(data);
            const compressedData = config.compression ? this.compress(serializedData) : serializedData;
            const size = new Blob([compressedData]).size;

            const entry: CacheEntry<T> = {
                key,
                data,
                timestamp: Date.now(),
                expiry: Date.now() + config.maxAge,
                size,
                accessCount: 0,
                lastAccess: Date.now(),
                metadata: {
                    category,
                    compressed: config.compression,
                    originalSize: new Blob([serializedData]).size,
                },
            };

            // Try memory cache first for fast access
            if (this.canStoreInMemory(size)) {
                this.memoryCache.set(key, entry);
                this.currentMemorySize += size;
                this.updateStats(category, 'memory', true);
            }

            // Store in persistent storage if configured
            if (config.persistent) {
                await this.setInPersistentStorage(key, entry, category);
            }

            // Trigger cleanup if memory is getting full
            if (this.currentMemorySize > this.maxMemorySize * 0.8) {
                this.performMemoryCleanup();
            }

            return true;
        } catch (error) {
            console.error('Cache set error:', error);
            return false;
        }
    }

    /**
     * Get data from cache with fallback levels
     */
    async get<T>(key: string, category: string = 'default'): Promise<T | null> {
        try {
            // Check memory cache first
            const memoryEntry = this.memoryCache.get(key);
            if (memoryEntry && !this.isExpired(memoryEntry)) {
                memoryEntry.accessCount++;
                memoryEntry.lastAccess = Date.now();
                this.updateStats(category, 'memory', true);
                return memoryEntry.data as T;
            }

            // Check persistent storage
            const persistentEntry = await this.getFromPersistentStorage<T>(key, category);
            if (persistentEntry && !this.isExpired(persistentEntry)) {
                // Promote to memory cache for faster future access
                if (this.canStoreInMemory(persistentEntry.size)) {
                    this.memoryCache.set(key, persistentEntry);
                    this.currentMemorySize += persistentEntry.size;
                }
                this.updateStats(category, 'localStorage', true);
                return persistentEntry.data;
            }

            // Cache miss
            this.updateStats(category, 'memory', false);
            return null;
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }

    /**
     * Cache API responses with intelligent invalidation
     */
    async cacheApiResponse(
        url: string,
        response: any,
        options: {
            method?: string;
            merchantId?: string;
            invalidateOnMutation?: boolean;
            dependencies?: string[];
        } = {}
    ): Promise<void> {
        const { method = 'GET', merchantId, invalidateOnMutation = true, dependencies = [] } = options;

        // Only cache GET requests by default
        if (method !== 'GET' && !options.invalidateOnMutation) return;

        const cacheKey = this.generateApiCacheKey(url, merchantId);
        const category = 'api';

        // Add metadata for intelligent invalidation
        const metadata = {
            url,
            method,
            merchantId,
            dependencies,
            invalidateOnMutation,
        };

        await this.set(cacheKey, response, category, {
            maxAge: this.getApiCacheMaxAge(url)
        });

        // If this is a mutation request, invalidate related caches
        if (method !== 'GET' && invalidateOnMutation) {
            await this.invalidateRelatedApiCaches(url, merchantId);
        }
    }

    /**
     * Get cached API response
     */
    async getCachedApiResponse(
        url: string,
        merchantId?: string
    ): Promise<any | null> {
        const cacheKey = this.generateApiCacheKey(url, merchantId);
        return await this.get(cacheKey, 'api');
    }

    /**
     * Cache product data with search optimization
     */
    async cacheProducts(
        products: any[],
        merchantId: string,
        searchTerms?: string[]
    ): Promise<void> {
        const category = 'products';

        // Cache full product list
        await this.set(`products_${merchantId}`, products, category);

        // Cache individual products for detailed views
        for (const product of products) {
            await this.set(product, `product_${product.id}`, category);
        }

        // Cache search index if search terms provided
        if (searchTerms && searchTerms.length > 0) {
            const searchIndex = this.buildProductSearchIndex(products, searchTerms);
            await this.set(searchIndex, `search_index_${merchantId}`, 'search');
        }
    }

    /**
     * Cache image with optimization
     */
    async cacheImage(
        imageUrl: string,
        imageBlob: Blob,
        optimizationLevel?: 'low' | 'medium' | 'high'
    ): Promise<string> {
        const level = optimizationLevel || mobileOptimizationService.getRecommendedImageQuality() > 0.8 ? 'high' : 'medium';

        // Optimize image based on device capabilities
        const optimizedBlob = await this.optimizeImage(imageBlob, level);
        const cacheKey = `image_${this.hashUrl(imageUrl)}_${level}`;

        // Convert to base64 for storage
        const base64Data = await this.blobToBase64(optimizedBlob);
        await this.set(base64Data, cacheKey, 'images');

        return `data:${optimizedBlob.type};base64,${base64Data}`;
    }

    /**
     * Warm cache with frequently accessed data
     */
    async warmCache(merchantId: string): Promise<void> {
        try {
            // Pre-load critical merchant data
            const criticalEndpoints = [
                `/api/v1/storefront/${merchantId}/products?limit=20`,
                `/api/v1/storefront/${merchantId}/categories`,
                `/api/v1/storefront/merchants/${merchantId}`,
            ];

            const warmupPromises = criticalEndpoints.map(async (endpoint) => {
                try {
                    const response = await fetch(endpoint);
                    if (response.ok) {
                        const data = await response.json();
                        await this.cacheApiResponse(endpoint, data, { merchantId });
                    }
                } catch (error) {
                    console.warn(`Failed to warm cache for ${endpoint}:`, error);
                }
            });

            await Promise.allSettled(warmupPromises);
        } catch (error) {
            console.error('Cache warming error:', error);
        }
    }

    /**
     * Clear cache by category or pattern
     */
    async clear(pattern?: string | RegExp, category?: string): Promise<void> {
        if (pattern) {
            const keysToDelete: string[] = [];

            // Find matching keys in memory cache
            for (const [key, entry] of this.memoryCache.entries()) {
                if (this.keyMatches(key, pattern) && (!category || entry.metadata?.category === category)) {
                    keysToDelete.push(key);
                    this.currentMemorySize -= entry.size;
                }
            }

            // Remove from memory cache
            keysToDelete.forEach(key => this.memoryCache.delete(key));

            // Clear from persistent storage
            await this.clearPersistentStorage(pattern, category);
        } else {
            // Clear all
            this.memoryCache.clear();
            this.currentMemorySize = 0;
            await this.clearPersistentStorage();
        }
    }

    /**
     * Get cache statistics
     */
    getStats(category?: string): CacheStats | Map<string, CacheStats> {
        if (category) {
            return this.cacheStats.get(category) || {
                totalEntries: 0,
                totalSize: 0,
                hitRate: 0,
                missRate: 0,
                evictionCount: 0,
                compressionRatio: 0,
            };
        }
        return this.cacheStats;
    }

    /**
     * Setup performance monitoring
     */
    private setupPerformanceMonitoring(): void {
        // Monitor memory usage
        if (typeof window !== 'undefined' && 'performance' in window) {
            setInterval(() => {
                this.performanceCheck();
            }, 30000); // Check every 30 seconds
        }
    }

    /**
     * Performance check and optimization
     */
    private performanceCheck(): void {
        const deviceInfo = mobileOptimizationService.getDeviceInfo();

        // Adjust cache size based on device capabilities
        if (deviceInfo.isLowEndDevice) {
            this.maxMemorySize = 20 * 1024 * 1024; // 20MB for low-end devices
        } else if (deviceInfo.isMobile) {
            this.maxMemorySize = 35 * 1024 * 1024; // 35MB for mobile
        }

        // Perform cleanup if memory usage is high
        if (this.currentMemorySize > this.maxMemorySize * 0.9) {
            this.performMemoryCleanup();
        }
    }

    /**
     * Helper methods
     */
    private getConfig(category: string): CacheConfig {
        return this.defaultConfigs.get(category) || this.defaultConfigs.get('api')!;
    }

    private isExpired(entry: CacheEntry): boolean {
        return Date.now() > entry.expiry;
    }

    private canStoreInMemory(size: number): boolean {
        return this.currentMemorySize + size <= this.maxMemorySize;
    }

    private generateApiCacheKey(url: string, merchantId?: string): string {
        const key = merchantId ? `${merchantId}_${url}` : url;
        return this.hashUrl(key);
    }

    private hashUrl(url: string): string {
        // Simple hash function for cache keys
        let hash = 0;
        for (let i = 0; i < url.length; i++) {
            const char = url.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    private keyMatches(key: string, pattern: string | RegExp): boolean {
        if (typeof pattern === 'string') {
            return key.includes(pattern);
        }
        return pattern.test(key);
    }

    private compress(data: string): string {
        // Simple compression placeholder - in production, use proper compression
        return data;
    }

    private async optimizeImage(blob: Blob, level: 'low' | 'medium' | 'high'): Promise<Blob> {
        // Image optimization placeholder - implement actual optimization
        return blob;
    }

    private async blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result as string;
                if (result) {
                    resolve(result.split(',')[1]); // Remove data:mime;base64, prefix
                } else {
                    reject(new Error('Failed to read blob'));
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    private buildProductSearchIndex(products: any[], searchTerms: string[]): any {
        // Build optimized search index
        return products.map(product => ({
            id: product.id,
            name: product.name.toLowerCase(),
            description: (product.description || '').toLowerCase(),
            categories: (product.categories || []).map((c: string) => c.toLowerCase()),
            tags: (product.tags || []).map((t: string) => t.toLowerCase()),
        }));
    }

    private getApiCacheMaxAge(url: string): number {
        // Dynamic cache age based on URL patterns
        if (url.includes('/products')) return 15 * 60 * 1000; // 15 minutes
        if (url.includes('/orders')) return 2 * 60 * 1000; // 2 minutes
        if (url.includes('/analytics')) return 5 * 60 * 1000; // 5 minutes
        return 10 * 60 * 1000; // 10 minutes default
    }

    private async invalidateRelatedApiCaches(url: string, merchantId?: string): Promise<void> {
        const patterns = [];

        if (url.includes('/products')) {
            patterns.push('products', 'search_index');
        }
        if (url.includes('/orders')) {
            patterns.push('orders', 'dashboard');
        }
        if (url.includes('/cart')) {
            patterns.push('cart');
        }

        for (const pattern of patterns) {
            await this.clear(pattern, 'api');
        }
    }

    private performMemoryCleanup(): void {
        // LRU eviction for memory cache
        const entries = Array.from(this.memoryCache.entries())
            .sort((a, b) => a[1].lastAccess - b[1].lastAccess);

        const targetSize = this.maxMemorySize * 0.7; // Target 70% of max size
        let freedSize = 0;

        for (const [key, entry] of entries) {
            if (this.currentMemorySize - freedSize <= targetSize) break;

            this.memoryCache.delete(key);
            freedSize += entry.size;
        }

        this.currentMemorySize -= freedSize;
    }

    private async setInPersistentStorage(key: string, entry: CacheEntry, category: string): Promise<void> {
        try {
            const storageKey = `cache_${category}_${key}`;

            if (typeof window !== 'undefined') {
                // Use localStorage for smaller data, IndexedDB for larger data
                if (entry.size < 100 * 1024) { // < 100KB
                    localStorage.setItem(storageKey, JSON.stringify(entry));
                } else {
                    // IndexedDB implementation would go here
                    // For now, fallback to localStorage with size limit
                    if (entry.size < 5 * 1024 * 1024) { // < 5MB
                        localStorage.setItem(storageKey, JSON.stringify(entry));
                    }
                }
            }
        } catch (error) {
            console.warn('Persistent storage error:', error);
        }
    }

    private async getFromPersistentStorage<T>(key: string, category: string): Promise<CacheEntry<T> | null> {
        try {
            const storageKey = `cache_${category}_${key}`;

            if (typeof window !== 'undefined') {
                const stored = localStorage.getItem(storageKey);
                if (stored) {
                    return JSON.parse(stored) as CacheEntry<T>;
                }
            }

            return null;
        } catch (error) {
            console.warn('Persistent storage retrieval error:', error);
            return null;
        }
    }

    private async clearPersistentStorage(pattern?: string | RegExp, category?: string): Promise<void> {
        if (typeof window !== 'undefined') {
            const keysToDelete: string[] = [];

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('cache_')) {
                    if (!pattern || this.keyMatches(key, pattern)) {
                        if (!category || key.includes(`cache_${category}_`)) {
                            keysToDelete.push(key);
                        }
                    }
                }
            }

            keysToDelete.forEach(key => localStorage.removeItem(key));
        }
    }

    private updateStats(category: string, level: CacheLevel, hit: boolean): void {
        const stats = this.cacheStats.get(category) || {
            totalEntries: 0,
            totalSize: 0,
            hitRate: 0,
            missRate: 0,
            evictionCount: 0,
            compressionRatio: 0,
        };

        if (hit) {
            stats.hitRate++;
        } else {
            stats.missRate++;
        }

        this.cacheStats.set(category, stats);
    }

    private initializeStorageCleanup(): void {
        // Clean up expired entries periodically
        if (typeof window !== 'undefined') {
            setInterval(() => {
                this.cleanupExpiredEntries();
            }, 5 * 60 * 1000); // Every 5 minutes
        }
    }

    private cleanupExpiredEntries(): void {
        // Clean memory cache
        for (const [key, entry] of this.memoryCache.entries()) {
            if (this.isExpired(entry)) {
                this.memoryCache.delete(key);
                this.currentMemorySize -= entry.size;
            }
        }

        // Clean persistent storage
        if (typeof window !== 'undefined') {
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && key.startsWith('cache_')) {
                    try {
                        const stored = localStorage.getItem(key);
                        if (stored) {
                            const entry = JSON.parse(stored);
                            if (this.isExpired(entry)) {
                                localStorage.removeItem(key);
                            }
                        }
                    } catch (error) {
                        // Remove corrupted entries
                        localStorage.removeItem(key);
                    }
                }
            }
        }
    }
}

// Export singleton instance
const cacheManagerService = new CacheManagerService();
export default cacheManagerService;