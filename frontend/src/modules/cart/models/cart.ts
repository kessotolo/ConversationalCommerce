import { UUID } from '@core/models/base';

export interface CartItem {
    id: UUID;
    name: string;
    price: number;
    quantity: number;
    image_url: string | null;
}

export interface CartStore {
    items: CartItem[];
    addItem: (item: Omit<CartItem, 'quantity'>) => void;
    removeItem: (itemId: UUID) => void;
    updateQuantity: (itemId: UUID, quantity: number) => void;
    clearCart: () => void;
    getTotal: () => number;
    getItemCount: () => number;
}
