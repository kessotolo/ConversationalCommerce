/**
 * Address model interfaces and types
 * Used across multiple modules for address management
 */

export interface AddressInterface {
    id?: string;
    street: string;
    street2?: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    postal_code?: string; // Backward compatibility alias
    type?: 'billing' | 'shipping' | 'business';
    is_default?: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface Address extends AddressInterface {
    id: string;
    created_at: string;
    updated_at: string;
}

export interface AddressCreate extends Omit<AddressInterface, 'id' | 'created_at' | 'updated_at'> {
    // Creation-specific fields can be added here
}

export interface AddressUpdate extends Partial<AddressCreate> {
    // Update-specific fields can be added here
}

// Helper functions for address formatting
export function formatAddressLine(address: AddressInterface): string {
    const parts = [
        address.street,
        address.street2,
        address.city,
        address.state,
        address.postalCode,
        address.country,
    ].filter(Boolean);

    return parts.join(', ');
}

export function formatShortAddress(address: AddressInterface): string {
    return `${address.city}, ${address.state} ${address.postalCode}`;
}

export function isCompleteAddress(address: Partial<AddressInterface>): address is AddressInterface {
    return Boolean(
        address.street &&
        address.city &&
        address.state &&
        address.country &&
        address.postalCode
    );
}

// Common address validation patterns
export const ADDRESS_PATTERNS = {
    // US ZIP codes (5 digits or 5+4 format)
    US_ZIP: /^\d{5}(-\d{4})?$/,
    // Canadian postal codes
    CA_POSTAL: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/,
    // UK postcodes
    UK_POSTCODE: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i,
    // General international postal code
    INTERNATIONAL: /^[A-Z0-9\s-]{3,10}$/i,
};

export function validatePostalCode(code: string, country: string): boolean {
    switch (country.toUpperCase()) {
        case 'US':
            return ADDRESS_PATTERNS.US_ZIP.test(code);
        case 'CA':
            return ADDRESS_PATTERNS.CA_POSTAL.test(code);
        case 'UK':
        case 'GB':
            return ADDRESS_PATTERNS.UK_POSTCODE.test(code);
        default:
            return ADDRESS_PATTERNS.INTERNATIONAL.test(code);
    }
}