/**
 * Utility functions for formatting data for display
 * Optimized for African markets with proper localization
 */

/**
 * Format currency with proper locale support
 * Defaults to USD but supports multiple African currencies
 */
export function formatCurrency(
    amount: number | string,
    currency: string = 'USD',
    locale: string = 'en-US'
): string {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

    if (isNaN(numericAmount)) {
        return '0.00';
    }

    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(numericAmount);
    } catch (error) {
        // Fallback for unsupported currencies
        return `${currency} ${numericAmount.toFixed(2)}`;
    }
}

/**
 * Format date with proper locale support
 * Optimized for African market preferences
 */
export function formatDate(
    date: string | Date,
    options: Intl.DateTimeFormatOptions = {},
    locale: string = 'en-US'
): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) {
        return 'Invalid Date';
    }

    const defaultOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...options,
    };

    try {
        return new Intl.DateTimeFormat(locale, defaultOptions).format(dateObj);
    } catch (error) {
        // Fallback formatting
        return dateObj.toLocaleDateString();
    }
}

/**
 * Format date and time with proper locale support
 */
export function formatDateTime(
    date: string | Date,
    locale: string = 'en-US'
): string {
    return formatDate(date, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }, locale);
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(
    date: string | Date,
    locale: string = 'en-US'
): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

    if (diffInSeconds < 60) {
        return 'Just now';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
        return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
    }

    // For longer periods, show formatted date
    return formatDate(date, {}, locale);
}

/**
 * Format phone numbers with proper international formatting
 */
export function formatPhoneNumber(phone: string, countryCode?: string): string {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');

    if (!cleaned) {
        return phone;
    }

    // Handle common African country codes
    if (countryCode) {
        switch (countryCode.toUpperCase()) {
            case 'KE': // Kenya
                if (cleaned.length === 9) {
                    return `+254 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
                }
                break;
            case 'NG': // Nigeria
                if (cleaned.length === 10) {
                    return `+234 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
                }
                break;
            case 'ZA': // South Africa
                if (cleaned.length === 9) {
                    return `+27 ${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5)}`;
                }
                break;
        }
    }

    // Generic international format
    if (cleaned.startsWith('254')) {
        return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
    }

    return phone;
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format percentage with proper decimals
 */
export function formatPercentage(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`;
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
        return text;
    }
    return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * Format order status for display
 */
export function formatOrderStatus(status: string): string {
    return status
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

/**
 * Format inventory quantity with units
 */
export function formatQuantity(quantity: number, unit: string = 'units'): string {
    if (quantity === 1 && unit.endsWith('s')) {
        unit = unit.slice(0, -1); // Remove 's' for singular
    }
    return `${quantity} ${unit}`;
}