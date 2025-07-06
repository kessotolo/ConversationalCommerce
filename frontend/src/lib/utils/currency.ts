/**
 * Format currency amount with proper locale and currency symbol
 * @param amount - The amount to format
 * @param currency - The currency code (e.g., 'USD', 'EUR', 'GBP')
 * @param locale - The locale for formatting (default: 'en-US')
 * @returns Formatted currency string
 */
export function formatCurrency(
    amount: number,
    currency: string = 'USD',
    locale: string = 'en-US'
): string {
    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    } catch (error) {
        // Fallback if currency/locale is not supported
        return `${currency} ${amount.toFixed(2)}`;
    }
}

/**
 * Parse currency string to number
 * @param currencyString - The currency string to parse
 * @returns Parsed number or 0 if invalid
 */
export function parseCurrency(currencyString: string): number {
    // Remove currency symbols and spaces, keep only numbers and decimal point
    const cleaned = currencyString.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
}

/**
 * Get currency symbol for a given currency code
 * @param currency - The currency code
 * @param locale - The locale for formatting (default: 'en-US')
 * @returns Currency symbol
 */
export function getCurrencySymbol(currency: string, locale: string = 'en-US'): string {
    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(0).replace(/\d/g, '').trim();
    } catch (error) {
        return currency;
    }
}

/**
 * Common currency codes and their symbols
 */
export const CURRENCY_CODES = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    AUD: 'A$',
    CAD: 'C$',
    CHF: 'CHF',
    CNY: '¥',
    SEK: 'kr',
    NZD: 'NZ$',
    MXN: '$',
    SGD: 'S$',
    HKD: 'HK$',
    NOK: 'kr',
    TRY: '₺',
    RUB: '₽',
    INR: '₹',
    BRL: 'R$',
    ZAR: 'R',
    KRW: '₩',
    PLN: 'zł',
} as const;

export type CurrencyCode = keyof typeof CURRENCY_CODES;