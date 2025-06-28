// StoreSettings interface for dashboard and storefront configuration
// This type should be kept in sync with backend store/tenant settings schemas

export interface StoreSettings {
    /** URL or path to the store logo image */
    logo: string | null;
    /** Store display name */
    storeName: string;
    /** Store contact email */
    email: string;
    /** Store contact phone number */
    phone: string;
    /** Store currency code (e.g., 'NGN', 'USD') */
    currency: string;
    /** Store description for buyers */
    storeDescription: string;
    /** Store business address */
    address: string;
    /** Business hours for each day of the week */
    businessHours: Record<string, {
        open: string;
        close: string;
        isOpen: boolean;
    }>;
    /** WhatsApp number for alerts and chat */
    whatsappNumber: string;
    /** WhatsApp Business ID for integration */
    whatsappBusinessId: string;
    /** Enabled payment methods */
    paymentMethods: string[];
}