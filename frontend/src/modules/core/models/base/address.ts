/**
 * Address model for shipping and billing information
 * Designed to work with both web form input and NLP extraction
 */
export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  apartment?: string;
  landmark?: string; // Important for African markets where formal addressing may be limited
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

/**
 * Format an address to a single-line string
 */
export function formatAddress(address: Address): string {
  const parts = [
    address.apartment ? `${address.apartment}, ` : '',
    address.street,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ].filter(Boolean);

  return parts.join(', ');
}

/**
 * Format an address for display in multiple lines
 */
export function formatAddressMultiLine(address: Address): string[] {
  const lines: string[] = [];

  if (address.apartment) {
    lines.push(address.apartment);
  }

  lines.push(address.street);
  lines.push(`${address.city}, ${address.state} ${address.postalCode}`);
  lines.push(address.country);

  if (address.landmark) {
    lines.push(`Landmark: ${address.landmark}`);
  }

  return lines;
}

/**
 * Create a partial address with only required fields
 * Useful for incremental collection in chat interfaces
 */
export function createPartialAddress(
  street: string,
  city: string,
  country = 'Kenya', // Default to Kenya as an example for African market focus
): Partial<Address> {
  return {
    street,
    city,
    country,
  };
}
