/**
 * Progressive Web App Service
 *
 * Business Context:
 * - "Merchant" = Business customer using the platform to run their online store
 * - "Customer" = End user shopping on the merchant's storefront
 * - PWA features improve mobile experience for users in African markets with limited connectivity
 * - Focus on offline-first architecture and progressive enhancement
 * - Touch-optimized interactions for mobile commerce
 */

import mobileOptimizationService from './MobileOptimizationService';
import cacheManagerService from './CacheManagerService';

export interface PWAManifest {
    name: string;
    short_name: string;
    description: string;
    start_url: string;
    display: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
    theme_color: string;
    background_color: string;
    orientation: 'portrait' | 'landscape' | 'any';
    icons: PWAIcon[];
    categories: string[];
}

export interface PWAIcon {
    src: string;
    sizes: string;
    type: string;
    purpose?: 'any' | 'maskable' | 'monochrome';
}

export interface TouchGesture {
    type: 'swipe' | 'pinch' | 'tap' | 'long-press' | 'double-tap';
    direction?: 'left' | 'right' | 'up' | 'down';
    element: HTMLElement;
    callback: (event: TouchEvent | PointerEvent) => void;
    threshold?: number;
    preventDefault?: boolean;
}

export interface OfflineStrategy {
    mode: 'cache-first' | 'network-first' | 'cache-only' | 'network-only' | 'stale-while-revalidate';
    patterns: string[];
    fallback?: string;
    maxAge?: number;
}

/**
 * Progressive Web App Service
 *
 * Enhances mobile experience with PWA capabilities optimized for African markets:
 * - Service worker registration and management
 * - Offline-first caching strategies
 * - Touch gesture recognition and handling
 * - App-like navigation and interactions
 * - Data saving mode integration
 * - Background sync for critical operations
 * - Push notification support
 * - Install prompts and app shell management
 *
 * Features:
 * - Dynamic manifest generation based on merchant branding
 * - Intelligent caching based on connection quality
 * - Touch-optimized UI components
 * - Offline queue for user actions
 * - Progressive image loading
 * - Background data synchronization
 * - Network-aware feature degradation
 */
class ProgressiveWebAppService {
    private isInstalled: boolean = false;
    private deferredPrompt: any = null;
    private registration: ServiceWorkerRegistration | null = null;
    private touchGestures: Map<string, TouchGesture> = new Map();
    private offlineQueue: Array<{ action: string; data: any; timestamp: number }> = [];
    private networkStatus: string = 'online';
    private dataSavingMode: boolean = false;

    constructor() {
        this.initializeServiceWorker();
        this.setupInstallPrompt();
        this.setupOfflineHandling();
        this.setupTouchGestures();
        this.setupNetworkMonitoring();
    }

    /**
     * Initialize and register service worker
     */
    private async initializeServiceWorker(): Promise<void> {
        if ('serviceWorker' in navigator) {
            try {
                this.registration = await navigator.serviceWorker.register('/sw.js', {
                    scope: '/',
                });

                // Listen for service worker updates
                this.registration.addEventListener('updatefound', () => {
                    const newWorker = this.registration?.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                this.showUpdateAvailable();
                            }
                        });
                    }
                });

                // Setup message handling with service worker
                navigator.serviceWorker.addEventListener('message', (event) => {
                    this.handleServiceWorkerMessage(event.data);
                });

                console.log('Service Worker registered successfully');
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }

    /**
     * Setup install prompt handling
     */
    private setupInstallPrompt(): void {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallBanner();
        });

        window.addEventListener('appinstalled', () => {
            this.isInstalled = true;
            this.hideInstallBanner();
            this.trackInstallation();
        });
    }

    /**
     * Setup offline handling and queue management
     */
    private setupOfflineHandling(): void {
        window.addEventListener('online', () => {
            this.networkStatus = 'online';
            this.processOfflineQueue();
        });

        window.addEventListener('offline', () => {
            this.networkStatus = 'offline';
            this.showOfflineIndicator();
        });

        // Load offline queue from localStorage
        const savedQueue = localStorage.getItem('pwa_offline_queue');
        if (savedQueue) {
            try {
                this.offlineQueue = JSON.parse(savedQueue);
            } catch (error) {
                console.warn('Failed to load offline queue:', error);
            }
        }
    }

    /**
     * Setup touch gesture recognition
     */
    private setupTouchGestures(): void {
        if (mobileOptimizationService.getDeviceInfo().isTouchDevice) {
            this.initializeTouchGestureEngine();
        }
    }

    /**
     * Setup network monitoring and adaptive loading
     */
    private setupNetworkMonitoring(): void {
        const networkStatus = mobileOptimizationService.getNetworkStatus();

        // Enable data saving mode for slow connections
        if (networkStatus.effectiveType === 'slow-2g' || networkStatus.effectiveType === '2g') {
            this.enableDataSavingMode();
        }

        // Monitor connection changes
        mobileOptimizationService.addEventListener('network', (status) => {
            this.handleNetworkChange(status);
        });
    }

    /**
     * Generate dynamic PWA manifest based on merchant
     */
    public generateManifest(merchantData: {
        name: string;
        subdomain: string;
        theme_color?: string;
        logo_url?: string;
    }): PWAManifest {
        return {
            name: `${merchantData.name} - Mobile Store`,
            short_name: merchantData.name,
            description: `Shop ${merchantData.name} on your mobile device`,
            start_url: `/store/${merchantData.subdomain}?utm_source=pwa`,
            display: 'standalone',
            theme_color: merchantData.theme_color || '#6C9A8B',
            background_color: '#ffffff',
            orientation: 'portrait',
            categories: ['shopping', 'business', 'productivity'],
            icons: this.generateIcons(merchantData.logo_url),
        };
    }

    /**
     * Enable PWA install prompt
     */
    public async promptInstall(): Promise<boolean> {
        if (!this.deferredPrompt) {
            return false;
        }

        try {
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;

            if (outcome === 'accepted') {
                this.trackInstallation();
                return true;
            }

            return false;
        } catch (error) {
            console.error('Install prompt failed:', error);
            return false;
        } finally {
            this.deferredPrompt = null;
        }
    }

    /**
     * Register touch gesture
     */
    public registerTouchGesture(id: string, gesture: TouchGesture): void {
        this.touchGestures.set(id, gesture);
        this.attachGestureListeners(id, gesture);
    }

    /**
     * Unregister touch gesture
     */
    public unregisterTouchGesture(id: string): void {
        const gesture = this.touchGestures.get(id);
        if (gesture) {
            this.detachGestureListeners(gesture);
            this.touchGestures.delete(id);
        }
    }

    /**
     * Add action to offline queue
     */
    public addToOfflineQueue(action: string, data: any): void {
        const queueItem = {
            action,
            data,
            timestamp: Date.now(),
        };

        this.offlineQueue.push(queueItem);
        this.saveOfflineQueue();

        // Show user feedback
        this.showOfflineQueueNotification();
    }

    /**
     * Enable data saving mode
     */
    public enableDataSavingMode(): void {
        this.dataSavingMode = true;

        // Apply data saving optimizations
        this.applyDataSavingOptimizations();

        // Notify components about data saving mode
        window.dispatchEvent(new CustomEvent('datasavingmode', {
            detail: { enabled: true }
        }));
    }

    /**
     * Disable data saving mode
     */
    public disableDataSavingMode(): void {
        this.dataSavingMode = false;

        // Remove data saving optimizations
        this.removeDataSavingOptimizations();

        // Notify components about data saving mode
        window.dispatchEvent(new CustomEvent('datasavingmode', {
            detail: { enabled: false }
        }));
    }

    /**
     * Preload critical resources
     */
    public async preloadCriticalResources(merchantId: string): Promise<void> {
        const criticalResources = [
            `/store/${merchantId}`,
            `/api/v1/storefront/${merchantId}/products?limit=10`,
            '/fonts/inter-var.woff2',
            '/icons/icon-192x192.png',
        ];

        const preloadPromises = criticalResources.map(async (resource) => {
            try {
                if (resource.startsWith('/api/')) {
                    // Preload API data
                    const response = await fetch(resource);
                    if (response.ok) {
                        const data = await response.json();
                        await cacheManagerService.cacheApiResponse(resource, data, { merchantId });
                    }
                } else {
                    // Preload static resources
                    const link = document.createElement('link');
                    link.rel = 'prefetch';
                    link.href = resource;
                    document.head.appendChild(link);
                }
            } catch (error) {
                console.warn(`Failed to preload ${resource}:`, error);
            }
        });

        await Promise.allSettled(preloadPromises);
    }

    /**
     * Initialize progressive image loading
     */
    public initializeProgressiveImageLoading(): void {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) {
                            const img = entry.target as HTMLImageElement;
                            this.loadProgressiveImage(img);
                            imageObserver.unobserve(img);
                        }
                    });
                },
                {
                    rootMargin: '50px 0px',
                    threshold: 0.01,
                }
            );

            // Observe all lazy images
            document.querySelectorAll('img[data-src]').forEach((img) => {
                imageObserver.observe(img);
            });
        }
    }

    /**
     * Setup background sync for critical operations
     */
    public async setupBackgroundSync(tag: string, data: any): Promise<void> {
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
            try {
                await navigator.serviceWorker.ready;

                // Store sync data
                localStorage.setItem(`bg_sync_${tag}`, JSON.stringify(data));

                // Register background sync
                await this.registration?.sync.register(tag);
            } catch (error) {
                console.error('Background sync registration failed:', error);
                // Fallback to offline queue
                this.addToOfflineQueue(tag, data);
            }
        } else {
            // Fallback for browsers without background sync
            this.addToOfflineQueue(tag, data);
        }
    }

    /**
     * Get PWA installation status
     */
    public getInstallationStatus(): {
        isInstallable: boolean;
        isInstalled: boolean;
        canPrompt: boolean;
    } {
        return {
            isInstallable: !!this.deferredPrompt || this.isStandalone(),
            isInstalled: this.isInstalled || this.isStandalone(),
            canPrompt: !!this.deferredPrompt,
        };
    }

    /**
     * Private helper methods
     */
    private generateIcons(logoUrl?: string): PWAIcon[] {
        const baseIcon = logoUrl || '/icons/icon.png';
        const sizes = ['72', '96', '128', '144', '152', '192', '384', '512'];

        return sizes.map(size => ({
            src: `/icons/icon-${size}x${size}.png`,
            sizes: `${size}x${size}`,
            type: 'image/png',
            purpose: size === '192' ? 'maskable' : 'any',
        }));
    }

    private isStandalone(): boolean {
        return window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true;
    }

    private initializeTouchGestureEngine(): void {
        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;

        document.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                touchStartTime = Date.now();
            }
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            if (e.changedTouches.length === 1) {
                const touchEndX = e.changedTouches[0].clientX;
                const touchEndY = e.changedTouches[0].clientY;
                const touchEndTime = Date.now();

                this.detectGesture(
                    touchStartX, touchStartY, touchStartTime,
                    touchEndX, touchEndY, touchEndTime,
                    e
                );
            }
        }, { passive: true });
    }

    private detectGesture(
        startX: number, startY: number, startTime: number,
        endX: number, endY: number, endTime: number,
        event: TouchEvent
    ): void {
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        const deltaTime = endTime - startTime;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // Long press detection
        if (deltaTime > 500 && distance < 10) {
            this.triggerGesture('long-press', null, event);
            return;
        }

        // Swipe detection
        if (distance > 50 && deltaTime < 300) {
            let direction: 'left' | 'right' | 'up' | 'down';

            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                direction = deltaX > 0 ? 'right' : 'left';
            } else {
                direction = deltaY > 0 ? 'down' : 'up';
            }

            this.triggerGesture('swipe', direction, event);
            return;
        }

        // Tap detection
        if (distance < 10 && deltaTime < 300) {
            this.triggerGesture('tap', null, event);
        }
    }

    private triggerGesture(
        type: TouchGesture['type'],
        direction: TouchGesture['direction'] | null,
        event: TouchEvent
    ): void {
        for (const [_, gesture] of this.touchGestures) {
            if (gesture.type === type &&
                (!direction || !gesture.direction || gesture.direction === direction)) {

                const target = event.target as HTMLElement;
                if (gesture.element.contains(target) || gesture.element === target) {
                    if (gesture.preventDefault) {
                        event.preventDefault();
                    }
                    gesture.callback(event);
                }
            }
        }
    }

    private attachGestureListeners(id: string, gesture: TouchGesture): void {
        // Touch gesture listeners are handled globally in initializeTouchGestureEngine
        // This method can be extended for specific element listeners if needed
    }

    private detachGestureListeners(gesture: TouchGesture): void {
        // Cleanup specific gesture listeners if any
    }

    private async processOfflineQueue(): Promise<void> {
        if (this.offlineQueue.length === 0) return;

        const processedItems: Array<{ action: string; data: any; timestamp: number }> = [];

        for (const item of this.offlineQueue) {
            try {
                await this.processOfflineAction(item);
                processedItems.push(item);
            } catch (error) {
                console.error('Failed to process offline action:', error);
                // Keep item in queue for retry
            }
        }

        // Remove processed items
        this.offlineQueue = this.offlineQueue.filter(item =>
            !processedItems.some(processed => processed.timestamp === item.timestamp)
        );

        this.saveOfflineQueue();

        if (processedItems.length > 0) {
            this.showOfflineQueueProcessedNotification(processedItems.length);
        }
    }

    private async processOfflineAction(item: { action: string; data: any; timestamp: number }): Promise<void> {
        // Process different types of offline actions
        switch (item.action) {
            case 'add_to_cart':
                // Re-attempt adding to cart
                break;
            case 'place_order':
                // Re-attempt placing order
                break;
            case 'update_profile':
                // Re-attempt profile update
                break;
            default:
                console.warn('Unknown offline action:', item.action);
        }
    }

    private saveOfflineQueue(): void {
        localStorage.setItem('pwa_offline_queue', JSON.stringify(this.offlineQueue));
    }

    private async loadProgressiveImage(img: HTMLImageElement): Promise<void> {
        const src = img.dataset.src;
        if (!src) return;

        // Use appropriate image quality based on connection
        const quality = this.dataSavingMode ? 'low' : 'high';
        const optimizedSrc = this.getOptimizedImageUrl(src, quality);

        try {
            // Load image with timeout for slow connections
            const imagePromise = new Promise<void>((resolve, reject) => {
                const tempImg = new Image();
                tempImg.onload = () => {
                    img.src = optimizedSrc;
                    img.classList.add('loaded');
                    resolve();
                };
                tempImg.onerror = reject;
                tempImg.src = optimizedSrc;
            });

            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('Image load timeout')), 10000);
            });

            await Promise.race([imagePromise, timeoutPromise]);
        } catch (error) {
            console.warn('Progressive image loading failed:', error);
            // Fallback to original src
            img.src = src;
        }
    }

    private getOptimizedImageUrl(src: string, quality: 'low' | 'medium' | 'high'): string {
        // Add query parameters for image optimization
        const url = new URL(src, window.location.origin);
        url.searchParams.set('quality', quality);
        url.searchParams.set('format', 'webp');
        return url.toString();
    }

    private handleNetworkChange(status: any): void {
        if (status.online && this.networkStatus === 'offline') {
            this.hideOfflineIndicator();
            this.processOfflineQueue();
        } else if (!status.online) {
            this.showOfflineIndicator();
        }

        this.networkStatus = status.online ? 'online' : 'offline';

        // Adjust data saving mode based on connection quality
        if (status.effectiveType && ['slow-2g', '2g'].includes(status.effectiveType)) {
            if (!this.dataSavingMode) {
                this.enableDataSavingMode();
            }
        }
    }

    private applyDataSavingOptimizations(): void {
        // Reduce image quality
        document.documentElement.classList.add('data-saving-mode');

        // Disable animations
        document.documentElement.style.setProperty('--animation-duration', '0s');

        // Reduce update frequency
        this.throttleUpdates();
    }

    private removeDataSavingOptimizations(): void {
        document.documentElement.classList.remove('data-saving-mode');
        document.documentElement.style.removeProperty('--animation-duration');
    }

    private throttleUpdates(): void {
        // Throttle real-time updates when in data saving mode
        // Implementation would depend on specific update mechanisms
    }

    private showInstallBanner(): void {
        // Show install banner UI
        const event = new CustomEvent('pwa-install-available');
        window.dispatchEvent(event);
    }

    private hideInstallBanner(): void {
        const event = new CustomEvent('pwa-install-completed');
        window.dispatchEvent(event);
    }

    private showUpdateAvailable(): void {
        const event = new CustomEvent('pwa-update-available');
        window.dispatchEvent(event);
    }

    private showOfflineIndicator(): void {
        const event = new CustomEvent('pwa-offline', { detail: { offline: true } });
        window.dispatchEvent(event);
    }

    private hideOfflineIndicator(): void {
        const event = new CustomEvent('pwa-offline', { detail: { offline: false } });
        window.dispatchEvent(event);
    }

    private showOfflineQueueNotification(): void {
        const event = new CustomEvent('pwa-offline-queued', {
            detail: { count: this.offlineQueue.length }
        });
        window.dispatchEvent(event);
    }

    private showOfflineQueueProcessedNotification(count: number): void {
        const event = new CustomEvent('pwa-offline-processed', {
            detail: { count }
        });
        window.dispatchEvent(event);
    }

    private trackInstallation(): void {
        // Track PWA installation for analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'pwa_install', {
                event_category: 'PWA',
                event_label: 'Installation',
            });
        }
    }

    private handleServiceWorkerMessage(data: any): void {
        switch (data.type) {
            case 'CACHE_UPDATED':
                this.showUpdateAvailable();
                break;
            case 'OFFLINE_FALLBACK':
                this.showOfflineIndicator();
                break;
            default:
                console.log('Service Worker message:', data);
        }
    }
}

// Export singleton instance
const progressiveWebAppService = new ProgressiveWebAppService();
export default progressiveWebAppService;