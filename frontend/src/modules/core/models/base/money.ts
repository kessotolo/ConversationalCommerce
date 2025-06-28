/**
 * Represents a monetary value with currency information
 * Used across the application for consistent money handling
 */
export interface Money {
  amount: number;
  currency: string;
}

/**
 * Format a Money object to a localized string
 */
export function formatMoney(money: Money, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: money.currency,
  }).format(money.amount);
}

/**
 * Create a Money object from an amount and currency
 */
export function createMoney(amount: number, currency = 'USD'): Money {
  return {
    amount,
    currency,
  };
}

/**
 * Add two Money objects (must be same currency)
 */
export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot add money with different currencies: ${a.currency} and ${b.currency}`);
  }

  return {
    amount: a.amount + b.amount,
    currency: a.currency,
  };
}

/**
 * Multiply a Money object by a factor
 */
export function multiplyMoney(money: Money, factor: number): Money {
  return {
    amount: money.amount * factor,
    currency: money.currency,
  };
}
