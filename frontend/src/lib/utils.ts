import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'NGN'): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date, format?: 'full' | 'date' | 'time'): string {
  const dateObj = new Date(date);

  if (format === 'time') {
    return new Intl.DateTimeFormat('en-NG', {
      hour: 'numeric',
      minute: 'numeric',
    }).format(dateObj);
  } else if (format === 'date') {
    return new Intl.DateTimeFormat('en-NG', {
      day: 'numeric',
      month: 'short',
    }).format(dateObj);
  }

  // Default full format
  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(dateObj);
}

export function formatPhoneNumber(phoneNumber: string): string {
  // Format for African phone numbers
  if (!phoneNumber) return '';

  // Remove any non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');

  // Format based on length
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  } else if (cleaned.length === 11) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  } else if (cleaned.length === 12 || cleaned.length === 13) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  }

  return phoneNumber;
}

/**
 * Parses an unknown error from API/service calls and returns a user-friendly message.
 * Handles Axios, fetch, and generic JS errors.
 */
export function parseApiError(error: unknown): string {
  if (!error) return 'An unknown error occurred.';

  // Axios error (with response)
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const err = error as { response?: { data?: { message?: string; detail?: string } | string } };
    if (
      err.response?.data &&
      typeof err.response.data === 'object' &&
      'message' in err.response.data &&
      typeof err.response.data.message === 'string'
    )
      return err.response.data.message;
    if (
      err.response?.data &&
      typeof err.response.data === 'object' &&
      'detail' in err.response.data &&
      typeof err.response.data.detail === 'string'
    )
      return err.response.data.detail;
    if (typeof err.response?.data === 'string') return err.response.data;
    return 'A server error occurred.';
  }

  // Fetch error (with message)
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const err = error as { message?: string };
    if (typeof err.message === 'string') return err.message;
  }

  // String error
  if (typeof error === 'string') return error;

  // Fallback
  return 'An unexpected error occurred.';
}
